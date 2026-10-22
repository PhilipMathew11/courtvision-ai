import base64
import hashlib
import hmac
import logging
import secrets
from urllib.parse import urlencode, urlsplit

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import Credentials, Registration, UserResponse

router = APIRouter()
logger = logging.getLogger(__name__)
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
OAUTH_COOKIE_PREFIX = "courtvision_google_"
OAUTH_COOKIE_MAX_AGE = 600


def google_oauth_enabled() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def safe_return_path(value: str | None) -> str:
    if not value:
        return "/"
    parsed = urlsplit(value)
    if (
        not value.startswith("/")
        or value.startswith("//")
        or "\\" in value
        or parsed.netloc
        or parsed.scheme
        or any(ord(char) < 32 for char in value)
    ):
        return "/"
    return parsed.path + (f"?{parsed.query}" if parsed.query else "")


def google_error_redirect(error: str) -> RedirectResponse:
    return RedirectResponse(
        f"{settings.frontend_url.rstrip('/')}/login?{urlencode({'error': error})}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


def set_oauth_cookie(response: Response, name: str, value: str) -> None:
    same_site = validate_cookie_config()
    response.set_cookie(
        key=f"{OAUTH_COOKIE_PREFIX}{name}",
        value=value,
        max_age=OAUTH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.app_env.lower() not in {"development", "dev", "test"},
        samesite=same_site,
        path=f"{settings.api_v1_prefix}/auth/google",
    )


def clear_oauth_cookies(response: Response) -> None:
    same_site = validate_cookie_config()
    for name in ("state", "nonce", "verifier", "next"):
        response.delete_cookie(
            key=f"{OAUTH_COOKIE_PREFIX}{name}",
            httponly=True,
            secure=settings.app_env.lower() not in {"development", "dev", "test"},
            samesite=same_site,
            path=f"{settings.api_v1_prefix}/auth/google",
        )


def exchange_google_code(code: str, verifier: str) -> str:
    response = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
            "code_verifier": verifier,
        },
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Google returned an invalid token response.")
    id_token = payload.get("id_token")
    if not isinstance(id_token, str):
        raise ValueError("Google did not return an identity token.")
    return id_token


def verify_google_identity(id_token: str, nonce: str) -> dict[str, str]:
    response = httpx.get(GOOGLE_JWKS_URL, timeout=10)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("keys"), list):
        raise ValueError("Google signing keys are unavailable.")
    keys = payload["keys"]
    header = jwt.get_unverified_header(id_token)
    key = next(
        (item for item in keys if item.get("kid") == header.get("kid")),
        None,
    )
    if key is None:
        raise ValueError("Google signing key was not found.")
    if not isinstance(key, dict):
        raise ValueError("Google signing key is invalid.")
    claims = jwt.decode(
        id_token,
        key,
        algorithms=["RS256"],
        audience=settings.google_client_id,
    )
    if (
        claims.get("iss") not in GOOGLE_ISSUERS
        or not isinstance(claims.get("nonce"), str)
        or not hmac.compare_digest(claims["nonce"], nonce)
        or claims.get("email_verified") is not True
    ):
        raise ValueError("Google account verification failed.")
    subject = claims.get("sub")
    email = claims.get("email")
    name = claims.get("name") or claims.get("given_name") or email
    if not all(isinstance(value, str) and value for value in (subject, email, name)):
        raise ValueError("Google account profile is incomplete.")
    normalized_email = Credentials(
        email=email,
        password="google-oauth-placeholder",
    ).email
    return {
        "sub": subject,
        "email": normalized_email,
        "display_name": name.strip()[:80] or normalized_email[:80],
    }


def get_or_create_google_user(identity: dict[str, str], db: Session) -> User:
    user = db.query(User).filter(User.google_sub == identity["sub"]).first()
    if user is None:
        user = db.query(User).filter(User.email == identity["email"]).first()
        if user is not None:
            if user.google_sub is not None:
                raise ValueError("This email is linked to a different Google account.")
            user.google_sub = identity["sub"]
        else:
            user = User(
                email=identity["email"],
                display_name=identity["display_name"],
                google_sub=identity["sub"],
                is_active=True,
            )
            db.add(user)
    if user.is_active is False:
        raise PermissionError("This account is disabled.")
    return user


@router.get("/google")
def google_login(next: str = "/") -> Response:
    if not google_oauth_enabled():
        return google_error_redirect("google_unconfigured")
    validate_cookie_config()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).decode().rstrip("=")
    response = RedirectResponse(
        f"{GOOGLE_AUTHORIZE_URL}?{urlencode({
            'client_id': settings.google_client_id,
            'redirect_uri': settings.google_redirect_uri,
            'response_type': 'code',
            'scope': 'openid email profile',
            'state': state,
            'nonce': nonce,
            'code_challenge': challenge,
            'code_challenge_method': 'S256',
            'prompt': 'select_account',
        })}",
        status_code=status.HTTP_303_SEE_OTHER,
    )
    set_oauth_cookie(response, "state", state)
    set_oauth_cookie(response, "nonce", nonce)
    set_oauth_cookie(response, "verifier", verifier)
    set_oauth_cookie(response, "next", safe_return_path(next))
    return response


@router.get("/google/callback")
def google_callback(
    request: Request,
    state: str | None = None,
    code: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> Response:
    def failure(error_code: str = "google_failed") -> RedirectResponse:
        failure_response = google_error_redirect(error_code)
        clear_oauth_cookies(failure_response)
        return failure_response

    expected_state = request.cookies.get(f"{OAUTH_COOKIE_PREFIX}state")
    nonce = request.cookies.get(f"{OAUTH_COOKIE_PREFIX}nonce")
    verifier = request.cookies.get(f"{OAUTH_COOKIE_PREFIX}verifier")
    if error or not code or not state or not expected_state or not hmac.compare_digest(
        state, expected_state
    ):
        return failure()
    if not nonce or not verifier:
        return failure()

    try:
        identity = verify_google_identity(exchange_google_code(code, verifier), nonce)
        user = get_or_create_google_user(identity, db)
        db.flush()
        token = create_access_token(str(user.id))
        db.commit()
    except PermissionError:
        db.rollback()
        return failure("google_account_disabled")
    except (httpx.HTTPError, JWTError, ValueError) as exc:
        db.rollback()
        logger.warning("Google OAuth callback could not verify the identity: %s", exc)
        return failure()
    except IntegrityError:
        db.rollback()
        return failure("google_account_conflict")

    destination = safe_return_path(request.cookies.get(f"{OAUTH_COOKIE_PREFIX}next"))
    success = RedirectResponse(
        f"{settings.frontend_url.rstrip('/')}{destination}",
        status_code=status.HTTP_303_SEE_OTHER,
    )
    clear_oauth_cookies(success)
    set_session_cookie(success, token)
    return success


def validate_cookie_config() -> str:
    same_site = settings.auth_cookie_samesite.lower()
    if same_site not in {"lax", "strict"}:
        raise RuntimeError("AUTH_COOKIE_SAMESITE must be set to 'lax' or 'strict'.")
    return same_site


def set_session_cookie(response: Response, token: str) -> None:
    same_site = validate_cookie_config()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.app_env.lower() not in {"development", "dev", "test"},
        samesite=same_site,
        path="/",
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: Registration,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    validate_cookie_config()
    user = User(
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    try:
        db.add(user)
        db.flush()
        token = create_access_token(str(user.id))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint == "ix_users_email" or "users.email" in str(exc.orig):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            ) from exc
        raise
    db.refresh(user)
    set_session_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
def login(
    payload: Credentials,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.email == payload.email).first()
    if (
        user is None
        or user.password_hash is None
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is disabled.",
        )
    set_session_cookie(response, create_access_token(str(user.id)))
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    same_site = validate_cookie_config()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        httponly=True,
        secure=settings.app_env.lower() not in {"development", "dev", "test"},
        samesite=same_site,
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user

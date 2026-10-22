import base64
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt

from app.core import security
from app.core.config import settings
from app.api.v1.endpoints import auth as auth_endpoint
from app.db.models.user import User
from app.db.session import get_db
from app.main import app
from app.schemas.auth import Credentials, Registration


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    User.__table__.create(engine)
    test_sessions = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = test_sessions()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(settings, "secret_key", "unit-test-secret-key")
    monkeypatch.setattr(settings, "app_env", "test")
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


def test_password_hash_verifies_without_exposing_password() -> None:
    password = "courtvision-is-secure"
    hashed = security.hash_password(password)

    assert password not in hashed
    assert security.verify_password(password, hashed)
    assert not security.verify_password("wrong-password", hashed)


def test_access_token_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "secret_key", "unit-test-secret-key")
    token = security.create_access_token("42")

    assert security.decode_access_token(token) == "42"
    assert security.decode_access_token(token + "invalid") is None


def test_auth_schema_normalizes_email_and_name() -> None:
    credentials = Credentials(email="  USER@example.com ", password="long-password")
    registration = Registration(
        display_name="  Court Vision ",
        email="USER@example.com",
        password="long-password",
    )

    assert credentials.email == "user@example.com"
    assert registration.email == "user@example.com"
    assert registration.display_name == "Court Vision"


def test_auth_schema_rejects_weak_password_and_invalid_email() -> None:
    with pytest.raises(ValueError):
        Credentials(email="user@example.com", password="short")
    with pytest.raises(ValueError):
        Credentials(email="not-an-email", password="long-password")


def test_register_login_me_logout_and_duplicate_email(client: TestClient) -> None:
    registration = {
        "display_name": "Court Vision",
        "email": "PLAYER@example.com",
        "password": "long-test-password",
    }
    created = client.post("/api/v1/auth/register", json=registration)

    assert created.status_code == 201
    assert created.json() == {
        "id": 1,
        "email": "player@example.com",
        "display_name": "Court Vision",
    }
    assert client.cookies.get("courtvision_session")
    assert "httponly" in created.headers["set-cookie"].lower()

    profile = client.get("/api/v1/auth/me")
    assert profile.status_code == 200
    assert profile.json()["email"] == "player@example.com"

    duplicate = client.post("/api/v1/auth/register", json=registration)
    assert duplicate.status_code == 409

    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401

    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": "player@example.com", "password": "wrong-password"},
    )
    assert bad_login.status_code == 401

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "PLAYER@example.com", "password": "long-test-password"},
    )
    assert login.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200


def test_google_login_uses_state_nonce_and_pkce(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "test-client-secret")
    response = client.get(
        "/api/v1/auth/google",
        params={"next": "/trade?player=123"},
        follow_redirects=False,
    )

    assert response.status_code == 303
    authorization = parse_qs(urlparse(response.headers["location"]).query)
    assert authorization["client_id"] == ["test-client-id"]
    assert authorization["state"] == [client.cookies.get("courtvision_google_state")]
    assert authorization["nonce"]
    assert authorization["code_challenge"]
    assert authorization["code_challenge_method"] == ["S256"]
    assert client.cookies.get("courtvision_google_verifier")


def test_google_callback_rejects_invalid_state(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "test-client-secret")
    client.get("/api/v1/auth/google")
    monkeypatch.setattr(
        auth_endpoint,
        "exchange_google_code",
        lambda *_: pytest.fail("Invalid state must not exchange the code."),
    )

    response = client.get(
        "/api/v1/auth/google/callback",
        params={"state": "wrong-state", "code": "test-code"},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert response.headers["location"].endswith("/login?error=google_failed")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_google_callback_links_verified_account_and_creates_new_user(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "test-client-secret")
    existing = client.post(
        "/api/v1/auth/register",
        json={
            "display_name": "Existing Player",
            "email": "player@example.com",
            "password": "long-test-password",
        },
    ).json()
    client.post("/api/v1/auth/logout")
    monkeypatch.setattr(auth_endpoint, "exchange_google_code", lambda *_: "verified-id-token")

    def google_identity(_token: str, _nonce: str) -> dict[str, str]:
        return {
            "sub": "google-sub-existing",
            "email": "player@example.com",
            "display_name": "Google Player",
        }

    monkeypatch.setattr(auth_endpoint, "verify_google_identity", google_identity)
    client.get("/api/v1/auth/google", params={"next": "/trade?player=123"})
    state = client.cookies.get("courtvision_google_state")
    linked = client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "code": "test-code"},
        follow_redirects=False,
    )

    assert linked.status_code == 303
    assert linked.headers["location"] == "http://localhost:3000/trade?player=123"
    assert client.get("/api/v1/auth/me").json()["id"] == existing["id"]

    client.post("/api/v1/auth/logout")
    monkeypatch.setattr(
        auth_endpoint,
        "verify_google_identity",
        lambda *_: {
            "sub": "google-sub-new",
            "email": "new-player@example.com",
            "display_name": "New Google Player",
        },
    )
    client.get("/api/v1/auth/google")
    state = client.cookies.get("courtvision_google_state")
    created = client.get(
        "/api/v1/auth/google/callback",
        params={"state": state, "code": "test-code"},
        follow_redirects=False,
    )

    assert created.status_code == 303
    assert created.headers["location"] == "http://localhost:3000/"
    profile = client.get("/api/v1/auth/me")
    assert profile.json()["email"] == "new-player@example.com"
    password_login = client.post(
        "/api/v1/auth/login",
        json={"email": "new-player@example.com", "password": "long-test-password"},
    )
    assert password_login.status_code == 401


def test_google_identity_verifies_signature_nonce_and_verified_email(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()

    def encode_integer(value: int) -> str:
        raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    jwk = {
        "kty": "RSA",
        "kid": "test-key-id",
        "use": "sig",
        "alg": "RS256",
        "n": encode_integer(public_numbers.n),
        "e": encode_integer(public_numbers.e),
    }

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, list[dict[str, str]]]:
            return {"keys": [jwk]}

    monkeypatch.setattr(auth_endpoint.httpx, "get", lambda *_args, **_kwargs: FakeResponse())
    token = jwt.encode(
        {
            "iss": "https://accounts.google.com",
            "sub": "google-sub-verified",
            "aud": "test-client-id",
            "exp": 4_000_000_000,
            "nonce": "expected-nonce",
            "email": "PLAYER@example.com",
            "email_verified": True,
            "name": "CourtVision Player",
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key-id"},
    )

    identity = auth_endpoint.verify_google_identity(token, "expected-nonce")
    assert identity == {
        "sub": "google-sub-verified",
        "email": "player@example.com",
        "display_name": "CourtVision Player",
    }

    with pytest.raises(ValueError):
        auth_endpoint.verify_google_identity(token, "wrong-nonce")

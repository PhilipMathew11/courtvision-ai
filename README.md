# CourtVision AI

AI-powered basketball intelligence platform. Answers *why*, not just *what*.

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your API keys

# 2. Start all services
make dev

# 3. Visit
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
# ChromaDB: http://localhost:8001

# 4. Run the data pipeline
make pipeline
```

## Architecture

```
Frontend (Next.js)  →  Backend (FastAPI)  →  PostgreSQL
                                          →  Redis (cache)
                                          →  ChromaDB (vectors)
Pipeline            →  NBA API → Clean → Load → DB
```

## Modules

| Module | Status | Phase |
|--------|--------|-------|
| Analytics Hub | 🔄 In progress | 1 |
| Coach AI | ⏳ Planned | 2 |
| Scout AI | ✅ Implemented | 2 |
| Player DNA | ⏳ Planned | 2 |
| Prediction Lab | ⏳ Planned | 3 |
| Trade Lab | ✅ Implemented | 3 |
| Fantasy Assistant | ⏳ Planned | 3 |
| Shot IQ | ⏳ Planned | 3 |
| Film Room AI | ⏳ Planned | 5 |

Scout AI turns a coach's natural-language player brief into weighted skill
priorities, then ranks players using the available Player DNA and season stats.
Height requests include players within one inch by default, and searches require
at least 10 games unless the coach specifies another minimum.

Trade Lab builds two-team player-for-player packages and compares the selected
players' latest available regular-season stats. Each player's stats season is
shown; players without NBA season stats on record are identified rather than
treated as zeros. It does not validate salary-cap rules, contracts, draft picks,
or trade legality.

Scout AI match cards link directly to Trade Lab with the selected player's team
and player preloaded in the trade builder.

## Accounts and Authentication

CourtVision provides email/password registration and sign-in through the FastAPI
backend. Passwords are hashed; the signed session is held in an HttpOnly cookie.
The account table is created by the latest Alembic migration. Run `make migrate`
before starting the backend, configure a unique `SECRET_KEY`, and set
`CORS_ORIGINS` to the exact frontend origin (comma-separated when there is more
than one). In production, serve the frontend and API on the same site so the
SameSite=Lax cookie is sent securely; HTTPS is required for production cookies.
Google sign-in is optional: create a Google OAuth 2.0 Web application client,
add `http://localhost:8000/api/v1/auth/google/callback` as an authorized
redirect URI, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
Configure the matching production callback URI in Google Cloud and set
`GOOGLE_REDIRECT_URI` and `FRONTEND_URL` for the deployed environment. The
Google flow validates signed, verified Google identities and links them to an
existing account with the same verified email. Password reset is not enabled
until an email delivery provider is configured.

## Dev Commands

```bash
make dev            # Start everything
make stop           # Stop everything
make logs           # Follow logs
make shell-backend  # Enter backend container
make migrate        # Run DB migrations
make pipeline       # Run NBA data pipeline
make logs-data-sync # Follow automatic NBA sync logs
make test           # Run all tests
```

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Recharts, Framer Motion
- **Backend**: FastAPI, SQLAlchemy, Pydantic, Alembic
- **AI**: LangGraph, LangChain, ChromaDB, Sentence Transformers
- **ML**: scikit-learn, XGBoost, Pandas, NumPy
- **Database**: PostgreSQL, Redis
- **Deploy**: Vercel (frontend), Railway (backend), Neon (PostgreSQL)
## Data Pipeline

The `data-sync` Docker Compose service refreshes NBA data immediately when it
starts, then once daily at `NBA_SYNC_HOUR_UTC` (default `9`, UTC). It refreshes
team/player roster assignments from ESPN, then detects the current NBA season
and syncs regular-season player and team stats, playoff player stats, completed
regular-season and playoff game results, and Player DNA profiles derived from
current regular-season stats.

The sync is idempotent and uses a PostgreSQL advisory lock to prevent overlapping
runs. NBA API failures are logged and retried after `NBA_SYNC_RETRY_MINUTES`
(default `60`). When no current-season stats have been published yet, existing
season records and DNA profiles are preserved. Historical season rows are not
backfilled by this scheduled job. The sync requires outbound access to
`stats.nba.com`. DNA dimensions are relative composites of the available
box-score and advanced stats; they are not official NBA tracking metrics. The
Docker host must remain running for scheduled syncs to execute.

To change the run hour, set `NBA_SYNC_HOUR_UTC` in `.env` and restart the
`data-sync` service. To run a sync manually, use `make pipeline`; to inspect its
logs, use `make logs-data-sync`.

If the regular NBA stats API is unavailable but ESPN's public roster API is
reachable, the scheduled service can still refresh player team assignments.
To run only that roster refresh manually:

```bash
docker compose up -d postgres
docker compose run --rm --no-deps data-sync python /pipeline/scripts/sync_espn_rosters.py
```

This checks all 30 team rosters before writing and matches ESPN players to the
NBA player directory by normalized name. ESPN roster entries without a known
NBA player ID are reported and skipped; the script does not invent NBA IDs.
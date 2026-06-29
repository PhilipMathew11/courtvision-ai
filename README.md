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
| Scout AI | ⏳ Planned | 2 |
| Player DNA | ⏳ Planned | 2 |
| Prediction Lab | ⏳ Planned | 3 |
| Trade Lab | ⏳ Planned | 3 |
| Fantasy Assistant | ⏳ Planned | 3 |
| Shot IQ | ⏳ Planned | 3 |
| Film Room AI | ⏳ Planned | 5 |

## Dev Commands

```bash
make dev            # Start everything
make stop           # Stop everything
make logs           # Follow logs
make shell-backend  # Enter backend container
make migrate        # Run DB migrations
make pipeline       # Run NBA data pipeline
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

Player and team data is synced from the NBA API. 
A scheduled daily job (Phase 3) will keep rosters current.
To manually refresh: `make pipeline`
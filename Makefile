.PHONY: help dev stop build logs shell-backend shell-frontend pipeline migrate seed lint test

help:
	@echo "CourtVision AI - Dev Commands"
	@echo ""
	@echo "  make dev              Start all services"
	@echo "  make stop             Stop all services"
	@echo "  make build            Rebuild all containers"
	@echo "  make logs             Follow all logs"
	@echo "  make shell-backend    Open backend shell"
	@echo "  make shell-frontend   Open frontend shell"
	@echo "  make migrate          Run DB migrations"
	@echo "  make seed             Seed initial data"
	@echo "  make pipeline         Run NBA data pipeline"
	@echo "  make lint             Run linters"
	@echo "  make test             Run all tests"

dev:
	docker compose up -d postgres redis chromadb
	@echo "⏳ Waiting for databases..."
	@sleep 3
	docker compose up -d backend frontend data-sync
	@echo "✅ Running at http://localhost:3000"

stop:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-data-sync:
	docker compose logs -f data-sync

shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

migrate:
	docker compose exec backend alembic upgrade head

seed:
	docker compose exec backend python -m app.db.seed

pipeline:
	docker compose --profile pipeline run --rm pipeline

lint:
	docker compose exec backend ruff check .
	docker compose exec backend mypy app/
	docker compose exec frontend npm run lint

test:
	docker compose exec backend pytest tests/ -v
	docker compose exec frontend npm test

test-backend:
	docker compose exec backend pytest tests/ -v --cov=app

ps:
	docker compose ps

.PHONY: help up down logs ps psql redis-cli migrate makemigration test lint format typecheck shell clean

# Default target
help:
	@echo "TukiVet — comandos disponibles"
	@echo ""
	@echo "  make up              Levanta stack local (postgres + redis + minio + api)"
	@echo "  make down            Detiene y elimina contenedores"
	@echo "  make logs            Sigue logs del API"
	@echo "  make ps              Estado de los contenedores"
	@echo "  make psql            Abre psql contra la DB de desarrollo"
	@echo "  make redis-cli       Abre redis-cli"
	@echo "  make migrate         Aplica migraciones Alembic"
	@echo "  make makemigration name=...   Crea migración nueva (autogenerate)"
	@echo "  make test            Corre pytest"
	@echo "  make lint            Corre ruff check"
	@echo "  make format          Aplica ruff format"
	@echo "  make typecheck       Corre mypy"
	@echo "  make shell           Shell python en el contenedor api"
	@echo "  make clean           Limpia caches y volúmenes locales"

up:
	docker compose -f infra/docker-compose.yml --env-file .env up -d --build

down:
	docker compose -f infra/docker-compose.yml down

logs:
	docker compose -f infra/docker-compose.yml logs -f api

ps:
	docker compose -f infra/docker-compose.yml ps

psql:
	docker compose -f infra/docker-compose.yml exec postgres psql -U tukivet -d tukivet

redis-cli:
	docker compose -f infra/docker-compose.yml exec redis redis-cli

migrate:
	docker compose -f infra/docker-compose.yml exec api alembic upgrade head

makemigration:
	docker compose -f infra/docker-compose.yml exec api alembic revision --autogenerate -m "$(name)"

test:
	docker compose -f infra/docker-compose.yml exec \
		-e TEST_DATABASE_URL=postgresql+asyncpg://tukivet:tukivet_dev@postgres:5432/tukivet_test \
		api pytest -q

test-cov:
	docker compose -f infra/docker-compose.yml exec \
		-e TEST_DATABASE_URL=postgresql+asyncpg://tukivet:tukivet_dev@postgres:5432/tukivet_test \
		api pytest --cov=app --cov-report=term-missing

lint:
	docker compose -f infra/docker-compose.yml exec api ruff check .

format:
	docker compose -f infra/docker-compose.yml exec api ruff format .

typecheck:
	docker compose -f infra/docker-compose.yml exec api mypy app

shell:
	docker compose -f infra/docker-compose.yml exec api python

clean:
	docker compose -f infra/docker-compose.yml down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .mypy_cache -exec rm -rf {} +
	find . -type d -name .ruff_cache -exec rm -rf {} +

.PHONY: run build tidy migrate-up migrate-down docker-build docker-up docker-down

# Optional: load DATABASE_URL from backend/.env (same pattern many teams use for local dev)
define MIGRATE_ENV
	set -a && [ -f .env ] && . ./.env; set +a; \
	if [ -z "$$DATABASE_URL" ]; then \
		echo "DATABASE_URL is not set."; \
		echo "  1. Copy .env.example to .env in this directory"; \
		echo "  2. Set DATABASE_URL (see .env.example), or run:"; \
		echo '     DATABASE_URL="postgresql://postgres:lOsntVRhrzoBPukqFVQiXaoxmFSFgKfh@maglev.proxy.rlwy.net:27600/railway?sslmode=require" make migrate-up'; \
		exit 1; \
	fi
endef

run:
	go run ./cmd/server

build:
	go build -o bin/server ./cmd/server

tidy:
	go mod tidy

migrate-up:
	@$(MIGRATE_ENV); migrate -path migrations -database "$$DATABASE_URL" up

migrate-down:
	@$(MIGRATE_ENV); migrate -path migrations -database "$$DATABASE_URL" down

# Docker Compose: Postgres + API (set JWT_SECRET in env or backend/.env for production)
docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

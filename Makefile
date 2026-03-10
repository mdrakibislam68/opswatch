.PHONY: up down build dev logs clean install setup help

# ─── Defaults ───────────────────────────────────────────────
COMPOSE=docker compose
API_DIR=apps/api
WEB_DIR=apps/web
AGENT_DIR=apps/agent

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ─── Docker ─────────────────────────────────────────────────
setup: ## First-time setup: copy .env files
	@cp -n $(API_DIR)/.env.example $(API_DIR)/.env 2>/dev/null || true
	@cp -n $(WEB_DIR)/.env.example $(WEB_DIR)/.env 2>/dev/null || true
	@cp -n $(AGENT_DIR)/.env.example $(AGENT_DIR)/.env 2>/dev/null || true
	@echo "✓ .env files created. Edit them before starting."

build: ## Build all Docker images
	$(COMPOSE) build

up: ## Start all services
	$(COMPOSE) up -d

down: ## Stop all services
	$(COMPOSE) down

restart: ## Restart all services
	$(COMPOSE) restart

logs: ## Tail logs (all services)
	$(COMPOSE) logs -f

logs-api: ## Tail API logs
	$(COMPOSE) logs -f api

logs-web: ## Tail frontend logs
	$(COMPOSE) logs -f web

ps: ## Show running containers
	$(COMPOSE) ps

# ─── Development ────────────────────────────────────────────
dev-api: ## Start API in dev mode (hot reload)
	cd $(API_DIR) && npm run start:dev

dev-web: ## Start frontend in dev mode
	cd $(WEB_DIR) && npm run dev

install: ## Install all npm dependencies
	cd $(API_DIR) && npm install
	cd $(WEB_DIR) && npm install

# ─── Agent ──────────────────────────────────────────────────
agent-build: ## Build the Go agent binary
	cd $(AGENT_DIR) && go build -o bin/opswatch-agent ./cmd/main.go

agent-run: ## Run agent locally (requires .env)
	cd $(AGENT_DIR) && go run ./cmd/main.go

agent-docker: ## Build agent Docker image (use PLATFORM=linux/amd64 for cross-build)
	docker build --platform $(or $(PLATFORM),linux/arm64) -t opswatch-agent:latest $(AGENT_DIR)

agent-docker-amd64: ## Build agent Docker image for AMD64
	PLATFORM=linux/amd64 $(MAKE) agent-docker

agent-docker-arm64: ## Build agent Docker image for ARM64
	PLATFORM=linux/arm64 $(MAKE) agent-docker

agent-export: ## Export the agent image to a tarball
	docker save opswatch-agent:latest | gzip > opswatch-agent.tar.gz

# ─── Database ───────────────────────────────────────────────
db-shell: ## Open PostgreSQL shell
	$(COMPOSE) exec postgres psql -U opswatch -d opswatch

db-reset: ## Drop and recreate the database (DANGEROUS)
	$(COMPOSE) exec postgres psql -U opswatch -c "DROP DATABASE IF EXISTS opswatch;"
	$(COMPOSE) exec postgres psql -U opswatch -c "CREATE DATABASE opswatch;"

# ─── Cleanup ────────────────────────────────────────────────
clean: ## Remove all containers, volumes, and images
	$(COMPOSE) down -v --rmi local

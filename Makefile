.PHONY: help dev up down restart logs build test test-backend lint clean

help: ## Show this help message
	@echo "FloodWheel Development Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

dev: ## Start all services in foreground with live reload
	docker compose up --build

up: ## Start all services in background
	docker compose up -d

down: ## Stop and remove all containers
	docker compose down

restart: ## Restart all containers
	docker compose restart

logs: ## Tail logs for all containers
	docker compose logs -f

build: ## Build all container images
	docker compose build

test: test-backend ## Run all test suites

test-backend: ## Run backend unit and integration tests
	@if [ -d "backend/.venv" ]; then \
		backend/.venv/bin/pytest backend/tests -v; \
	elif command -v pytest >/dev/null 2>&1; then \
		pytest backend/tests -v; \
	else \
		docker compose run --rm backend pytest tests -v; \
	fi

lint: ## Run code linters
	@echo "Running backend syntax verification..."
	python3 -m py_compile backend/app/main.py

check-lines: ## Check line count limit (<= 250 lines/file)
	python3 .agents/skills/code-standards/check_line_limits.py

clean: ## Clean up temporary files, caches, and docker volumes
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -rf frontend/.next frontend/out

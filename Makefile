# Load environment variables from .env file
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

.DEFAULT_GOAL := help
.PHONY: help install dev build check fix clean dock-up dock-down

# Colors for better output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# API virtual environment activation
VENV := source .venv/bin/activate

help: ## Show this help message
	@echo "$(GREEN)Available commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sed 's/:.*##/:/' | awk -F ': ' '{printf "  $(BLUE)%-20s$(RESET) %s\n", $$1, $$2}'


# Installation

install: ## Install all dependencies (frontend + backend)
	@echo "$(GREEN)📦 Installing all dependencies...$(RESET)"
	@$(MAKE) install-web
	@$(MAKE) install-api
	@echo "$(GREEN)✅ All dependencies installed!$(RESET)"

install-web: ## Install frontend dependencies
	@echo "$(BLUE)📦 Installing web dependencies...$(RESET)"
	cd web && npm install

install-api: ## Install backend dependencies
	@echo "$(BLUE)🐍 Installing api dependencies...$(RESET)"
	cd api && ./install.sh


# Docker Management

dock-up: ## Start Docker containers
	@echo "$(BLUE)🐳 Starting Docker containers...$(RESET)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Docker containers started$(RESET)"

dock-down: ## Stop Docker containers
	@echo "$(YELLOW)🐳 Stopping Docker containers...$(RESET)"
	@docker-compose down


# Development

dev: dock-up ## Start all development servers
	@echo "$(GREEN)🚀 Starting development servers...$(RESET)"
	@trap '$(MAKE) dock-down' INT TERM; \
	$(MAKE) dev-web & \
	$(MAKE) dev-api & \
	wait

dev-web: ## Start only web dev server
	@echo "$(GREEN)🚀 Starting web dev server...$(RESET)"
	cd web && npm run dev

dev-api: ## Start only api dev server
	@echo "$(GREEN)🚀 Starting api dev server...$(RESET)"
	cd api && $(VENV) && uvicorn config.asgi:application --reload --port 8000


# Building

build: ## Build all apps
	@echo "$(GREEN)🔨 Building all apps...$(RESET)"
	@$(MAKE) build-web
	@$(MAKE) build-api
	@echo "$(GREEN)✅ Build complete!$(RESET)"

build-web: ## Build web
	@echo "$(BLUE)🔨 Building web...$(RESET)"
	cd web && npm run build

build-api: ## Build api (collect static files)
	@echo "$(BLUE)🔨 Building api...$(RESET)"
	cd api && $(VENV) && python manage.py collectstatic --noinput


# Code Quality

check: ## Run all linting and type checks
	@echo "$(BLUE)🔍 Running checks...$(RESET)"
	@$(MAKE) check-web
	@$(MAKE) check-api
	@echo "$(GREEN)✅ All checks passed!$(RESET)"

check-web: ## Check web code quality
	@echo "$(BLUE)🔍 Checking web...$(RESET)"
	cd web && npm run check

check-api: ## Check api code quality
	@echo "$(BLUE)🔍 Checking api...$(RESET)"
	cd api && $(VENV) && ruff check . && pyright .

fix: ## Fix all linting issues
	@echo "$(YELLOW)🔧 Fixing code issues...$(RESET)"
	@$(MAKE) fix-web
	@$(MAKE) fix-api
	@echo "$(GREEN)✅ All fixes applied!$(RESET)"

fix-web: ## Fix web linting issues
	@echo "$(YELLOW)🔧 Fixing web...$(RESET)"
	cd web && npm run fix

fix-api: ## Fix api linting issues
	@echo "$(YELLOW)🔧 Fixing api...$(RESET)"
	cd api && $(VENV) && ruff check --fix . && ruff format . && pyright .


# Cleaning

clean: ## Clean all build artifacts and dependencies
	@echo "$(RED)🧹 Cleaning all artifacts...$(RESET)"
	@$(MAKE) clean-web
	@$(MAKE) clean-api
	@echo "$(GREEN)✅ Cleaned!$(RESET)"

clean-web: ## Clean web artifacts
	@echo "$(RED)🧹 Cleaning web...$(RESET)"
	cd web && npm run clean

clean-api: ## Clean api artifacts
	@echo "$(RED)🧹 Cleaning api...$(RESET)"
	cd api && rm -rf .ruff_cache staticfiles .venv


# Database & Django Commands

migrate: ## Run Django migrations
	@echo "$(BLUE)🗄️  Running migrations...$(RESET)"
	cd api && $(VENV) && python manage.py migrate --noinput

makemigrations: ## Create Django migrations
	@echo "$(BLUE)🗄️  Creating migrations...$(RESET)"
	cd api && $(VENV) && python manage.py makemigrations

seed: ## Seed database with initial data
	@echo "$(BLUE)🌱 Seeding database...$(RESET)"
	cd api && $(VENV) && python manage.py seed


# Celery Commands

celery: ## Start Celery worker and beat
	@echo "$(GREEN)🎯 Starting Celery worker and beat...$(RESET)"
	cd api && $(VENV) && celery -A config worker -B -l info --pool=solo

celery-flower: ## Start Celery Flower monitoring
	@echo "$(GREEN)🌸 Starting Celery Flower...$(RESET)"
	cd api && $(VENV) && celery -A config flower --port=5555

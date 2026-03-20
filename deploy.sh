#!/bin/bash
set -e

# =============================================================================
# NKPT Teamflow - Remote Deploy Script (DTHU)
# Alignment: Based on deploy copy.sh example
# =============================================================================

# --- Configuration ---
APP_NAME="Unichat-DTHU"
REMOTE_HOST="180.93.144.15"
REMOTE_USER="root"
REMOTE_DIR="~/KhoaLuan"
COMPOSE_FILE="docker-compose.dthu.yml"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# --- Print helpers ---
print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# --- Error trap ---
trap 'print_error "Deploy failed! Please check the logs above."' ERR

echo -e "${BLUE}${BOLD}=================================================${NC}"
echo -e "🚀 ${BOLD}DEPLOYING $APP_NAME TO REMOTE SERVER${NC}"
echo -e "${BLUE}${BOLD}=================================================${NC}"
echo -e "🌐 ${BOLD}Host:   ${NC}${YELLOW}${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo -e "📂 ${BOLD}Path:   ${NC}${YELLOW}${REMOTE_DIR}${NC}"
echo -e "📄 ${BOLD}Config: ${NC}${YELLOW}${COMPOSE_FILE}${NC}"
echo -e "🕒 ${BOLD}Time:   ${NC}${YELLOW}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}${BOLD}=================================================${NC}"
echo ""

# Step 1: Pull latest code on server
print_info "[1/4] Pulling latest code from Git on server..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && \
    if [ -d .git ]; then \
        git pull origin ${CURRENT_BRANCH}; \
    else \
        echo 'Warning: .git directory not found on server, skipping git pull.'; \
    fi"

# Step 2: Build images on server
print_info "[2/4] Building Docker images on server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && \
    docker compose -f ${COMPOSE_FILE} build --no-cache"

# Step 3: Deployment (Down & Up)
print_info "[3/4] Restarting containers (Down & Up)..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && \
    docker compose -f ${COMPOSE_FILE} down && \
    docker compose -f ${COMPOSE_FILE} up -d && \
    docker image prune -f"

# Step 4: Health check
echo ""
print_info "[4/4] Checking health status..."
sleep 8

ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && \
    echo '--- Container Status ---' && \
    docker compose -f ${COMPOSE_FILE} ps && \
    echo '' && \
    echo '--- Health Detail ---' && \
    for container in \$(docker compose -f ${COMPOSE_FILE} ps -q); do \
        name=\$(docker inspect --format='{{.Name}}' \$container | sed 's/\\///'); \
        status=\$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \$container); \
        echo \"Container \$name: \$status\"; \
    done"

echo ""
echo -e "${BLUE}${BOLD}=================================================${NC}"
echo -e "🎉 ${BOLD}DEPLOY COMPLETE!${NC}"
echo -e "🔗 ${BOLD}Frontend: ${NC}http://${REMOTE_HOST}:9001"
echo -e "🔗 ${BOLD}Backend:  ${NC}http://${REMOTE_HOST}:9002/v1"
echo -e "${BLUE}${BOLD}=================================================${NC}"
echo ""
echo -e "${BOLD}Useful commands on server:${NC}"
echo -e "  docker compose -f ${COMPOSE_FILE} logs -f    # View logs"
echo -e "  docker compose -f ${COMPOSE_FILE} ps         # Check status"
echo -e "  docker compose -f ${COMPOSE_FILE} restart    # Quick restart"
echo ""

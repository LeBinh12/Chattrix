#!/bin/bash
set -e

# =============================================================================
# NKPT Teamflow - Deploy Script
# Usage: ./deploy.sh [staging|prod|dthu|--help]
# =============================================================================

# --- Remote Config ---
REMOTE_HOST="180.93.144.15"
REMOTE_USER="root"
REMOTE_DIR="~/KhoaLuan"

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
trap 'print_error "Deploy that bai! Kiem tra log phia tren de biet chi tiet."' ERR

# --- Detect docker compose command ---
detect_docker_compose() {
    if docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose" # Default fallback
    fi
}

# --- Default to dthu for direct deployment ---
ENV=${1:-"dthu"}

# =============================================================================
# REMOTE DEPLOYMENT (DTHU)
# =============================================================================
if [ "$ENV" = "dthu" ]; then
    echo -e "${BOLD}-------------------------------------------${NC}"
    echo -e "  Moi truong  : ${YELLOW}REMOTE (DTHU)${NC}"
    echo -e "  Server      : ${BLUE}${REMOTE_USER}@${REMOTE_HOST}${NC}"
    echo -e "  Folder      : ${BLUE}${REMOTE_DIR}${NC}"
    echo -e "  Compose file: ${BLUE}docker-compose.dthu.yml${NC}"
    echo -e "  Hanh dong   : Sync + Build + Deploy (DIRECT)${NC}"
    echo -e "${BOLD}-------------------------------------------${NC}"
    echo ""

    # Step 1: Create remote folder if not exists
    print_info "Dang kiem tra thu muc tren server..."
    ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

    # Step 2: Sync files to server
    print_info "Dang tai code len server (rsync/scp)..."
    if command -v rsync &> /dev/null; then
        rsync -avz --exclude '.git' --exclude 'node_modules' --exclude 'clientapp/node_modules' --exclude 'data' --exclude 'mongo-data' ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
    else
        print_warning "Rsync khong tim thay, su dung scp (cham hon)..."
        tar -czf project.tar.gz --exclude='.git' --exclude='node_modules' --exclude='clientapp/node_modules' --exclude='data' --exclude='mongo-data' .
        scp project.tar.gz ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/
        ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && tar -xzf project.tar.gz && rm project.tar.gz"
        rm project.tar.gz
    fi
    print_success "Da tai code len server."

    # Step 3: Run docker-compose on server
    print_info "Dang build va khoi dong containers tren server..."
    ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && \
        docker compose -f docker-compose.dthu.yml up -d --build --remove-orphans && \
        docker image prune -f"
    
    print_success "Deploy REMOTE [${REMOTE_HOST}] hoan tat! ($(date '+%Y-%m-%d %H:%M:%S'))"
    exit 0
fi

# =============================================================================
# LOCAL DEPLOYMENT (STAGING/PROD)
# =============================================================================

# --- Set env file ---
ENV_FILE=".env.${ENV}"

if [ ! -f "$ENV_FILE" ]; then
    print_error "Khong tim thay file ${ENV_FILE}!"
    print_error "Hay tao file ${ENV_FILE} tu .env.example va dien day du config."
    exit 1
fi

# --- Validate required variables ---
validate_env() {
    local missing=()
    while IFS= read -r line; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        key="${line%%=*}"
        value="${line#*=}"
        if [ -z "$value" ] || [ "$value" = "YOUR_PASSWORD" ]; then
            missing+=("$key")
        fi
    done < "$ENV_FILE"

    if [ ${#missing[@]} -gt 0 ]; then
        print_warning "Cac bien sau trong file ${ENV_FILE} chua duoc cau hinh:"
        for var in "${missing[@]}"; do
            echo -e "  ${YELLOW}-${NC} $var"
        done
        echo ""
        read -p "Van tiep tuc deploy? [y/N]: " force
        if [ "$force" != "y" ] && [ "$force" != "Y" ]; then
            print_warning "Da huy deploy."
            exit 0
        fi
    fi
}

COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE_CMD=$(detect_docker_compose)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

validate_env

echo ""
echo -e "${BOLD}-------------------------------------------${NC}"
echo -e "  Moi truong  : ${YELLOW}${ENV}${NC}"
echo -e "  Env file    : ${BLUE}${ENV_FILE}${NC}"
echo -e "  Compose file: ${BLUE}${COMPOSE_FILE}${NC}"
echo -e "  Branch      : ${BLUE}${CURRENT_BRANCH}${NC}"
echo -e "  Hanh dong   : git pull + build + deploy"
echo -e "${BOLD}-------------------------------------------${NC}"
echo ""

read -p "Ban co chac chan muon deploy? [y/N]: " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_warning "Da huy deploy."
    exit 0
fi

echo ""
print_info "Dang pull code moi nhat..."
git pull
print_success "Da cap nhat code."

print_info "Dang build va khoi dong containers (${ENV})..."
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans
print_success "Containers da khoi dong."

print_info "Dang don dep images khong su dung..."
docker image prune -f
print_success "Da don dep xong."

echo ""
print_info "Trang thai containers:"
echo ""
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

print_success "Deploy [${ENV}] hoan tat! ($(date '+%Y-%m-%d %H:%M:%S'))"

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
    echo -e "${BLUE}${BOLD}=================================================${NC}"
    echo -e "🚀 ${BOLD}DEPLOYING TO REMOTE SERVER (DTHU)${NC}"
    echo -e "${BLUE}${BOLD}=================================================${NC}"
    echo -e "🌐 ${BOLD}Host:   ${NC}${YELLOW}${REMOTE_USER}@${REMOTE_HOST}${NC}"
    echo -e "📂 ${BOLD}Path:   ${NC}${YELLOW}${REMOTE_DIR}${NC}"
    echo -e "📄 ${BOLD}Config: ${NC}${YELLOW}docker-compose.dthu.yml${NC}"
    echo -e "🛠️  ${BOLD}Action: ${NC}${YELLOW}Git Pull + Docker Build + Restart${NC}"
    echo -e "🕒 ${BOLD}Time:   ${NC}${YELLOW}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BLUE}${BOLD}=================================================${NC}"
    echo ""

    # Step 1: Pull latest code on server
    print_info "[1/3] Dang cập nhật code mới từ Git trên server..."
    # Lấy branch hiện tại từ local để pull đúng branch đó trên server
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && git pull origin ${CURRENT_BRANCH}"

    # Step 2: Run docker-compose on server
    print_info "[2/3] Dang build va khoi dong containers tren server..."
    ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && \
        docker compose -f docker-compose.dthu.yml up -d --build --remove-orphans && \
        docker image prune -f"
    
    # Step 3: Health check
    print_info "[3/3] Dang kiem tra trang thai sau khi deploy..."
    sleep 5
    ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && docker compose -f docker-compose.dthu.yml ps"
    
    print_success "Deploy REMOTE [${REMOTE_HOST}] (GIT PULL) hoan tat! ($(date '+%Y-%m-%d %H:%M:%S'))"
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

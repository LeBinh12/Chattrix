#!/bin/bash
set -e

# =============================================================================
# NKPT Teamflow - Deploy Script
# Usage: ./deploy.sh [staging|prod|--help]
# =============================================================================

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
        print_error "Khong tim thay Docker Compose. Vui long cai dat Docker Compose."
        exit 1
    fi
}

# --- Usage ---
show_usage() {
    echo -e "${BOLD}NKPT Teamflow - Deploy Script${NC}"
    echo ""
    echo "Usage: ./deploy.sh [staging|prod]"
    echo ""
    echo "  staging - Deploy full stack voi config .env.staging"
    echo "  prod    - Deploy full stack voi config .env.prod"
    echo ""
    echo "Neu khong truyen tham so, ban se duoc hoi chon moi truong."
}

# --- Parse arguments or interactive menu ---
ENV=""

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
elif [ "$1" = "staging" ] || [ "$1" = "prod" ]; then
    ENV="$1"
elif [ -n "$1" ]; then
    print_error "Moi truong khong hop le: $1"
    echo ""
    show_usage
    exit 1
else
    echo ""
    echo -e "${BOLD}==========================================${NC}"
    echo -e "${BOLD}  NKPT Teamflow - Deploy Script${NC}"
    echo -e "${BOLD}==========================================${NC}"
    echo ""
    echo "Chon moi truong deploy:"
    echo -e "  ${GREEN}1)${NC} staging - Moi truong staging"
    echo -e "  ${GREEN}2)${NC} prod    - Moi truong production"
    echo ""
    read -p "Nhap lua chon [1/2]: " choice
    case "$choice" in
        1) ENV="staging" ;;
        2) ENV="prod" ;;
        *)
            print_error "Lua chon khong hop le."
            exit 1
            ;;
    esac
fi

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
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        # Get key and value
        key="${line%%=*}"
        value="${line#*=}"
        # Check if value is empty or placeholder
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

# --- Validate env ---
validate_env

# --- Confirmation ---
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

# --- Step 1: Git pull ---
print_info "Dang pull code moi nhat..."
git pull
print_success "Da cap nhat code."

# --- Step 2: Build and start containers with env file ---
print_info "Dang build va khoi dong containers (${ENV})..."
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans
print_success "Containers da khoi dong."

# --- Step 3: Cleanup ---
print_info "Dang don dep images khong su dung..."
docker image prune -f
print_success "Da don dep xong."

# --- Step 4: Show status ---
echo ""
print_info "Trang thai containers:"
echo ""
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

# --- Done ---
echo ""
print_success "Deploy [${ENV}] hoan tat! ($(date '+%Y-%m-%d %H:%M:%S'))"

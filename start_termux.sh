#!/bin/bash

# Expense Tracker Termux Start Script
# Starts backend, frontend, and Cloudflare Tunnel together.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "--- Expense Tracker Termux Setup ---"

CLOUDFLARED_BIN_URL="${CLOUDFLARED_BIN_URL:-https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64}"
CLOUDFLARED_INSTALL_DIR="${CLOUDFLARED_INSTALL_DIR:-$PREFIX/bin}"
CLOUDFLARED_BIN="${CLOUDFLARED_INSTALL_DIR}/cloudflared"
PROJECT_ENV_FILE="${PROJECT_ENV_FILE:-$SCRIPT_DIR/.expense_tracker.env}"

load_project_env() {
    if [ -f "$PROJECT_ENV_FILE" ]; then
        # shellcheck disable=SC1090
        . "$PROJECT_ENV_FILE"
    fi
}

ensure_cloudflared_installed() {
    if command -v cloudflared >/dev/null 2>&1; then
        return 0
    fi

    echo "cloudflared not found. Installing ARM64 binary into ${CLOUDFLARED_INSTALL_DIR}..."
    mkdir -p "$CLOUDFLARED_INSTALL_DIR"
    wget -O "$CLOUDFLARED_BIN" "$CLOUDFLARED_BIN_URL"
    chmod 755 "$CLOUDFLARED_BIN"

    if ! command -v cloudflared >/dev/null 2>&1; then
        export PATH="$CLOUDFLARED_INSTALL_DIR:$PATH"
    fi

    cloudflared --version
}

check_cloudflared_token() {
    load_project_env

    if [ -n "${CLOUDFLARED_TUNNEL_TOKEN:-}" ]; then
        return 0
    fi

    echo "Cloudflare Tunnel token is missing."
    echo "Create $PROJECT_ENV_FILE with:"
    echo "  CLOUDFLARED_TUNNEL_TOKEN=your_token_here"
    exit 1
}

stop_stale_services() {
    echo "Stopping leftover processes from previous runs..."
    killall -9 node 2>/dev/null || true
    killall -9 cloudflared 2>/dev/null || true
    pkill -f "Expense_Tracker" 2>/dev/null || true

    if command -v lsof >/dev/null 2>&1; then
        for port in "$PORT" 5173 5174 5175 5176 5177; do
            pids="$(lsof -t -i:"$port" 2>/dev/null || true)"
            if [ -n "$pids" ]; then
                kill $pids 2>/dev/null || true
            fi
        done
    fi
    sleep 1
}

# 0. Request storage access
echo "Checking storage access..."
if [ ! -d "$HOME/storage" ]; then
    echo "Running termux-setup-storage. Please grant permission in the Android popup."
    termux-setup-storage
    sleep 2
fi

# 1. Install system dependencies
echo "Checking dependencies..."
TERMUX_PKGS=(nodejs git python make clang wget)
need_pkg_install=false
for pkg in "${TERMUX_PKGS[@]}"; do
    if ! command -v "$pkg" >/dev/null 2>&1; then
        need_pkg_install=true
        break
    fi
done
if [ "$need_pkg_install" = true ]; then
    pkg update -y
    pkg install -y "${TERMUX_PKGS[@]}"
fi

# Termux paths
export DB_PATH="${DB_PATH:-/sdcard/Documents/ExpenseTracker/expense_tracker.db}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export CLOUDFLARE_DOMAIN="${CLOUDFLARE_DOMAIN:-expensetracker.is-a.dev}"

mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true

stop_stale_services
ensure_cloudflared_installed
check_cloudflared_token

# 2. Install npm dependencies
echo "Installing server dependencies..."
(cd server && npm install)

echo "Installing client dependencies..."
(cd client && npm install)

# 3. Start services
echo "Starting backend on port ${PORT}..."
(cd server && DB_PATH="$DB_PATH" HOST="$HOST" PORT="$PORT" npm run dev) &
SERVER_PID=$!
sleep 2

echo "Starting frontend (Vite) on port 5173..."
(cd client && npm run dev -- --host 0.0.0.0) &
CLIENT_PID=$!

echo "Fixing TSX permissions..."
chmod +x server/node_modules/.bin/tsx 2>/dev/null || true

echo "Starting Cloudflare Tunnel for ${CLOUDFLARE_DOMAIN} on port 5173 with auto-restart..."
(
    set +e
    while true; do
        cloudflared tunnel run --token "$CLOUDFLARED_TUNNEL_TOKEN"
        echo "Tunnel dropped. Restarting in 15 seconds..."
        sleep 15
    done
) &
TUNNEL_PID=$!

echo ""
echo "--- Services started ---"
echo "Backend PID:  $SERVER_PID  (http://127.0.0.1:${PORT})"
echo "Frontend PID: $CLIENT_PID  (http://127.0.0.1:5173)"
echo "Tunnel PID:   $TUNNEL_PID"
echo "Public URL:   https://${CLOUDFLARE_DOMAIN}"
echo "Database:     $DB_PATH"
echo ""
echo "Keep this session open, or run under tmux/screen."
echo ""

cleanup() {
    echo "Stopping services..."
    kill "$SERVER_PID" "$CLIENT_PID" "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait $SERVER_PID $CLIENT_PID $TUNNEL_PID

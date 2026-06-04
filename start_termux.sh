#!/bin/bash

# Expense Tracker Termux Start Script
# Starts backend and frontend; the tunnel can be started separately.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "--- Expense Tracker Termux Setup ---"

PROJECT_ENV_FILE="${PROJECT_ENV_FILE:-$SCRIPT_DIR/.expense_tracker.env}"
load_project_env() {
    if [ -f "$PROJECT_ENV_FILE" ]; then
        # shellcheck disable=SC1090
        . "$PROJECT_ENV_FILE"
    fi
}

stop_stale_services() {
    echo "Stopping leftover processes from previous runs..."
    killall -9 node 2>/dev/null || true
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

mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true

stop_stale_services

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

echo ""
echo "--- Services started ---"
echo "Backend PID:  $SERVER_PID  (http://127.0.0.1:${PORT})"
echo "Frontend PID: $CLIENT_PID  (http://127.0.0.1:5173)"
echo "Database:     $DB_PATH"
echo ""
echo "Keep this session open, or run under tmux/screen."
echo ""

cleanup() {
    echo "Stopping services..."
    kill "$SERVER_PID" "$CLIENT_PID" "$TUNNEL_PID" "$WATCHDOG_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 4. Cloudflared tunnel watchdog
TUNNEL_LOG="${SCRIPT_DIR}/tunnel.log"
echo "Starting cloudflared tunnel watchdog..."

start_tunnel() {
    cloudflared tunnel run expensetrack >> "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    echo "Tunnel PID: $TUNNEL_PID"
}

tunnel_watchdog() {
    while true; do
        if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
            echo "[$(date)] Tunnel died. Restarting..." | tee -a "$TUNNEL_LOG"
            start_tunnel
        fi
        sleep 10
    done
}

start_tunnel
tunnel_watchdog &
WATCHDOG_PID=$!

wait $SERVER_PID $CLIENT_PID

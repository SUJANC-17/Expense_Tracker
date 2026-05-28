#!/bin/bash

# Expense Tracker Termux Start Script
# Starts backend and frontend together.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "--- Expense Tracker Termux Setup ---"

stop_stale_services() {
    echo "Stopping leftover processes from previous runs..."
    # Force kill any stuck node, tsx, or ssh processes
    killall -9 node 2>/dev/null || true
    killall -9 ssh 2>/dev/null || true
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

# 0. Request storage access (required for /sdcard/Documents access)
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

# Termux paths (override via environment before running this script)
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

# 3. Start services in the background
echo "Starting backend on port ${PORT}..."
(cd server && DB_PATH="$DB_PATH" HOST="$HOST" PORT="$PORT" npm run dev) &
SERVER_PID=$!
sleep 2

echo "Starting frontend (Vite) on port 5173..."
(cd client && npm run dev -- --host 0.0.0.0) &
CLIENT_PID=$!

echo "Fixing TSX permissions..."
chmod +x server/node_modules/.bin/tsx 2>/dev/null || true

echo "Starting Serveo tunnel on port 5173..."
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 -R expense:80:localhost:5173 serveo.net &
SERVEO_PID=$!

echo ""
echo "--- Services started ---"
echo "Backend PID:  $SERVER_PID  (http://127.0.0.1:${PORT})"
echo "Frontend PID: $CLIENT_PID  (http://127.0.0.1:5173)"
echo "Serveo PID:   $SERVEO_PID"
echo "Public URL:   https://expense.serveousercontent.com"
echo "Database:     $DB_PATH"
echo ""
echo "Open the frontend URL shown in the Vite output above (often http://127.0.0.1:5173)."
echo "Keep this session open, or run under tmux/screen."
echo ""

cleanup() {
    echo "Stopping services..."
    kill "$SERVER_PID" "$CLIENT_PID" "$SERVEO_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait $SERVER_PID $CLIENT_PID $SERVEO_PID

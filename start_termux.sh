#!/bin/bash

# Expense Tracker Termux Start Script
# Starts backend, frontend, and ngrok together.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "--- Expense Tracker Termux Setup ---"

# 0. Request storage access (required for /sdcard/Documents access)
echo "Checking storage access..."
if [ ! -d "$HOME/storage" ]; then
    echo "Running termux-setup-storage. Please grant permission in the Android popup."
    termux-setup-storage
    sleep 2
fi

# 1. Install system dependencies if missing
echo "Checking dependencies..."
need_pkg_install=false
for pkg in nodejs git python make clang ngrok; do
    if ! command -v "$pkg" >/dev/null 2>&1; then
        need_pkg_install=true
        break
    fi
done
if [ "$need_pkg_install" = true ]; then
    pkg install -y nodejs git python make clang ngrok
fi

# Termux paths (override via environment before running this script)
export DB_PATH="${DB_PATH:-/sdcard/Documents/ExpenseTracker/expense_tracker.db}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export VITE_API_URL="${VITE_API_URL:-http://127.0.0.1:${PORT}/api}"

mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true

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
(cd client && VITE_API_URL="$VITE_API_URL" npm run dev -- --host 0.0.0.0) &
CLIENT_PID=$!

echo "Starting ngrok tunnel to backend (port ${PORT})..."
(cd ngrok && ngrok http "$PORT" --config ngrok_config.yml) &
NGROK_PID=$!

echo ""
echo "--- Services started ---"
echo "Backend PID:  $SERVER_PID  (http://127.0.0.1:${PORT})"
echo "Frontend PID: $CLIENT_PID  (http://127.0.0.1:5173)"
echo "Ngrok PID:    $NGROK_PID"
echo "Database:     $DB_PATH"
echo "API URL:      $VITE_API_URL"
echo "Ngrok UI:     http://127.0.0.1:4040"
echo ""
echo "Open the frontend at http://127.0.0.1:5173 on this device."
echo "For remote API access, use the ngrok Forwarding URL from the ngrok window or http://127.0.0.1:4040"
echo "Keep this session open, or run under tmux/screen."
echo ""

cleanup() {
    echo "Stopping services..."
    kill "$SERVER_PID" "$CLIENT_PID" "$NGROK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait $SERVER_PID $CLIENT_PID $NGROK_PID

#!/bin/bash

# Expense Tracker Termux Start Script
# Starts backend, frontend, and ngrok together.

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

# 1. Update and install dependencies if needed
echo "Checking dependencies..."
pkg update -y
pkg install -y nodejs git python make clang ngrok

# 2. Install npm dependencies
echo "Installing server dependencies..."
(cd server && npm install)

echo "Installing client dependencies..."
(cd client && npm install)

# 3. Start services in the background
echo "Starting backend on port 3000..."
(cd server && npm run dev) &
SERVER_PID=$!

echo "Starting frontend (Vite) on port 5173..."
(cd client && VITE_API_URL=http://127.0.0.1:3000/api npm run dev -- --host) &
CLIENT_PID=$!

echo "Starting ngrok tunnel to backend (port 3000)..."
(cd ngrok && ngrok http 3000 --config ngrok_config.yml) &
NGROK_PID=$!

echo ""
echo "--- Services started ---"
echo "Backend PID:  $SERVER_PID  (http://127.0.0.1:3000)"
echo "Frontend PID: $CLIENT_PID  (http://127.0.0.1:5173)"
echo "Ngrok PID:    $NGROK_PID"
echo "Database:     /sdcard/Documents/ExpenseTracker/expense_tracker.db"
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

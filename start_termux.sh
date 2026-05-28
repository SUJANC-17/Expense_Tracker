#!/bin/bash

# Expense Tracker Termux Start Script
# Starts backend, frontend, and ngrok together.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NGROK_DIR="$SCRIPT_DIR/ngrok"
NGROK_CONFIG="$NGROK_DIR/ngrok_config.yml"

echo "--- Expense Tracker Termux Setup ---"

stop_stale_services() {
    echo "Stopping leftover processes from previous runs..."
    pkill -f "Expense_Tracker/server.*tsx watch" 2>/dev/null || true
    pkill -f "Expense_Tracker/client.*vite" 2>/dev/null || true
    pkill -f "ngrok start proxy" 2>/dev/null || true
    pkill -f "tsx watch src/index.ts" 2>/dev/null || true

    if command -v lsof >/dev/null 2>&1; then
        for port in "$PORT" 5173 5174 5175 5176 5177 4040; do
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

# 1. Install system dependencies (ngrok is NOT in Termux repos — installed separately below)
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

ensure_ngrok() {
    if [ -x "$NGROK_DIR/ngrok" ]; then
        NGROK_BIN="$NGROK_DIR/ngrok"
        return 0
    fi
    if command -v ngrok >/dev/null 2>&1; then
        NGROK_BIN="$(command -v ngrok)"
        return 0
    fi

    echo "Downloading ngrok agent (not available via pkg on Termux)..."
    if ! command -v wget >/dev/null 2>&1; then
        pkg install -y wget
    fi

    arch="$(uname -m)"
    case "$arch" in
        aarch64|arm64)
            ngrok_url="${NGROK_DOWNLOAD_URL:-https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz}"
            ;;
        armv7l|arm)
            ngrok_url="${NGROK_DOWNLOAD_URL:-https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm.tgz}"
            ;;
        *)
            echo "Unsupported CPU architecture for ngrok: $arch"
            return 1
            ;;
    esac

    tmp="$(mktemp -d)"
    if ! wget -qO "$tmp/ngrok.tgz" "$ngrok_url"; then
        rm -rf "$tmp"
        echo "Failed to download ngrok from $ngrok_url"
        return 1
    fi

    mkdir -p "$NGROK_DIR"
    if ! tar -xzf "$tmp/ngrok.tgz" -C "$NGROK_DIR"; then
        rm -rf "$tmp"
        echo "Failed to extract ngrok archive."
        return 1
    fi
    rm -rf "$tmp"
    chmod +x "$NGROK_DIR/ngrok"
    NGROK_BIN="$NGROK_DIR/ngrok"
    echo "Installed ngrok at $NGROK_BIN"
}

verify_ngrok_binary() {
    if "$NGROK_BIN" version >/dev/null 2>&1; then
        return 0
    fi
    echo ""
    echo "ngrok cannot run on this Termux install (often: unexpected e_type: 2)."
    echo "  - Install Termux from F-Droid, not Google Play (see TERMUX.md)"
    echo "  - Remove broken binary: rm -f $NGROK_DIR/ngrok && re-run this script"
    echo "  - Or use local-only mode: SKIP_NGROK=1 ./start_termux.sh"
    rm -f "$NGROK_DIR/ngrok" 2>/dev/null || true
    echo ""
    return 1
}

start_ngrok() {
    if [ "${SKIP_NGROK:-0}" = "1" ]; then
        echo "Skipping ngrok (SKIP_NGROK=1)."
        return 1
    fi

    if ! ensure_ngrok || ! verify_ngrok_binary; then
        echo ""
        echo "Remote tunnel not started. App still works on this device at http://127.0.0.1:5173"
        echo "To fix ngrok later:"
        echo "  - Use Termux from F-Droid (not Play Store), then re-run this script"
        echo "  - Or set SKIP_NGROK=1 to hide this message if you only need local access"
        echo ""
        return 1
    fi

    if [ ! -f "$NGROK_CONFIG" ]; then
        echo "Missing $NGROK_CONFIG — cannot start reserved tunnel."
        return 1
    fi

    echo "Starting ngrok tunnel (proxy -> port ${PORT})..."
    # Uses reserved hostname from ngrok_config.yml (stable URL across restarts)
    (cd "$NGROK_DIR" && "$NGROK_BIN" start proxy --config ngrok_config.yml) &
    NGROK_PID=$!
    return 0
}

# Termux paths (override via environment before running this script)
export DB_PATH="${DB_PATH:-/sdcard/Documents/ExpenseTracker/expense_tracker.db}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export VITE_API_URL="${VITE_API_URL:-http://127.0.0.1:${PORT}/api}"

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
(cd client && VITE_API_URL="$VITE_API_URL" npm run dev -- --host 0.0.0.0) &
CLIENT_PID=$!

NGROK_PID=""
if start_ngrok; then
    NGROK_STARTED=true
else
    NGROK_STARTED=false
fi

echo ""
echo "--- Services started ---"
echo "Backend PID:  $SERVER_PID  (http://127.0.0.1:${PORT})"
echo "Frontend PID: $CLIENT_PID  (http://127.0.0.1:5173)"
if [ "$NGROK_STARTED" = true ]; then
    echo "Ngrok PID:    $NGROK_PID"
    echo "Ngrok UI:     http://127.0.0.1:4040"
    echo "Public URL:   https://elke-nonstrategic-shad.ngrok-free.dev (if config unchanged)"
fi
echo "Database:     $DB_PATH"
echo "API URL:      $VITE_API_URL"
echo ""
echo "Open the frontend URL shown in the Vite output above (often http://127.0.0.1:5173)."
if [ "$NGROK_STARTED" = true ]; then
    echo "For remote API access, use the ngrok URL above or http://127.0.0.1:4040"
fi
echo "Keep this session open, or run under tmux/screen."
echo ""

cleanup() {
    echo "Stopping services..."
    kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
    if [ -n "$NGROK_PID" ]; then
        kill "$NGROK_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

if [ "$NGROK_STARTED" = true ]; then
    wait $SERVER_PID $CLIENT_PID $NGROK_PID
else
    wait $SERVER_PID $CLIENT_PID
fi

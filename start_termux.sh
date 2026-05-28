#!/data/data/com.termux/files/usr/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# =========================
# CONFIG
# =========================

export DB_PATH="${DB_PATH:-/sdcard/Documents/ExpenseTracker/expense_tracker.db}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Leave empty for random Serveo subdomain
# Example:
# PUBLIC_SUBDOMAIN="expense"
PUBLIC_SUBDOMAIN="${PUBLIC_SUBDOMAIN:-}"

# =========================
# STORAGE SETUP
# =========================

mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true

if [ ! -d "$HOME/storage" ]; then
    echo "Setting up Termux storage..."
    termux-setup-storage
    sleep 5
fi

# =========================
# REQUIRED PACKAGES
# =========================

REQUIRED_CMDS=(
    node
    npm
    git
    python
    make
    clang
    wget
    ssh
    lsof
)

MISSING=false

for cmd in "${REQUIRED_CMDS[@]}"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING=true
        break
    fi
done

if [ "$MISSING" = true ]; then
    echo "Installing required packages..."

    pkg update -y

    pkg install -y \
        nodejs \
        git \
        python \
        make \
        clang \
        wget \
        openssh \
        lsof
fi

# =========================
# CLEANUP OLD SERVICES
# =========================

stop_stale_services() {

    echo "Stopping old services..."

    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx" 2>/dev/null || true
    pkill -f "serveo.net" 2>/dev/null || true
    pkill -f "node.*server" 2>/dev/null || true

    if command -v lsof >/dev/null 2>&1; then
        for port in "$PORT" "$FRONTEND_PORT"; do
            PIDS="$(lsof -t -i:"$port" 2>/dev/null || true)"

            if [ -n "$PIDS" ]; then
                kill -9 $PIDS 2>/dev/null || true
            fi
        done
    fi

    sleep 2
}

stop_stale_services

# =========================
# INSTALL DEPENDENCIES
# =========================

echo "Installing server dependencies..."
(
    cd server
    npm install
)

echo "Installing client dependencies..."
(
    cd client
    npm install
)

chmod +x server/node_modules/.bin/tsx 2>/dev/null || true
chmod +x client/node_modules/.bin/vite 2>/dev/null || true

# =========================
# START BACKEND
# =========================

echo "Starting backend server..."

(
    cd server

    DB_PATH="$DB_PATH" \
    HOST="$HOST" \
    PORT="$PORT" \
    npm run dev
) &

SERVER_PID=$!

sleep 5

# =========================
# START FRONTEND
# =========================

echo "Starting frontend..."

(
    cd client

    npm run dev -- \
        --host 0.0.0.0 \
        --port "$FRONTEND_PORT"
) &

CLIENT_PID=$!

sleep 8

# =========================
# VERIFY FRONTEND
# =========================

echo "Checking frontend port..."

if command -v ss >/dev/null 2>&1; then
    ss -tulpn | grep ":${FRONTEND_PORT}" || true
fi

# =========================
# START SERVEO TUNNEL
# =========================

echo "Starting Serveo tunnel..."

(
    set +e

    while true; do

        echo ""
        echo "Connecting to Serveo..."
        echo ""

        if [ -n "$PUBLIC_SUBDOMAIN" ]; then

            ssh \
                -N \
                -o StrictHostKeyChecking=accept-new \
                -o ServerAliveInterval=60 \
                -o ServerAliveCountMax=10 \
                -o ExitOnForwardFailure=yes \
                -R "${PUBLIC_SUBDOMAIN}:80:localhost:${FRONTEND_PORT}" \
                serveo.net

        else

            ssh \
                -N \
                -o StrictHostKeyChecking=accept-new \
                -o ServerAliveInterval=60 \
                -o ServerAliveCountMax=10 \
                -o ExitOnForwardFailure=yes \
                -R 80:localhost:${FRONTEND_PORT} \
                serveo.net

        fi

        echo ""
        echo "Serveo disconnected."
        echo "Reconnecting in 5 seconds..."
        echo ""

        sleep 5
    done

) &

SERVEO_PID=$!

# =========================
# CLEANUP
# =========================

cleanup() {

    echo ""
    echo "Stopping services..."
    echo ""

    kill "$SERVER_PID" 2>/dev/null || true
    kill "$CLIENT_PID" 2>/dev/null || true
    kill "$SERVEO_PID" 2>/dev/null || true

    pkill -f "serveo.net" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# =========================
# KEEP SCRIPT RUNNING
# =========================

echo ""
echo "===================================="
echo "Expense Tracker Started"
echo "===================================="
echo ""
echo "Backend Port : $PORT"
echo "Frontend Port: $FRONTEND_PORT"
echo "Database Path: $DB_PATH"
echo ""

wait

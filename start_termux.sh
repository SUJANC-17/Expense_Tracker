#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export DB_PATH="${DB_PATH:-/sdcard/Documents/ExpenseTracker/expense_tracker.db}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export FRONTEND_PORT="${FRONTEND_PORT:-5173}"

PUBLIC_SUBDOMAIN="expense"

mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true

stop_stale_services() {
pkill -f "vite" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true
pkill -f "serveo.net" 2>/dev/null || true
pkill -f "Expense_Tracker" 2>/dev/null || true

```
if command -v lsof >/dev/null 2>&1; then
    for port in "$PORT" "$FRONTEND_PORT"; do
        pids="$(lsof -t -i:"$port" 2>/dev/null || true)"
        [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
    done
fi

sleep 1
```

}

if [ ! -d "$HOME/storage" ]; then
termux-setup-storage
sleep 3
fi

TERMUX_PKGS=(
nodejs
git
python
make
clang
wget
openssh
lsof
)

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

stop_stale_services

(cd server && npm install)
(cd client && npm install)

chmod +x server/node_modules/.bin/tsx 2>/dev/null || true
chmod +x client/node_modules/.bin/vite 2>/dev/null || true

(
cd server
DB_PATH="$DB_PATH" HOST="$HOST" PORT="$PORT" npm run dev
) &

SERVER_PID=$!

sleep 3

(
cd client
npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
) &

CLIENT_PID=$!

sleep 5

(
set +e

```
while true; do
    ssh \
        -o StrictHostKeyChecking=accept-new \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=10 \
        -o ExitOnForwardFailure=yes \
        -R "${PUBLIC_SUBDOMAIN}:80:localhost:${FRONTEND_PORT}" \
        serveo.net

    sleep 5
done
```

) &

SERVEO_PID=$!

cleanup() {
kill "$SERVER_PID" 2>/dev/null || true
kill "$CLIENT_PID" 2>/dev/null || true
kill "$SERVEO_PID" 2>/dev/null || true

```
pkill -f "serveo.net" 2>/dev/null || true
```

}

trap cleanup EXIT INT TERM

wait

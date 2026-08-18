#!/bin/bash

# ============================================================
#  Expense Tracker — Termux Start Script (24/7 robust edition)
#  - Builds client + server
#  - Starts backend (which also serves the built frontend)
#  - Starts cloudflared tunnel with a multi-layer watchdog:
#      1. Process watchdog   — restarts if cloudflared dies
#      2. HTTP health-check  — restarts if tunnel stops routing
#      3. Keep-alive pinger  — prevents idle tunnel closure
# ============================================================

# NOTE: Do NOT use 'set -e' here; we handle errors manually so
#       the watchdog never crashes on a transient failure.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── tmux self-relaunch guard ──────────────────────────────────
# If we are NOT already inside a tmux session and this is not the
# inner (relaunched) invocation, bootstrap ourselves into one.
TMUX_SESSION="tracker"

if [ -z "${TMUX}" ] && [ "${_INSIDE_TMUX_SESSION:-}" != "1" ]; then
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        echo ""
        echo "[INFO] A tmux session named '$TMUX_SESSION' already exists."
        echo "       To attach:  tmux attach -t $TMUX_SESSION"
        echo "       Exiting to avoid spawning a duplicate instance."
        echo ""
        exit 0
    fi

    echo ""
    echo "[INFO] Launching script inside persistent tmux session '$TMUX_SESSION'..."
    _INSIDE_TMUX_SESSION=1 tmux new-session -d -s "$TMUX_SESSION" \
        "env _INSIDE_TMUX_SESSION=1 bash '$0'"
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  Script is now running in tmux session: $TMUX_SESSION         ║"
    echo "║  To attach:  tmux attach -t $TMUX_SESSION                     ║"
    echo "║  Safe to close this terminal / SSH session now.      ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
    exit 0
fi
# ──────────────────────────────────────────────────────────────

# ── Configuration ─────────────────────────────────────────────
PROJECT_ENV_FILE="${PROJECT_ENV_FILE:-$SCRIPT_DIR/.expense_tracker.env}"
export DB_PATH="${DB_PATH:-/sdcard/Documents/ExpenseTracker/expense_tracker.db}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"

TUNNEL_NAME="expensetrack"
TUNNEL_PUBLIC_URL="https://expensetrack.qzz.io"   # used for health-check
TUNNEL_LOG="$SCRIPT_DIR/tunnel.log"
SERVER_LOG="$SCRIPT_DIR/server.log"

# Watchdog tuning
HEALTH_CHECK_INTERVAL=30   # seconds between health-checks
KEEPALIVE_INTERVAL=120     # seconds between keep-alive pings
MAX_RESTART_BACKOFF=120    # cap exponential backoff at 2 min
TUNNEL_FAIL_THRESHOLD=3    # consecutive failures before restart
# ──────────────────────────────────────────────────────────────

# ── PID tracking ──────────────────────────────────────────────
SERVER_PID=""
TUNNEL_PID=""
PROCESS_WATCHDOG_PID=""
HEALTH_WATCHDOG_PID=""
KEEPALIVE_PID=""
# ──────────────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
tlog() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$TUNNEL_LOG"; }

# ── Cleanup ───────────────────────────────────────────────────
cleanup() {
    if [ "${_CLEANED_UP:-false}" = "true" ]; then return; fi
    _CLEANED_UP=true
    log "Stopping Expense Tracker backend and watchdogs..."
    # NOTE: The cloudflared tunnel is intentionally NOT killed here — it also
    # carries SSH remote access (ssh.expensetrack.qzz.io) which must remain
    # alive independently of the web backend.
    for pid in "$KEEPALIVE_PID" "$HEALTH_WATCHDOG_PID" "$PROCESS_WATCHDOG_PID" "$SERVER_PID"; do
        [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done
    # Release Android wake-lock if we acquired one
    termux-wake-unlock 2>/dev/null || true
    log "Expense Tracker backend and watchdogs stopped. Tunnel and SSH access remain active."
}
trap cleanup EXIT INT TERM

# ── Stop stale services from previous runs ────────────────────
stop_stale_services() {
    log "Stopping leftover processes from previous runs..."
    # NOTE: cloudflared is intentionally NOT killed here — the tunnel also
    # carries SSH access (ssh.expensetrack.qzz.io) which must stay alive
    # independently of the web backend. start_tunnel() will adopt the
    # existing process if it is already running.
    pkill -f "node.*server" 2>/dev/null || true

    if command -v lsof >/dev/null 2>&1; then
        for port in "$PORT" 5173 5174 5175; do
            pids="$(lsof -t -i:"$port" 2>/dev/null || true)"
            [ -n "$pids" ] && kill $pids 2>/dev/null || true
        done
    fi
    sleep 2
}

# ── Load project env ──────────────────────────────────────────
load_project_env() {
    if [ -f "$PROJECT_ENV_FILE" ]; then
        # shellcheck disable=SC1090
        . "$PROJECT_ENV_FILE"
    fi
}

# ── Dependency check ──────────────────────────────────────────
check_deps() {
    log "Checking system dependencies..."
    TERMUX_PKGS=(nodejs git wget curl openssh)
    need_install=false
    for pkg in "${TERMUX_PKGS[@]}"; do
        if ! command -v "$pkg" >/dev/null 2>&1; then
            need_install=true; break
        fi
    done
    if [ "$need_install" = true ]; then
        pkg update -y && pkg install -y "${TERMUX_PKGS[@]}"
    fi

    if ! command -v cloudflared >/dev/null 2>&1; then
        log "cloudflared not found — installing..."
        pkg install -y cloudflared 2>/dev/null || {
            log "pkg install failed, trying manual download..."
            wget -q "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" \
                 -O "$PREFIX/bin/cloudflared" 2>/dev/null ||
            wget -q "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm" \
                 -O "$PREFIX/bin/cloudflared"
            chmod +x "$PREFIX/bin/cloudflared"
        }
    fi
}

# ── Storage access ────────────────────────────────────────────
ensure_storage() {
    if [ ! -d "$HOME/storage" ]; then
        log "Requesting storage access — please grant permission in the Android popup."
        termux-setup-storage
        sleep 3
    fi
    mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true
}

# ── Build steps ───────────────────────────────────────────────
build_all() {
    log "Installing server dependencies..."
    (cd server && npm install) || { log "ERROR: Server npm install failed"; exit 1; }

    log "Installing client dependencies..."
    (cd client && npm install) || { log "ERROR: Client npm install failed"; exit 1; }

    log "Building frontend (production)..."
    (cd client && npm run build) || { log "ERROR: Frontend build failed"; exit 1; }

    log "Compiling backend TypeScript..."
    (cd server && npm run build) || { log "ERROR: Backend compile failed"; exit 1; }

    log "Build complete."
}

# ── Start SSH Server ──────────────────────────────────────────
start_sshd() {
    log "Starting SSH Server (sshd)..."
    if ! pgrep -x "sshd" >/dev/null; then
        sshd
        log "sshd started on port 8022."
    else
        log "sshd is already running."
    fi
}

# ── Start backend server ──────────────────────────────────────
start_server() {
    log "Starting backend on port ${PORT}..."
    (cd server && DB_PATH="$DB_PATH" HOST="$HOST" PORT="$PORT" npm start >> "$SERVER_LOG" 2>&1) &
    SERVER_PID=$!

    # Wait until the server is actually accepting connections
    local tries=0
    while [ $tries -lt 20 ]; do
        if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 \
           || curl -sf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
            log "Backend is up (PID $SERVER_PID)."
            return 0
        fi
        sleep 1
        tries=$((tries + 1))
    done
    log "WARNING: Backend did not respond within 20s, continuing anyway."
}

# ── Start cloudflared tunnel ──────────────────────────────────
start_tunnel() {
    tlog "Starting cloudflared tunnel '$TUNNEL_NAME'..."

    # If cloudflared is already running (e.g. tunnel survived a backend
    # restart, or SSH is actively using it), adopt its PID instead of
    # spawning a duplicate connection.
    local existing_pid
    existing_pid=$(pgrep -f "cloudflared tunnel run $TUNNEL_NAME" 2>/dev/null | head -1)
    if [ -n "$existing_pid" ]; then
        tlog "Tunnel already running (PID $existing_pid) — adopting existing process."
        TUNNEL_PID=$existing_pid
        return 0
    fi

    setsid cloudflared tunnel run "$TUNNEL_NAME" >> "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    disown "$TUNNEL_PID"
    tlog "Tunnel started (PID: $TUNNEL_PID)"
    sleep 5   # give cloudflared time to connect
}

# ── Restart tunnel with exponential backoff ───────────────────
_tunnel_restart_backoff=5
restart_tunnel() {
    local reason="$1"
    tlog "RESTART TRIGGER: $reason"
    tlog "Killing existing tunnel (PID $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
    pkill -f "cloudflared tunnel run $TUNNEL_NAME" 2>/dev/null || true
    sleep 2

    tlog "Waiting ${_tunnel_restart_backoff}s before restart (backoff)..."
    sleep "$_tunnel_restart_backoff"

    start_tunnel

    # Exponential backoff, capped at MAX_RESTART_BACKOFF
    _tunnel_restart_backoff=$(( _tunnel_restart_backoff * 2 ))
    [ "$_tunnel_restart_backoff" -gt "$MAX_RESTART_BACKOFF" ] && \
        _tunnel_restart_backoff=$MAX_RESTART_BACKOFF
}

reset_backoff() {
    _tunnel_restart_backoff=5
}

# ── Layer 1: Process watchdog ─────────────────────────────────
# Checks every 10 s if the cloudflared process is still alive.
process_watchdog() {
    while true; do
        sleep 10
        if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
            tlog "[process-watchdog] cloudflared process died — restarting."
            restart_tunnel "process died"
        fi
    done
}

# ── Layer 2: HTTP health-check watchdog ──────────────────────
# Periodically hits the public URL; if it fails N times in a row,
# force-restarts the tunnel even if the process is still running.
health_watchdog() {
    local fail_count=0
    while true; do
        sleep "$HEALTH_CHECK_INTERVAL"

        # Use curl with a 10-second timeout; we only care about reachability
        if curl -sf --max-time 10 \
                --retry 0 \
                -o /dev/null \
                -w "%{http_code}" \
                "$TUNNEL_PUBLIC_URL/" >/dev/null 2>&1; then
            if [ "$fail_count" -gt 0 ]; then
                tlog "[health-watchdog] Tunnel recovered after $fail_count failure(s)."
                reset_backoff
            fi
            fail_count=0
        else
            fail_count=$((fail_count + 1))
            tlog "[health-watchdog] Health-check FAILED ($fail_count/$TUNNEL_FAIL_THRESHOLD) — $TUNNEL_PUBLIC_URL unreachable."

            if [ "$fail_count" -ge "$TUNNEL_FAIL_THRESHOLD" ]; then
                tlog "[health-watchdog] Threshold reached — forcing tunnel restart."
                fail_count=0
                restart_tunnel "HTTP health-check failed ${TUNNEL_FAIL_THRESHOLD} times"
                # Extra grace period after restart before checking again
                sleep 30
            fi
        fi
    done
}

# ── Layer 3: Keep-alive pinger ────────────────────────────────
# Sends a lightweight request every 2 minutes to prevent idle
# closure on Cloudflare's side.
keepalive_pinger() {
    while true; do
        sleep "$KEEPALIVE_INTERVAL"
        if curl -sf --max-time 8 -o /dev/null "$TUNNEL_PUBLIC_URL/" 2>/dev/null; then
            tlog "[keep-alive] ping OK"
        else
            tlog "[keep-alive] ping failed (tunnel watchdog will handle if persistent)"
        fi
    done
}

# ═════════════════════════════════════════════════════════════
#  MAIN
# ═════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Expense Tracker — 24/7 Termux Start Script      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Acquire Android wake-lock so Termux is not killed while in background
log "Acquiring Termux wake-lock..."
termux-wake-lock 2>/dev/null || log "WARNING: termux-wake-lock unavailable (non-Termux env?)."

ensure_storage
check_deps
stop_stale_services
load_project_env
build_all
start_sshd
start_server

echo ""
log "--- Services started ---"
log "Backend PID:  $SERVER_PID  (http://127.0.0.1:${PORT})"
log "Database:     $DB_PATH"
log "Tunnel URL:   $TUNNEL_PUBLIC_URL"
log "Tunnel log:   $TUNNEL_LOG"
log "Server log:   $SERVER_LOG"
echo ""

# Start tunnel + all three watchdog layers
start_tunnel

process_watchdog &
PROCESS_WATCHDOG_PID=$!
log "Process watchdog PID: $PROCESS_WATCHDOG_PID"

health_watchdog &
HEALTH_WATCHDOG_PID=$!
log "Health watchdog PID:  $HEALTH_WATCHDOG_PID"

keepalive_pinger &
KEEPALIVE_PID=$!
log "Keep-alive pinger PID: $KEEPALIVE_PID"

echo ""
log "All services running persistently inside tmux session '$TMUX_SESSION'."
log "Press Ctrl+C to stop everything."
echo ""

# Block until the backend exits (it's the primary service)
wait "$SERVER_PID"
log "Backend process exited — shutting down."

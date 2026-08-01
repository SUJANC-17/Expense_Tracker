#!/bin/bash

# ============================================================
#  Standalone Cloudflare Tunnel Watchdog
#  Run this if the tunnel dies but the server is still running.
#  Three protection layers:
#    1. Process watchdog  — restarts cloudflared if it dies
#    2. HTTP health-check — restarts if the URL stops responding
#    3. Keep-alive pinger — prevents idle tunnel timeout
# ============================================================

TUNNEL_NAME="${TUNNEL_NAME:-expensetrack}"
TUNNEL_PUBLIC_URL="${TUNNEL_PUBLIC_URL:-https://expensetrack.qzz.io}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TUNNEL_LOG="$SCRIPT_DIR/tunnel.log"

HEALTH_CHECK_INTERVAL=30
KEEPALIVE_INTERVAL=120
MAX_RESTART_BACKOFF=120
TUNNEL_FAIL_THRESHOLD=3

TUNNEL_PID=""
_backoff=5

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$TUNNEL_LOG"; }

cleanup() {
    log "Stopping tunnel watchdog..."
    kill "$TUNNEL_PID" "$PROC_WD_PID" "$HEALTH_WD_PID" "$CONN_WD_PID" "$KEEPALIVE_PID" 2>/dev/null || true
    pkill -f "cloudflared tunnel run $TUNNEL_NAME" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

start_tunnel() {
    pkill -f "cloudflared tunnel run $TUNNEL_NAME" 2>/dev/null || true
    sleep 1
    log "Starting cloudflared tunnel '$TUNNEL_NAME'..."
    cloudflared tunnel run "$TUNNEL_NAME" >> "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    log "Tunnel PID: $TUNNEL_PID"
    sleep 5
}

restart_tunnel() {
    log "RESTARTING tunnel (reason: $1) — backoff ${_backoff}s"
    kill "$TUNNEL_PID" 2>/dev/null || true
    pkill -f "cloudflared tunnel run $TUNNEL_NAME" 2>/dev/null || true
    sleep "$_backoff"
    start_tunnel
    _backoff=$(( _backoff * 2 ))
    [ "$_backoff" -gt "$MAX_RESTART_BACKOFF" ] && _backoff=$MAX_RESTART_BACKOFF
}

process_watchdog() {
    while true; do
        sleep 10
        if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
            log "[process-watchdog] cloudflared died — restarting"
            restart_tunnel "process died"
        fi
    done
}

health_watchdog() {
    local fails=0
    while true; do
        sleep "$HEALTH_CHECK_INTERVAL"
        if curl -sf --max-time 10 -o /dev/null "$TUNNEL_PUBLIC_URL/" 2>/dev/null; then
            [ "$fails" -gt 0 ] && log "[health-watchdog] Tunnel recovered after $fails failure(s). Resetting backoff."
            fails=0; _backoff=5
        else
            fails=$(( fails + 1 ))
            log "[health-watchdog] FAIL $fails/$TUNNEL_FAIL_THRESHOLD — $TUNNEL_PUBLIC_URL"
            if [ "$fails" -ge "$TUNNEL_FAIL_THRESHOLD" ]; then
                fails=0
                restart_tunnel "HTTP health-check failed ${TUNNEL_FAIL_THRESHOLD}x"
                sleep 30
            fi
        fi
    done
}

keepalive_pinger() {
    while true; do
        sleep "$KEEPALIVE_INTERVAL"
        curl -sf --max-time 8 -o /dev/null "$TUNNEL_PUBLIC_URL/" 2>/dev/null \
            && log "[keep-alive] ping OK" \
            || log "[keep-alive] ping failed"
    done
}

connection_watchdog() {
    local degraded_count=0
    while true; do
        sleep 30
        conn_count=$(cloudflared tunnel info "$TUNNEL_NAME" 2>/dev/null | grep -c "^[0-9a-f]\{8\}-")
        if [ "$conn_count" -lt 4 ] && [ "$conn_count" -gt 0 ]; then
            degraded_count=$(( degraded_count + 1 ))
            log "[connection-watchdog] Only $conn_count/4 edge connections — degraded ($degraded_count consecutive checks)"
            if [ "$degraded_count" -ge 3 ]; then
                degraded_count=0
                restart_tunnel "connection count degraded ${conn_count}/4"
            fi
        else
            degraded_count=0
        fi
    done
}


echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   Cloudflare Tunnel Watchdog (standalone)  ║"
echo "╚════════════════════════════════════════════╝"
echo ""
log "Tunnel:  $TUNNEL_NAME"
log "URL:     $TUNNEL_PUBLIC_URL"
log "Log:     $TUNNEL_LOG"
echo ""

start_tunnel

process_watchdog &
PROC_WD_PID=$!

health_watchdog &
HEALTH_WD_PID=$!

keepalive_pinger &
KEEPALIVE_PID=$!

connection_watchdog &
CONN_WD_PID=$!

log "All watchdog layers active. Press Ctrl+C to stop."
wait

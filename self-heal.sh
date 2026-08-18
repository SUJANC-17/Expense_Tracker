#!/bin/bash

# ============================================================
# self-heal.sh
#
# Install instructions:
# termux-job-scheduler -s self-heal.sh --period-ms 1800000 --persisted true
# (Runs every 30 minutes to ensure Termux wasn't killed by OS)
# ============================================================

LOG="$HOME/self-heal.log"

# CHANGE THIS TO YOUR ACTUAL PROJECT FOLDER ON THE DEVICE
PROJECT_DIR="$HOME/Expense-Tracker"

echo "[$(date)] Running self-heal check..." >> "$LOG"

# 1. Check if the 'tracker' tmux session is alive
if ! tmux has-session -t tracker 2>/dev/null; then
    echo "[$(date)] tmux session 'tracker' NOT found — relaunching." >> "$LOG"
    termux-wake-lock 2>/dev/null
    
    if [ -f "$PROJECT_DIR/start_termux.sh" ]; then
        cd "$PROJECT_DIR" && bash start_termux.sh >> "$LOG" 2>&1 &
    else
        echo "[$(date)] ERROR: $PROJECT_DIR/start_termux.sh not found." >> "$LOG"
    fi
else
    echo "[$(date)] tmux session alive — OK." >> "$LOG"
fi

# 2. Log rotate for external logs (boot and self-heal) and redundant project logs
MAX_LOG_BYTES=$((5 * 1024 * 1024))
for f in "$PROJECT_DIR/server.log" "$PROJECT_DIR/tunnel.log" "$HOME/boot.log" "$HOME/self-heal.log"; do
    if [ -f "$f" ]; then
        size=$(stat -c%s "$f" 2>/dev/null || echo 0)
        if [ "$size" -gt "$MAX_LOG_BYTES" ]; then
            tail -c 1048576 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
            echo "[$(date)] [log-rotate] Trimmed $f (was ${size} bytes)." >> "$LOG"
        fi
    fi
done

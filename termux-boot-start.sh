#!/bin/bash

# ============================================================
# termux-boot-start.sh
# 
# Install instructions:
# 1. Install "Termux:Boot" app from F-Droid
# 2. Open the Termux:Boot app once to initialize
# 3. Copy this file to ~/.termux/boot/start-expense-tracker.sh
#    (e.g., cp termux-boot-start.sh ~/.termux/boot/start-expense-tracker.sh)
#    (e.g., chmod +x ~/.termux/boot/start-expense-tracker.sh)
# ============================================================

LOG="$HOME/boot.log"

# Wait for system to fully boot and establish Wi-Fi
sleep 20

echo "[$(date)] Device reboot detected — starting Expense Tracker..." >> "$LOG"

# Grab wake-lock immediately so Termux is not dozed
termux-wake-lock 2>/dev/null

# CHANGE THIS TO YOUR ACTUAL PROJECT FOLDER ON THE DEVICE
PROJECT_DIR="$HOME/Expense-Tracker"

if [ -f "$PROJECT_DIR/start_termux.sh" ]; then
    cd "$PROJECT_DIR" || {
        echo "[$(date)] ERROR: Failed to cd to $PROJECT_DIR" >> "$LOG"
        exit 1
    }
    
    # Launch main script
    bash start_termux.sh >> "$LOG" 2>&1 &
    
    echo "[$(date)] Boot script completed." >> "$LOG"
else
    echo "[$(date)] ERROR: $PROJECT_DIR/start_termux.sh not found." >> "$LOG"
fi

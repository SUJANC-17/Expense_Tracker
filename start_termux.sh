#!/bin/bash

# Expense Tracker Termux Start Script
# This script automates the setup and startup of the Expense Tracker on Termux.

echo "--- Expense Tracker Termux Setup ---"

# 0. Request storage access (Required for /sdcard/Documents access)
echo "Checking storage access..."
if [ ! -d "~/storage" ]; then
    echo "Running termux-setup-storage. Please grant permission in the Android popup."
    termux-setup-storage
    sleep 2
fi

# 1. Update and install dependencies if needed
echo "Checking dependencies..."
pkg update -y
pkg install -y nodejs git python make clang

# 2. Install npm dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

# 3. Data directory is now handled by the server in /sdcard/Documents/ExpenseTracker
# mkdir -p server/data (Redundant now)

# 4. Start the server in the background
echo "Starting server on port 3000..."
cd server
npm run dev &
SERVER_PID=$!

echo "Server started with PID $SERVER_PID"
echo "Database location: /sdcard/Documents/ExpenseTracker/expense_tracker.db"

# 5. Instructions for Ngrok
echo ""
echo "--- Remote Access with Ngrok ---"
echo "To access your expense tracker from outside your home network:"
echo "1. Install ngrok: pkg install ngrok"
echo "2. Connect your account: ngrok config add-authtoken <your-token>"
echo "3. Start ngrok: ngrok http 3000"
echo "Copy the 'Forwarding' URL provided by ngrok and use it as your API base URL in the frontend."
echo ""
echo "Keep this terminal running (or use a terminal multiplexer like tmux/screen)."

# Wait for server to keep script alive if not using background
wait $SERVER_PID

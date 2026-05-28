@echo off
echo Starting Expense Tracker Project Locally...

echo 1. Starting Backend Server...
start "Backend Server" cmd /k "cd server && if not exist node_modules (echo Installing server dependencies... && call npm install) && npm run dev"

echo 2. Starting Frontend Client...
start "Frontend Client" cmd /k "cd client && if not exist node_modules (echo Installing client dependencies... && call npm install) && npm run dev"

echo All services started! Check the new windows.
echo Local URL: http://localhost:5173
pause

@echo off
echo Starting Expense Tracker Project...

echo 1. Starting Backend Server...
start "Backend Server" cmd /k "cd server && if not exist node_modules (echo Installing server dependencies... && call npm install) && npm run dev"

echo 2. Starting Frontend Client...
start "Frontend Client" cmd /k "cd client && if not exist node_modules (echo Installing client dependencies... && call npm install) && npm run dev"

echo 3. Starting Serveo Tunnel...
start "Serveo Tunnel" cmd /k "echo Waiting for frontend to start... && timeout /t 5 >nul && echo Starting tunnel... && ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 -R expense:80:localhost:5173 serveo.net"

echo All services started! Check the new windows.
echo Public URL: https://expense.serveousercontent.com
pause

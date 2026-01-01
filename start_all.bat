@echo off
echo Starting Expense Tracker Project...

echo 1. Starting Backend Server...
start "Backend Server" cmd /k "cd server && npm run dev"

echo 2. Starting Frontend Client...
start "Frontend Client" cmd /k "cd client && npm run dev"

echo 3. Starting Proxy Server...
start "Proxy Server" cmd /k "cd server && node proxy.js"

echo 4. Starting Ngrok Tunnel...
start "Ngrok Tunnel" cmd /k "cd ngrok && .\ngrok.exe start --all --config ngrok_config.yml"

echo All services started! Check the new windows.
pause

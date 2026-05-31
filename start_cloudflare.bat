@echo off
cd /d "%~dp0"

if "%DB_PATH%"=="" set "DB_PATH=%CD%\server\data\expense_tracker.db"
if "%CLOUDFLARED_TUNNEL_NAME%"=="" set "CLOUDFLARED_TUNNEL_NAME=expensetrack"

where cloudflared >nul 2>nul
if errorlevel 1 (
    echo cloudflared is not installed or not on PATH.
    pause
    exit /b 1
)

echo Starting Expense Tracker with Cloudflare Tunnel...

echo 1. Starting Backend Server...
start "Backend Server" cmd /k "cd /d server && set DB_PATH=%DB_PATH% && npm run dev"

echo 2. Starting Frontend Client...
start "Frontend Client" cmd /k "cd /d client && npm run dev"

echo 3. Starting Cloudflare Tunnel...
start "cloudflared Tunnel" cmd /k "cloudflared tunnel run %CLOUDFLARED_TUNNEL_NAME%"

echo Cloudflare tunnel opened in a new window.
echo Public URL will be printed in the tunnel window.
pause

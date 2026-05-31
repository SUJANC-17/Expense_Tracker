@echo off
cd /d "%~dp0"

if "%DB_PATH%"=="" set "DB_PATH=%CD%\server\data\expense_tracker.db"

echo Starting Expense Tracker Project Locally...

echo 1. Starting Backend Server...
start "Backend Server" cmd /k "cd server && set \"DB_PATH=%DB_PATH%\" && npm run dev"

echo 2. Starting Frontend Client...
start "Frontend Client" cmd /k "cd client && npm run dev"

echo All services started! Check the new windows.
echo Local URL: http://localhost:5173
echo Database: %DB_PATH%
pause

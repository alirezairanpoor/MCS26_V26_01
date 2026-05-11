@echo off
title MCS26_V26_01 - Host Server

cd /d "%~dp0.."

echo ==========================================
echo MCS26_V26_01 HOST SERVER
echo ==========================================
echo.
echo This computer is the HOST.
echo Keep both windows open.
echo.
echo Frontend:  http://HOST-IP:5173/
echo WebSocket: http://HOST-IP:3001/
echo.
echo Starting WebSocket server in a new window...
start "MCS26_V26_01 WebSocket Server" cmd /k "npm run start:server"

echo.
echo Starting Frontend server in this window...
echo.
npm run start:frontend

pause
@echo off
title MCS26_V26_01 - Production Server

cd /d "%~dp0\.."

echo ==========================================
echo Starting MCS26_V26_01 Production Server
echo ==========================================
echo.

echo Building project...
call npm run build

echo.
echo Starting server...
call npm run preview

echo.
echo Server stopped or an error occurred.
pause
@echo off
title MCS26_V26_01 - Open SOM

echo ==========================================
echo MCS26_V26_01 - OPEN SOM
echo ==========================================
echo.

set /p HOST_IP=Enter HOST IP address: 

start "" "http://%HOST_IP%:5173/?role=SOM"
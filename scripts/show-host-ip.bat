@echo off
title MCS26_V26_01 - Show Host IP

echo ==========================================
echo MCS26_V26_01 HOST IP INFORMATION
echo ==========================================
echo.
echo Use the IPv4 address of the HOST computer.
echo.
echo Current IPv4 addresses:
echo.

ipconfig | findstr /i "IPv4"

echo.
echo ==========================================
echo ROLE URL FORMAT
echo ==========================================
echo.
echo SOM:
echo http://HOST-IP:5173/?role=SOM
echo.
echo SPACON:
echo http://HOST-IP:5173/?role=SPACON
echo.
echo SOE1:
echo http://HOST-IP:5173/?role=SOE
echo.
echo SOE2:
echo http://HOST-IP:5173/?role=SOE
echo.
echo Replace HOST-IP with the IPv4 address shown above.
echo.
pause
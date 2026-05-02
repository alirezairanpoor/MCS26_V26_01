@echo off
title Show Host IP Address

echo Host IP addresses:
echo.

ipconfig | findstr /i "IPv4"

echo.
echo The simulator shortcut currently uses:
echo http://192.168.2.183:4173/
echo.

pause
@echo off
cd /d "%~dp0"
echo ===================================================
echo [TV Communication Board] Wi-Fi Delivery Server
echo ===================================================
echo.
echo Fire TV Stick (Silk browser) can access:
echo    http://192.168.0.241:8000
echo.
echo Local PC browser can access:
echo    http://localhost:8000
echo.
echo Press Ctrl+C to stop server.
echo ===================================================
python -m http.server 8000
pause

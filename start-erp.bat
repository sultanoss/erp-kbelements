@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 4 >nul && start http://localhost:3000/login"
"C:\Program Files\nodejs\node.exe" "node_modules\next\dist\bin\next" dev
pause

@echo off
setlocal
set "STORE=ahygpy-ag.myshopify.com"
set "THEME_ID=198612058376"
set "THEME_PATH=%~dp0theme"
set "npm_config_cache=%~dp0.npm-cache"

echo Lade ausschliesslich "Kopie von FinalVersion-3" herunter...
npx.cmd --yes @shopify/cli@latest theme pull --store "%STORE%" --theme "%THEME_ID%" --path "%THEME_PATH%"
if errorlevel 1 exit /b %errorlevel%

echo Theme-ID %THEME_ID% wurde nach "%THEME_PATH%" geladen.
endlocal

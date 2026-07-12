@echo off
setlocal
set "STORE=ahygpy-ag.myshopify.com"
set "THEME_ID=198612058376"
set "THEME_PATH=%~dp0theme"
set "npm_config_cache=%~dp0.npm-cache"

if not exist "%THEME_PATH%\layout\theme.liquid" (
  echo ABBRUCH: Lokale Theme-Dateien fehlen. Zuerst PULL-KOPIE.cmd ausfuehren.
  exit /b 1
)

echo Pushe ausschliesslich in den unveroeffentlichten Entwurf Theme-ID %THEME_ID%...
npx.cmd --yes @shopify/cli@latest theme push --store "%STORE%" --theme "%THEME_ID%" --path "%THEME_PATH%" --nodelete
if errorlevel 1 exit /b %errorlevel%

echo Push in "Kopie von FinalVersion-3" erfolgreich. Es wurde nichts veroeffentlicht.
endlocal

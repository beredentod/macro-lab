@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 18 or later, then run this file again.
  pause
  exit /b 1
)
rem Use a new free port so an older Macro lab server cannot mask this copy.
set "PORT=0"
echo Serving the Macro lab files in: %CD%
echo A new browser tab will open. If it does not, use the URL printed below.
node server.mjs --open
pause

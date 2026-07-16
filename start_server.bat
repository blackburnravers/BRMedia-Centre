@echo off
setlocal

REM ===== PROJECT ROOT =====
set "ROOT=%~dp0"
for %%I in ("%ROOT%") do set "ROOT=%%~fI"

REM ===== CONFIG =====
set "PORT=8787"

REM ===== START BRMEDIA BACKGROUND SERVER =====
powershell -ExecutionPolicy Bypass -File "%ROOT%tools\windows\start-brmedia-service.ps1" -ProjectRoot "%ROOT%" -Port %PORT%

REM ===== OPEN PAGES =====
start "" "http://localhost:%PORT%/"
start "" "http://localhost:%PORT%/player"

exit /b 0
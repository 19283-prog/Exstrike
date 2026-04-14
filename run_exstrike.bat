@echo off
setlocal
set "GAME_DIR=%~dp0exstrike"
set "PORT=5510"
set "URL=http://127.0.0.1:%PORT%/"

if not exist "%GAME_DIR%\index.html" (
  echo Exstrike launcher could not find:
  echo "%GAME_DIR%\index.html"
  echo.
  echo Make sure this file stays next to the exstrike folder.
  pause
  exit /b 1
)

cd /d "%GAME_DIR%"

where py >nul 2>nul
if "%errorlevel%"=="0" (
  set "PYTHON_CMD=py -3"
) else (
  where python >nul 2>nul
  if "%errorlevel%"=="0" (
    set "PYTHON_CMD=python"
  ) else (
    echo Python is required to run Exstrike's local browser server.
    echo Install Python from https://www.python.org/downloads/
    echo Then run this launcher again.
    pause
    exit /b 1
  )
)

echo Starting Exstrike...
echo.
echo If the browser does not open, go to:
echo %URL%
echo.
echo Keep this window open while playing. Close it to stop the server.
echo.
start "" "%URL%"
%PYTHON_CMD% -m http.server %PORT%

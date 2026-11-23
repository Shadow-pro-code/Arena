@echo off
setlocal enabledelayedexpansion
title Maydan Al-Abtal - Local Node.js Server

echo ==================================================
echo   Maydan Al-Abtal (Etheria) - Local Launcher
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install Node.js 20 LTS or newer from https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Detected Node.js %NODE_VER%

if not exist "node_modules" (
  echo [INFO] Installing dependencies via npm install...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check your internet connection and retry.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo [INFO] Created .env from .env.example
  )
)

echo.
echo [INFO] Starting Maydan Al-Abtal server...
echo [INFO] Open http://localhost:3000 in your browser once ready.
echo [INFO] Press Ctrl+C to stop the server.
echo.

call npm run dev
pause

#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "  Maydan Al-Abtal (Etheria) - Local Launcher"
echo "=================================================="

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm is not available in PATH."
  exit 1
fi

echo "[OK] Node.js $(node -v) | npm $(npm -v)"

if [ ! -d "node_modules" ]; then
  echo "[INFO] Installing project dependencies..."
  npm install
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
  echo "[INFO] Created .env from .env.example"
fi

echo "[INFO] Starting server... Open http://localhost:3000 in your browser."
npm run dev

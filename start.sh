#!/usr/bin/env bash

# Legends Walk Off - Tournament Portal Startup Script
# STME Impulse Committee • NMIMS Hyderabad 2026

set -e

PORT=3000
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=================================================="
echo "⚡ Starting Legends Walk Off Tournament Web Portal"
echo "   Directory: $DIR"
echo "   Port:      $PORT"
echo "=================================================="

# Function to launch the default browser on macOS
launch_browser() {
  sleep 1
  if command -v open >/dev/null 2>&1; then
    open "http://localhost:$PORT"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:$PORT"
  fi
}

# Launch browser in background
launch_browser &

# Check available runners: python3 or npx/node
if command -v python3 >/dev/null 2>&1; then
  echo "🚀 Running via Python 3 HTTP Server..."
  echo "🌐 Access URL: http://localhost:$PORT"
  echo "Press Ctrl+C to stop the server."
  python3 -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  echo "🚀 Running via npx serve..."
  echo "🌐 Access URL: http://localhost:$PORT"
  echo "Press Ctrl+C to stop the server."
  npx serve -l "$PORT" .
else
  echo "❌ Neither python3 nor npx was found. Opening index.html directly..."
  open "$DIR/index.html"
fi

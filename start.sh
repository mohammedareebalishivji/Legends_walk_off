#!/usr/bin/env bash

# ==============================================================================
# Legends Walk Off - Tournament Portal Startup Script
# STME Impulse Committee • NMIMS Hyderabad 2026
# ==============================================================================

set -eo pipefail

DESIRED_PORT=3000
PORT=$DESIRED_PORT
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================================"
echo "⚡ STARTING LEGENDS WALK OFF TOURNAMENT WEB PORTAL"
echo "   Directory: $DIR"
echo "======================================================================"

# 1. Self-healing Port Conflict Resolution
check_and_free_port() {
  local target_port=$1
  local existing_pid
  existing_pid=$(lsof -ti :"$target_port" 2>/dev/null || true)

  if [ -n "$existing_pid" ]; then
    echo "⚠️  Port $target_port is currently occupied by PID $existing_pid."
    echo "🔄 Automatically freeing port $target_port..."
    kill -9 $existing_pid 2>/dev/null || true
    sleep 0.8
  fi

  # Double check if port is now available
  if lsof -ti :"$target_port" >/dev/null 2>&1; then
    echo "⚠️  Unable to release port $target_port. Finding next available port..."
    while lsof -ti :"$PORT" >/dev/null 2>&1; do
      PORT=$((PORT + 1))
    done
    echo "✅ Selected open port: $PORT"
  else
    PORT=$target_port
    echo "✅ Port $PORT is available."
  fi
}

check_and_free_port "$DESIRED_PORT"

# 2. Browser launcher that waits until the server is actively accepting requests
launch_browser_when_ready() {
  local target_url="http://localhost:$PORT"
  local attempts=0
  local max_attempts=15

  while [ $attempts -lt $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$target_url" 2>/dev/null | grep -qE "200|301|302"; then
      echo "🚀 Portal is live! Launching browser..."
      if command -v open >/dev/null 2>&1; then
        open "$target_url"
      elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$target_url"
      fi
      return 0
    fi
    sleep 0.3
    attempts=$((attempts + 1))
  done

  # Fallback open if poll timed out
  if command -v open >/dev/null 2>&1; then
    open "$target_url"
  fi
}

# 3. Clean exit handler
cleanup() {
  echo -e "\n🛑 Stopping Legends Walk Off Server..."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start browser check in background
launch_browser_when_ready &

echo "🌐 Access URL: http://localhost:$PORT"
echo "Press Ctrl+C to stop the server."
echo "======================================================================"

# 4. Start HTTP Server using Python 3 or npx serve
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx serve -l "$PORT" .
else
  echo "❌ Neither python3 nor npx was found. Opening index.html directly..."
  open "$DIR/index.html"
fi

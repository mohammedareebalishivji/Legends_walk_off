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

# 2. Network IP Detection for LAN / Wi-Fi Device Access
get_network_ip() {
  local ip=""

  # macOS: Check primary Wi-Fi interface (en0) or secondary Ethernet (en1)
  if command -v ipconfig >/dev/null 2>&1; then
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
  fi

  # Fallback 1: Extract non-loopback, non-point-to-point IP from ifconfig
  if [ -z "$ip" ]; then
    ip=$(ifconfig 2>/dev/null | awk '/inet / && !/127\.0\.0\.1/ && !/-->/ {print $2; exit}' || true)
  fi

  # Fallback 2: Check hostname -I (common on Linux)
  if [ -z "$ip" ] && command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  fi

  # Fallback 3: Python socket route query
  if [ -z "$ip" ] && command -v python3 >/dev/null 2>&1; then
    ip=$(python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || true)
  fi

  echo "$ip"
}

NETWORK_IP=$(get_network_ip)

# 3. Browser launcher that waits until the server is actively accepting requests
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

# 4. Clean exit handler
cleanup() {
  echo -e "\n🛑 Stopping Legends Walk Off Server..."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start browser check in background
launch_browser_when_ready &

# 5. Display Local and Network Connection Links
echo ""
echo "======================================================================"
echo "⚡ LEGENDS WALK OFF WEB PORTAL IS READY"
echo "======================================================================"
echo -e "  ➜  Local:   http://localhost:$PORT/"
if [ -n "$NETWORK_IP" ]; then
  echo -e "  ➜  Network: http://$NETWORK_IP:$PORT/"
  echo ""
  echo "📱 Connect from Mobile / Tablet / Other Devices on Same Wi-Fi:"
  echo "   • Tournament Home:     http://$NETWORK_IP:$PORT/"
  echo "   • MPH Stage Screen:    http://$NETWORK_IP:$PORT/mph-screen.html"
  echo "   • Captains Console:    http://$NETWORK_IP:$PORT/captain-dashboard.html"
  echo "   • Player Auction Hub:  http://$NETWORK_IP:$PORT/auction.html"
  echo "   • Live Score Broadcast:http://$NETWORK_IP:$PORT/live-scores.html"
  echo "   • Mobile Live Scores:  http://$NETWORK_IP:$PORT/mobile-live.html"
else
  echo -e "  ➜  Network: (Connect to Wi-Fi to generate network link)"
fi
echo "======================================================================"
echo "Press Ctrl+C to stop the server."
echo "======================================================================"
echo ""

# 6. Start HTTP Server listening on all network interfaces (0.0.0.0)
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server --bind 0.0.0.0 "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx serve -l "$PORT" .
else
  echo "❌ Neither python3 nor npx was found. Opening index.html directly..."
  open "$DIR/index.html"
fi

#!/usr/bin/env bash

# ==============================================================================
# Legends Walk Off — Continuous Integration, RBAC Verification & Build Pipeline
# STME Impulse Committee • NMIMS Hyderabad 2026
# ==============================================================================

set -eo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================================"
echo "⚡ LEGENDS WALK OFF — AUTOMATED PIPELINE & RBAC CONTROL SYSTEM"
echo "======================================================================"

# STAGE 1: ENVIRONMENT & TOOLING CHECK
echo -e "\n📋 [STAGE 1/5] Checking Environment & Prerequisites..."
command -v bash >/dev/null 2>&1 && echo "  ✓ Bash: $(bash --version | head -n1)"
if command -v node >/dev/null 2>&1; then
  echo "  ✓ Node.js: $(node -v)"
else
  echo "  ⚠ Warning: Node.js not found in PATH."
fi

if command -v python3 >/dev/null 2>&1; then
  echo "  ✓ Python 3: $(python3 --version)"
fi

if command -v git >/dev/null 2>&1; then
  echo "  ✓ Git: $(git --version)"
fi

# STAGE 2: SYNTAX & CODEBASE INTEGRITY
echo -e "\n🔍 [STAGE 2/5] Validating Static Integrity & Syntax..."
# Validate JS syntax
if command -v node >/dev/null 2>&1; then
  node -c js/legends-core.js
  echo "  ✓ js/legends-core.js syntax verified"
  node -c js/legends-rbac.js
  echo "  ✓ js/legends-rbac.js syntax verified"
  node -c js/legends-roster.js
  echo "  ✓ js/legends-roster.js syntax verified"
  node -c js/legends-auction.js
  echo "  ✓ js/legends-auction.js syntax verified"
fi

# Verify required core files
REQUIRED_FILES=(
  "index.html"
  "standings.html"
  "live-scores.html"
  "auction.html"
  "about.html"
  "admin-console.html"
  "login.html"
  "mobile-live.html"
  "mobile-admin.html"
  "js/legends-core.js"
  "js/legends-rbac.js"
  "js/legends-roster.js"
  "js/legends-auction.js"
  "assets/logo.png"
  "assets/hero-banner.png"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ Found: $file ($(wc -c < "$file" | tr -d ' ') bytes)"
  else
    echo "  ❌ MISSING: $file"
    exit 1
  fi
done

# STAGE 3: RUN RBAC, ROSTER, AUCTION & LOGIN AUTH TEST SUITES
echo -e "\n🧪 [STAGE 3/5] Executing RBAC Security, Roster, Auction & Login Auth Test Suites..."
if command -v node >/dev/null 2>&1; then
  node tests/rbac.test.js
  node tests/roster.test.js
  node tests/auction.test.js
  node tests/login.test.js
else
  echo "  ⚠ Skipping node tests (Node.js required)."
fi

# STAGE 4: BUILD DISTRIBUTION ARTIFACT (dist/)
echo -e "\n📦 [STAGE 4/5] Building Distribution Artifact (dist/)..."
rm -rf dist
mkdir -p dist/js dist/assets

cp *.html dist/
cp js/*.js dist/js/
cp -r assets/* dist/assets/
cp README.md dist/

DIST_COUNT=$(find dist -type f | wc -l | tr -d ' ')
echo "  ✓ Created dist/ artifact with $DIST_COUNT bundled files"

# STAGE 5: SMOKE TEST WEB ENDPOINTS
echo -e "\n🌐 [STAGE 5/5] Performing Local HTTP Server Smoke Test..."
TEST_PORT=3999

# Start background server
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$TEST_PORT" >/dev/null 2>&1 &
  SERVER_PID=$!
  sleep 1

  # Test routes
  ENDPOINTS=(
    ""
    "index.html"
    "standings.html"
    "live-scores.html"
    "auction.html"
    "about.html"
    "admin-console.html"
    "login.html"
    "mobile-live.html"
    "mobile-admin.html"
    "js/legends-core.js"
    "js/legends-rbac.js"
    "js/legends-roster.js"
    "js/legends-auction.js"
  )

  ALL_SUCCESS=true
  for ep in "${ENDPOINTS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TEST_PORT}/${ep}")
    if [ "$STATUS" -eq 200 ]; then
      echo "  ✓ Route /${ep} -> HTTP 200 OK"
    else
      echo "  ❌ Route /${ep} -> HTTP $STATUS"
      ALL_SUCCESS=false
    fi
  done

  # Kill test server
  kill "$SERVER_PID" 2>/dev/null || true

  if [ "$ALL_SUCCESS" = false ]; then
    echo "❌ Some route tests failed."
    exit 1
  fi
fi

echo -e "\n======================================================================"
echo "🎉 PIPELINE COMPLETE: ALL 5 STAGES PASSED SUCCESSFULLY!"
echo "   Artifact: dist/"
echo "   Run:      ./start.sh"
echo "======================================================================"

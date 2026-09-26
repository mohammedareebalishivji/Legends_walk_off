#!/usr/bin/env bash

# ==============================================================================
# Legends Walk Off — Installer & Environment Bootstrap Script
# STME Impulse Committee • NMIMS Hyderabad 2026
# ==============================================================================

set -eo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================================"
echo "⚡ INSTALLING LEGENDS WALK OFF TOURNAMENT SYSTEM"
echo "======================================================================"

# 1. Ensure scripts are executable
echo -e "\n🔧 Setting file execution permissions..."
chmod +x start.sh pipeline.sh 2>/dev/null || true
echo "  ✓ start.sh is executable"
echo "  ✓ pipeline.sh is executable"

# 2. Check Node / npm dependencies (if any)
if command -v npm >/dev/null 2>&1; then
  echo -e "\n📦 Verifying npm tooling..."
  echo "  ✓ npm available: $(npm -v)"
fi

# 3. Run the verification and build pipeline
echo -e "\n🚀 Executing verification & build pipeline..."
./pipeline.sh

echo -e "\n======================================================================"
echo "✅ INSTALLATION & PIPELINE SETUP COMPLETE!"
echo ""
echo "To start the web application, run:"
echo "   ./start.sh"
echo ""
echo "To re-run tests & pipeline verification:"
echo "   ./pipeline.sh"
echo "======================================================================"

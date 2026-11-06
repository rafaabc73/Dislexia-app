#!/usr/bin/env bash
cd "$(dirname "$0")"
ROOT_DIR="$(pwd)"

echo "========================================================="
echo "  Dislexia App — Ambiente Isolado no seu Linux"
echo "========================================================="

if command -v node >/dev/null 2>&1; then
  node "$ROOT_DIR/scripts/install-desktop-shortcut.mjs"
  fuser -k 45678/tcp 2>/dev/null || true
  node "$ROOT_DIR/scripts/start-desktop-app.mjs"
else
  mkdir -p "$ROOT_DIR/Pastas_do_Aluno"
  FILE_URL="file://$ROOT_DIR/index.html"
  google-chrome --app="$FILE_URL" --window-size=1400,900 2>/dev/null || \
  chromium --app="$FILE_URL" --window-size=1400,900 2>/dev/null || \
  chromium-browser --app="$FILE_URL" --window-size=1400,900 2>/dev/null || \
  microsoft-edge --app="$FILE_URL" --window-size=1400,900 2>/dev/null || \
  xdg-open "$ROOT_DIR/index.html"
fi

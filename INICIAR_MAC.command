#!/bin/bash
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "========================================================="
echo "  Dislexia App — Modo Aplicativo de Computador (macOS)"
echo "========================================================="

if [ ! -d "node_modules" ]; then
  echo "[1/3] Preparando componentes pela primeira vez..."
  npm install
fi

echo "[2/3] Criando pastas físicas (Pastas_do_Aluno) e instalando 'Dislexia App.app' no Mac..."
node scripts/install-desktop-shortcut.mjs

echo "[3/3] Abrindo o Dislexia App como aplicativo de computador..."
node scripts/start-desktop-app.mjs

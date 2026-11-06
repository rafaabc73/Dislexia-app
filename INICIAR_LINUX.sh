#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "========================================================="
echo "  Dislexia App — Modo Aplicativo de Computador (Linux)"
echo "========================================================="

if [ ! -d "node_modules" ]; then
  echo "[1/3] Preparando componentes pela primeira vez..."
  npm install
fi

echo "[2/3] Criando pastas físicas (Pastas_do_Aluno) e instalando no Menu de Aplicativos do Linux..."
node scripts/install-desktop-shortcut.mjs

echo "[3/3] Abrindo o Dislexia App em janela de aplicativo dedicada (estilo VS Code)..."
node scripts/start-desktop-app.mjs

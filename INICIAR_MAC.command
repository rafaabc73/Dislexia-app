#!/bin/bash
cd "$(dirname "$0")"
echo "==================================================="
echo "  Iniciando o Dislexia App (Foco, Leitura e TDAH)"
echo "==================================================="
if [ ! -d "node_modules" ]; then
  echo "[1/2] Instalando os componentes pela primeira vez..."
  npm install
fi
echo "[2/2] Abrindo o aplicativo..."
open http://localhost:5173 &
npm run dev -- --host


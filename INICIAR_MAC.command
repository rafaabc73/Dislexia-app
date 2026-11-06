#!/bin/bash
cd "$(dirname "$0")"
echo "==================================================="
echo "  Iniciando o Dislexia App (Foco, Leitura e TDAH)"
echo "==================================================="
if [ ! -d "node_modules" ]; then
  echo "[1/3] Instalando os componentes pela primeira vez..."
  npm install
fi
echo "[2/3] Criando e verificando a estrutura de pastas (Pastas_do_Aluno) no seu computador..."
node scripts/setup-folders.mjs
echo "[3/3] Abrindo o aplicativo..."
open http://localhost:5173 &
npm run dev -- --host

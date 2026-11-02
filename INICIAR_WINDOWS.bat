@echo off
chcp 65001 >nul
title Dislexia App - Inicializador Automatico
echo ===================================================
echo   Iniciando o Dislexia App (Foco, Leitura e TDAH)
echo ===================================================
echo.
if not exist "node_modules" (
    echo [1/2] Instalando os componentes pela primeira vez... Aguarde um instante.
    call npm install
)
echo.
echo [2/2] Abrindo o aplicativo no navegador...
echo Para acessar no iPhone/iPad (iOS), digite no Safari o endereco "Network" que aparecer abaixo!
echo.
start http://localhost:5173
call npm run dev -- --host
pause


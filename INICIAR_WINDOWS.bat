@echo off
chcp 65001 >nul
title Dislexia App - Aplicativo Desktop (Windows)
cd /d "%~dp0"
echo =========================================================
echo   Dislexia App - Modo Aplicativo de Computador (Windows)
echo =========================================================
echo.
if not exist "node_modules" (
    echo [1/3] Preparando componentes pela primeira vez... Aguarde um instante.
    call npm install
)
echo [2/3] Configurando pastas fisicas (Pastas_do_Aluno) e atalho na Area de Trabalho...
call node scripts/install-desktop-shortcut.mjs
echo.
echo [3/3] Abrindo o Dislexia App em janela de aplicativo dedicada (estilo VS Code)...
call node scripts/start-desktop-app.mjs
pause

@echo off
chcp 65001 >nul
title Dislexia App - Ambiente Isolado Local (Windows)
cd /d "%~dp0"
echo =========================================================
echo   Dislexia App - Ambiente Isolado no seu Computador
echo =========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [1/2] Configurando pastas fisicas (Pastas_do_Aluno) e atalho na Area de Trabalho...
    call node scripts/install-desktop-shortcut.mjs
    echo.
    echo [2/2] Abrindo o Dislexia App em janela de aplicativo dedicada...
    call node scripts/start-desktop-app.mjs
) else (
    echo [Modo Direto Sem Node.js] Criando pasta Pastas_do_Aluno e abrindo o aplicativo...
    if not exist "Pastas_do_Aluno" mkdir "Pastas_do_Aluno"
    start msedge --app="file:///%CD:\=/%/index.html" --window-size=1400,900 || start chrome --app="file:///%CD:\=/%/index.html" --window-size=1400,900 || start "" "%CD%\index.html"
)

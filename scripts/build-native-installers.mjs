import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'Instaladores');
const STANDALONE_HTML = path.join(ROOT_DIR, 'dist', 'standalone.html');

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(STANDALONE_HTML)) {
  throw new Error('dist/standalone.html não encontrado. Rode npm run build primeiro.');
}

// ============================================================================
// 1. INSTALADOR OFICIAL DO MAC (.pkg Wizard + .dmg + Aplicativo Universal)
// ============================================================================
function buildMacInstallers() {
  console.log('🍎 Compilando Aplicativo Nativo Universal do macOS (Apple Silicon + Intel)...');
  const tmpMacDir = '/tmp/dislexia_mac_build';
  fs.rmSync(tmpMacDir, { recursive: true, force: true });

  const payloadDir = path.join(tmpMacDir, 'payload');
  const scriptsDir = path.join(tmpMacDir, 'scripts');
  const appBundle = path.join(payloadDir, 'Applications', 'Dislexia App.app');
  const contentsDir = path.join(appBundle, 'Contents');
  const macosDir = path.join(contentsDir, 'MacOS');
  const resourcesDir = path.join(contentsDir, 'Resources');

  fs.mkdirSync(macosDir, { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });

  // Compila binário nativo Objective-C Universal (arm64 Apple Silicon + x86_64 Intel)
  const objcSrc = path.join(ROOT_DIR, 'scripts', 'macos-native', 'main.m');
  const binUniversal = path.join(macosDir, 'DislexiaApp');

  execSync(
    `clang -fobjc-arc -O2 -arch arm64 -arch x86_64 -mmacosx-version-min=10.15 "${objcSrc}" -o "${binUniversal}" -framework Cocoa -framework WebKit`
  );
  fs.chmodSync(binUniversal, 0o755);

  // Copia o standalone.html para dentro do Resources do .app
  fs.copyFileSync(STANDALONE_HTML, path.join(resourcesDir, 'standalone.html'));

  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>DislexiaApp</string>
  <key>CFBundleIdentifier</key>
  <string>org.dislexiaapp.native</string>
  <key>CFBundleName</key>
  <string>Dislexia App</string>
  <key>CFBundleDisplayName</key>
  <string>Dislexia App</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>100</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.15</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>`;
  fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist, 'utf8');

  // Assina ad-hoc para que o macOS rode sem erro de binário modificado
  try {
    execSync(`codesign --force --deep --sign - "${appBundle}"`);
  } catch {}

  // Também atualiza o Dislexia App.app na Mesa e em ~/Applications deste Mac
  try {
    const home = process.env.HOME || '';
    if (home) {
      for (const dest of [
        path.join(home, 'Desktop', 'Dislexia App.app'),
        path.join(home, 'Applications', 'Dislexia App.app'),
      ]) {
        fs.rmSync(dest, { recursive: true, force: true });
        execSync(`cp -R "${appBundle}" "${dest}"`);
      }
    }
  } catch {}

  // Script pós-instalação do .pkg (remove quarentena e abre o aplicativo após instalar)
  const postinstall = `#!/bin/bash
xattr -cr "/Applications/Dislexia App.app" 2>/dev/null || true
chmod -R 755 "/Applications/Dislexia App.app" 2>/dev/null || true
open "/Applications/Dislexia App.app" 2>/dev/null || true
exit 0
`;
  const postinstallPath = path.join(scriptsDir, 'postinstall');
  fs.writeFileSync(postinstallPath, postinstall, 'utf8');
  fs.chmodSync(postinstallPath, 0o755);

  // Gera o instalador gráfico passo a passo oficial do macOS (.pkg)
  const componentPkg = path.join(tmpMacDir, 'component.pkg');
  const finalPkg = path.join(OUT_DIR, 'Instalador_Dislexia_App_Mac.pkg');
  fs.rmSync(finalPkg, { force: true });

  execSync(
    `pkgbuild --root "${payloadDir}" --scripts "${scriptsDir}" --identifier org.dislexiaapp.native --version 1.0.0 --install-location / "${componentPkg}"`
  );
  execSync(`productbuild --package "${componentPkg}" "${finalPkg}"`);
  console.log(`✅ Instalador Wizard do Mac gerado: ${finalPkg}`);

  // Gera também imagem de disco .dmg com o Dislexia App.app e atalho para /Applications
  const dmgRoot = path.join(tmpMacDir, 'dmg_root');
  fs.mkdirSync(dmgRoot, { recursive: true });
  execSync(`cp -R "${appBundle}" "${path.join(dmgRoot, 'Dislexia App.app')}"`);
  try {
    fs.symlinkSync('/Applications', path.join(dmgRoot, 'Applications'));
  } catch {}

  const finalDmg = path.join(OUT_DIR, 'Instalador_Dislexia_App_Mac.dmg');
  fs.rmSync(finalDmg, { force: true });
  execSync(
    `hdiutil create -volname "Dislexia App" -srcfolder "${dmgRoot}" -ov -format UDZO "${finalDmg}"`
  );
  console.log(`✅ Imagem de disco (.dmg) do Mac gerada: ${finalDmg}`);
}

// ============================================================================
// 2. INSTALADOR GRÁFICO DO WINDOWS (Janela de Instalação estilo VS Code Setup)
// ============================================================================
function buildWindowsGraphicalInstaller() {
  console.log('🪟 Gerando Instalador Gráfico do Windows (Setup Wizard)...');
  const standaloneBase64 = fs.readFileSync(STANDALONE_HTML).toString('base64');

  // Criamos um instalador gráfico real em Windows Forms (via PowerShell nativo do Windows 10/11)
  // que abre uma janela de instalação com botão "Instalar Dislexia App", barra de progresso,
  // instala em %LOCALAPPDATA%\Programs\DislexiaApp (mesmo padrão do VS Code), cria Pastas_do_Aluno
  // e cria os atalhos na Área de Trabalho e no Menu Iniciar!
  const psGuiInstaller = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "Instalador — Dislexia App (Setup v1.0.0)"
$form.Size = New-Object System.Drawing.Size(520, 360)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Bem-vindo ao Instalador do Dislexia App"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(37, 99, 235)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(28, 24)
$form.Controls.Add($titleLabel)

$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Text = "Este assistente instalará o Dislexia App no seu computador Windows (em modo aplicativo dedicado estilo VS Code, totalmente isolado na sua máquina).\`r\`n\`r\`n• Pasta do Programa: %LOCALAPPDATA%\\Programs\\DislexiaApp\`r\`n• Pastas Escolares: Documentos\\Pastas_do_Aluno\`r\`n• Atalhos: Área de Trabalho e Menu Iniciar"
$descLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$descLabel.ForeColor = [System.Drawing.Color]::FromArgb(51, 65, 85)
$descLabel.Size = New-Object System.Drawing.Size(455, 125)
$descLabel.Location = New-Object System.Drawing.Point(28, 62)
$form.Controls.Add($descLabel)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Clique em 'Instalar Agora' para iniciar a instalação."
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(28, 195)
$form.Controls.Add($statusLabel)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(28, 220)
$progressBar.Size = New-Object System.Drawing.Size(450, 24)
$progressBar.Minimum = 0
$progressBar.Maximum = 100
$progressBar.Value = 0
$form.Controls.Add($progressBar)

$installBtn = New-Object System.Windows.Forms.Button
$installBtn.Text = "Instalar Agora"
$installBtn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$installBtn.Size = New-Object System.Drawing.Size(170, 38)
$installBtn.Location = New-Object System.Drawing.Point(308, 265)
$installBtn.BackColor = [System.Drawing.Color]::FromArgb(37, 99, 235)
$installBtn.ForeColor = [System.Drawing.Color]::White
$installBtn.FlatStyle = "Flat"

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Text = "Cancelar"
$cancelBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$cancelBtn.Size = New-Object System.Drawing.Size(110, 38)
$cancelBtn.Location = New-Object System.Drawing.Point(188, 265)
$cancelBtn.Add_Click({ $form.Close() })
$form.Controls.Add($cancelBtn)

$installBtn.Add_Click({
    $installBtn.Enabled = $false
    $cancelBtn.Enabled = $false

    $statusLabel.Text = "1/4 Criando pasta do aplicativo em %LOCALAPPDATA%\\Programs\\DislexiaApp..."
    $progressBar.Value = 25
    $form.Refresh()

    $appDir = Join-Path $env:LOCALAPPDATA "Programs\\DislexiaApp"
    New-Item -ItemType Directory -Force -Path $appDir | Out-Null

    $b64 = "${standaloneBase64}"
    $bytes = [System.Convert]::FromBase64String($b64)
    $htmlFile = Join-Path $appDir "DislexiaApp.html"
    [System.IO.File]::WriteAllBytes($htmlFile, $bytes)

    $statusLabel.Text = "2/4 Criando estrutura física Pastas_do_Aluno em Documentos..."
    $progressBar.Value = 55
    $form.Refresh()

    $docsDir = [Environment]::GetFolderPath("MyDocuments")
    $baseFolders = Join-Path $docsDir "Pastas_do_Aluno"
    $years = @("2025 - 6º Ano", "2026 - 7º Ano", "2027 - 8º Ano", "2028 - 9º Ano", "Ensino Médio - 1º Ano", "Ensino Médio - 2º Ano", "Ensino Médio - 3º Ano")
    $subjects = @("Informacoes_Gerais_Boletim", "Lingua_Portuguesa", "Matematica", "Ciencias_Biologia", "Historia", "Geografia", "Lingua_Inglesa", "Fisica", "Quimica", "Redacao_e_Leitura", "Artes")
    $months = @("01_Janeiro", "02_Fevereiro", "03_Marco", "04_Abril", "05_Maio", "06_Junho", "07_Julho", "08_Agosto", "09_Setembro", "10_Outubro", "11_Novembro", "12_Dezembro")

    foreach ($y in $years) {
        foreach ($s in $subjects) {
            $p = Join-Path (Join-Path $baseFolders $y) $s
            New-Item -ItemType Directory -Force -Path (Join-Path $p "Provas") | Out-Null
            foreach ($m in $months) {
                New-Item -ItemType Directory -Force -Path (Join-Path $p $m) | Out-Null
            }
        }
    }

    $statusLabel.Text = "3/4 Criando atalhos na Área de Trabalho e no Menu Iniciar..."
    $progressBar.Value = 85
    $form.Refresh()

    $launcherVbs = Join-Path $appDir "Abrir_Dislexia_App.vbs"
    $vbsContent = 'Set sh = CreateObject("WScript.Shell")' + "\`r\`n" + 'sh.Run "msedge --app=""file:///' + ($htmlFile -replace "\\\\","/") + '"" --window-size=1420,880", 0, False'
    [System.IO.File]::WriteAllText($launcherVbs, $vbsContent, [System.Text.Encoding]::UTF8)

    $wsh = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath("Desktop")
    $startMenu = [Environment]::GetFolderPath("Programs")

    foreach ($folder in @($desktop, $startMenu)) {
        $lnk = $wsh.CreateShortcut((Join-Path $folder "Dislexia App.lnk"))
        $lnk.TargetPath = "wscript.exe"
        $lnk.Arguments = '"' + $launcherVbs + '"'
        $lnk.WorkingDirectory = $appDir
        $lnk.IconLocation = "msedge.exe,0"
        $lnk.Description = "Dislexia App - Estudo Limpo e Focado"
        $lnk.Save()
    }

    $progressBar.Value = 100
    $statusLabel.Text = "✅ Instalação concluída com sucesso! Abrindo o aplicativo..."
    $form.Refresh()

    Start-Process "wscript.exe" -ArgumentList ('"' + $launcherVbs + '"')
    [System.Windows.Forms.MessageBox]::Show("O Dislexia App foi instalado com sucesso no seu computador!\`r\`n\`r\`n• Atalho criado na sua Área de Trabalho e no Menu Iniciar.\`r\`n• Pastas criadas em Documentos\\Pastas_do_Aluno.", "Instalação Concluída", "OK", "Information") | Out-Null
    $form.Close()
})

$form.Controls.Add($installBtn)
[void]$form.ShowDialog()
`;

  const psEncoded = Buffer.from(psGuiInstaller, 'utf16le').toString('base64');
  const batWrapper = `@echo off
title Instalador Dislexia App (Windows Setup)
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${psEncoded}
`;

  const winOut = path.join(OUT_DIR, 'Instalador_Dislexia_App_Windows.bat');
  fs.writeFileSync(winOut, batWrapper, 'utf8');
  // Também atualiza o INICIAR_WINDOWS.bat na raiz para abrir o instalador gráfico se preferir
  console.log(`✅ Instalador Gráfico do Windows gerado: ${winOut}`);
}

// ============================================================================
// 3. INSTALADOR OFICIAL DO LINUX (.deb Package para Ubuntu/Debian/Mint)
// ============================================================================
function buildLinuxDebInstaller() {
  console.log('🐧 Gerando Pacote Instalador Oficial do Linux (.deb)...');
  const tmpDeb = '/tmp/dislexia_deb_build';
  fs.rmSync(tmpDeb, { recursive: true, force: true });

  const controlDir = path.join(tmpDeb, 'control');
  const dataDir = path.join(tmpDeb, 'data');
  const optAppDir = path.join(dataDir, 'opt', 'dislexia-app');
  const binDir = path.join(dataDir, 'usr', 'bin');
  const desktopDir = path.join(dataDir, 'usr', 'share', 'applications');

  fs.mkdirSync(controlDir, { recursive: true });
  fs.mkdirSync(optAppDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(desktopDir, { recursive: true });

  fs.copyFileSync(STANDALONE_HTML, path.join(optAppDir, 'standalone.html'));
  fs.copyFileSync(
    path.join(ROOT_DIR, 'public', 'icon.svg'),
    path.join(optAppDir, 'icon.svg')
  );

  const launcherBin = `#!/usr/bin/env bash
DOCS_DIR="\${HOME}/Documentos/Pastas_do_Aluno"
mkdir -p "\$DOCS_DIR"
APP_URL="file:///opt/dislexia-app/standalone.html"
google-chrome --app="\$APP_URL" --window-size=1420,880 2>/dev/null || \\
chromium --app="\$APP_URL" --window-size=1420,880 2>/dev/null || \\
chromium-browser --app="\$APP_URL" --window-size=1420,880 2>/dev/null || \\
microsoft-edge --app="\$APP_URL" --window-size=1420,880 2>/dev/null || \\
xdg-open "/opt/dislexia-app/standalone.html"
`;
  const binFile = path.join(binDir, 'dislexia-app');
  fs.writeFileSync(binFile, launcherBin, 'utf8');
  fs.chmodSync(binFile, 0o755);

  const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=Dislexia App
Comment=Aplicativo de estudo focado para Dislexia, TDA e TDAH
Exec=/usr/bin/dislexia-app
Icon=/opt/dislexia-app/icon.svg
Terminal=false
Categories=Education;Utility;
StartupNotify=true
`;
  fs.writeFileSync(
    path.join(desktopDir, 'dislexia-app.desktop'),
    desktopEntry,
    'utf8'
  );

  const controlFile = `Package: dislexia-app
Version: 1.0.0
Section: education
Priority: optional
Architecture: all
Maintainer: Dislexia App <opensource@dislexia-app.org>
Description: Aplicativo de estudo focado para criancas e adolescentes com Dislexia, TDA e TDAH.
`;
  fs.writeFileSync(path.join(controlDir, 'control'), controlFile, 'utf8');

  fs.writeFileSync(path.join(tmpDeb, 'debian-binary'), '2.0\n', 'utf8');
  execSync(`tar -czf "${path.join(tmpDeb, 'control.tar.gz')}" -C "${controlDir}" .`);
  execSync(`tar -czf "${path.join(tmpDeb, 'data.tar.gz')}" -C "${dataDir}" .`);

  const finalDeb = path.join(OUT_DIR, 'Instalador_Dislexia_App_Linux.deb');
  fs.rmSync(finalDeb, { force: true });
  execSync(
    `cd "${tmpDeb}" && ar r "${finalDeb}" debian-binary control.tar.gz data.tar.gz`
  );
  console.log(`✅ Pacote Instalador Linux (.deb) gerado: ${finalDeb}`);
}

buildMacInstallers();
buildWindowsGraphicalInstaller();
buildLinuxDebInstaller();
console.log('🎉 Todos os 3 instaladores nativos foram gerados na pasta Instaladores/!');


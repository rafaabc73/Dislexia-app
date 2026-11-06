import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensurePhysicalFoldersExist } from './setup-folders.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function installMacAppBundle() {
  const homeDir = os.homedir();
  const targets = [
    path.join(homeDir, 'Applications', 'Dislexia App.app'),
    path.join(homeDir, 'Desktop', 'Dislexia App.app'),
  ];

  const nodeBin = process.execPath;

  for (const appBundlePath of targets) {
    try {
      const contentsDir = path.join(appBundlePath, 'Contents');
      const macosDir = path.join(contentsDir, 'MacOS');
      const resourcesDir = path.join(contentsDir, 'Resources');

      fs.mkdirSync(macosDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });

      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>DislexiaApp</string>
  <key>CFBundleIdentifier</key>
  <string>org.dislexiaapp.desktop</string>
  <key>CFBundleName</key>
  <string>Dislexia App</string>
  <key>CFBundleDisplayName</key>
  <string>Dislexia App</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.13</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>`;

      fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist, 'utf-8');

      const launcherScript = `#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "${ROOT_DIR}"
if [ -x "${nodeBin}" ]; then
  "${nodeBin}" "${path.join(ROOT_DIR, 'scripts', 'start-desktop-app.mjs')}" >/tmp/dislexia-app.log 2>&1 &
elif command -v node >/dev/null 2>&1; then
  node "${path.join(ROOT_DIR, 'scripts', 'start-desktop-app.mjs')}" >/tmp/dislexia-app.log 2>&1 &
else
  open "${path.join(ROOT_DIR, 'index.html')}"
fi
`;

      const execFile = path.join(macosDir, 'DislexiaApp');
      fs.writeFileSync(execFile, launcherScript, 'utf-8');
      fs.chmodSync(execFile, 0o755);
      console.log(`✅ Aplicativo macOS instalado em: ${appBundlePath}`);
    } catch (e) {
      console.warn(`Aviso ao criar bundle em ${appBundlePath}:`, e.message);
    }
  }
}

function installWindowsShortcuts() {
  const launcherBat = path.join(ROOT_DIR, 'INICIAR_WINDOWS.bat');
  const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$StartMenuPath = [Environment]::GetFolderPath("Programs")

$Shortcut1 = $WshShell.CreateShortcut((Join-Path $DesktopPath "Dislexia App.lnk"))
$Shortcut1.TargetPath = "${launcherBat.replace(/\\/g, '\\\\')}"
$Shortcut1.WorkingDirectory = "${ROOT_DIR.replace(/\\/g, '\\\\')}"
$Shortcut1.Description = "Dislexia App - Estudo Focado, Leitura e TDAH"
$Shortcut1.Save()

$Shortcut2 = $WshShell.CreateShortcut((Join-Path $StartMenuPath "Dislexia App.lnk"))
$Shortcut2.TargetPath = "${launcherBat.replace(/\\/g, '\\\\')}"
$Shortcut2.WorkingDirectory = "${ROOT_DIR.replace(/\\/g, '\\\\')}"
$Shortcut2.Description = "Dislexia App - Estudo Focado, Leitura e TDAH"
$Shortcut2.Save()
`;

  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\r?\n/g, '; ')}"`);
    console.log('✅ Atalho "Dislexia App" criado na Área de Trabalho e no Menu Iniciar do Windows!');
  } catch (e) {
    console.warn('Aviso ao criar atalho no Windows:', e.message);
  }
}

function installLinuxDesktopEntry() {
  const homeDir = os.homedir();
  const iconPath = path.join(ROOT_DIR, 'public', 'icon.svg');
  const launcherSh = path.join(ROOT_DIR, 'INICIAR_LINUX.sh');

  const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=Dislexia App
Comment=Aplicativo de estudo focado para Dislexia, TDA e TDAH
Exec="${launcherSh}"
Path=${ROOT_DIR}
Icon=${iconPath}
Terminal=false
Categories=Education;Utility;
StartupNotify=true
`;

  const targets = [
    path.join(homeDir, '.local', 'share', 'applications', 'dislexia-app.desktop'),
    path.join(homeDir, 'Desktop', 'dislexia-app.desktop'),
  ];

  for (const target of targets) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, desktopEntry, 'utf-8');
      fs.chmodSync(target, 0o755);
      console.log(`✅ Atalho de aplicativo Linux instalado em: ${target}`);
    } catch (e) {
      // Ignora caso a pasta Desktop tenha outro idioma no Linux
    }
  }
}

console.log('==========================================================');
console.log('  Instalador do Dislexia App (Windows, Mac e Linux)');
console.log('==========================================================');

const foldersPath = ensurePhysicalFoldersExist(ROOT_DIR);
console.log(`📁 Estrutura física de pastas pronta em: ${foldersPath}`);

const platform = os.platform();
if (platform === 'darwin') {
  installMacAppBundle();
} else if (platform === 'win32') {
  installWindowsShortcuts();
} else {
  installLinuxDesktopEntry();
}

console.log('✨ Instalação concluída com sucesso!');


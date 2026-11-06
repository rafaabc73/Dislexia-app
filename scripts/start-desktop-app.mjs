import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ensurePhysicalFoldersExist,
  saveFileToPhysicalFolder,
} from './setup-folders.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function createDesktopServer(rootDir = ROOT_DIR) {
  const baseFoldersPath = ensurePhysicalFoldersExist(rootDir);

  const server = http.createServer((req, res) => {
    const reqUrl = req.url || '/';

    // Endpoint de sincronização física com as pastas reais do computador (Windows, Mac e Linux)
    if (reqUrl.startsWith('/api/local-fs')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'GET' && reqUrl.includes('/status')) {
        const currentPath = ensurePhysicalFoldersExist(rootDir);
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: true,
            basePath: currentPath,
            platform: os.platform(),
          })
        );
        return;
      }

      if (req.method === 'POST' && reqUrl.includes('/save')) {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const savedPath = saveFileToPhysicalFolder(rootDir, payload);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, savedPath }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
        });
        return;
      }
    }

    // Servir arquivos estáticos do aplicativo (dist/ ou raiz)
    const cleanPath = decodeURIComponent(reqUrl.split('?')[0]);
    let targetFile = '';

    if (cleanPath === '/' || cleanPath === '/index.html') {
      const distIndex = path.join(rootDir, 'dist', 'index.html');
      targetFile = fs.existsSync(distIndex)
        ? distIndex
        : path.join(rootDir, 'index.html');
    } else {
      const candidateDist = path.join(rootDir, 'dist', cleanPath);
      const candidateRoot = path.join(rootDir, cleanPath);
      const candidatePublic = path.join(rootDir, 'public', cleanPath);

      if (fs.existsSync(candidateDist) && fs.statSync(candidateDist).isFile()) {
        targetFile = candidateDist;
      } else if (fs.existsSync(candidateRoot) && fs.statSync(candidateRoot).isFile()) {
        targetFile = candidateRoot;
      } else if (
        fs.existsSync(candidatePublic) &&
        fs.statSync(candidatePublic).isFile()
      ) {
        targetFile = candidatePublic;
      } else {
        const distIndex = path.join(rootDir, 'dist', 'index.html');
        targetFile = fs.existsSync(distIndex)
          ? distIndex
          : path.join(rootDir, 'index.html');
      }
    }

    try {
      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(targetFile);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado.');
    }
  });

  return { server, baseFoldersPath };
}

function launchDedicatedAppWindow(appUrl) {
  const platform = os.platform();

  if (platform === 'win32') {
    // No Windows 10/11, o Microsoft Edge ou Chrome abre em modo Janela de Aplicativo Nativo (--app=...) sem abas nem barra de endereços, igual ao VS Code
    exec(
      `start msedge --app="${appUrl}" --window-size=1400,900 || start chrome --app="${appUrl}" --window-size=1400,900 || start "" "${appUrl}"`
    );
    return;
  }

  if (platform === 'darwin') {
    // No macOS, tenta abrir como janela dedicada de aplicativo via Chrome/Edge/Brave ou abre o navegador padrão
    const macBrowsers = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];

    for (const bin of macBrowsers) {
      if (fs.existsSync(bin)) {
        const child = spawn(
          bin,
          [`--app=${appUrl}`, '--window-size=1400,900'],
          { detached: true, stdio: 'ignore' }
        );
        child.unref();
        return;
      }
    }

    exec(`open "${appUrl}"`);
    return;
  }

  // No Linux (Ubuntu, Debian, Fedora, Mint, Arch, etc.)
  const linuxCmd = [
    `google-chrome --app="${appUrl}" --window-size=1400,900`,
    `chromium --app="${appUrl}" --window-size=1400,900`,
    `chromium-browser --app="${appUrl}" --window-size=1400,900`,
    `microsoft-edge --app="${appUrl}" --window-size=1400,900`,
    `brave-browser --app="${appUrl}" --window-size=1400,900`,
    `xdg-open "${appUrl}"`,
  ].join(' || ');

  exec(linuxCmd);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const { server, baseFoldersPath } = createDesktopServer(ROOT_DIR);
  const preferredPort = Number(process.env.PORT) || 45678;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Se a porta 45678 já estiver aberta em outra instância, apenas abre a janela do aplicativo!
      const existingUrl = `http://127.0.0.1:${preferredPort}`;
      console.log(`Dislexia App já está em execução em ${existingUrl}`);
      launchDedicatedAppWindow(existingUrl);
      process.exit(0);
    } else {
      console.error('Erro ao iniciar servidor desktop:', err);
    }
  });

  server.listen(preferredPort, '127.0.0.1', () => {
    const appUrl = `http://127.0.0.1:${preferredPort}`;
    console.log('==========================================================');
    console.log('  Dislexia App — Modo Aplicativo de Computador (Desktop)');
    console.log('==========================================================');
    console.log(`• Sistema Operacional: ${os.platform()} (${os.arch()})`);
    console.log(`• Pastas físicas do aluno: ${baseFoldersPath}`);
    console.log(`• Endereço local do App: ${appUrl}`);
    console.log('• Mantenha esta janela minimizada enquanto usa o aplicativo.');
    console.log('==========================================================');

    if (!process.env.NO_WINDOW) {
      launchDedicatedAppWindow(appUrl);
    }
  });
}

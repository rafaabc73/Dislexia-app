const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

let mainWindow = null;
let serverInstance = null;

async function startEmbeddedServerAndWindow() {
  const rootDir = path.resolve(__dirname, '..');
  const { createDesktopServer } = await import('../scripts/start-desktop-app.mjs');
  const { server } = createDesktopServer(rootDir);
  serverInstance = server;

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 45678;
  const appUrl = `http://127.0.0.1:${port}`;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Dislexia App — Estudo Focado, Leitura e TDAH',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(appUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(startEmbeddedServerAndWindow);

app.on('window-all-closed', () => {
  if (serverInstance) {
    try {
      serverInstance.close();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    startEmbeddedServerAndWindow();
  }
});


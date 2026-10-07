const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

let mainWindow = null;

function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../dist/pwa-512x512.png'),
    path.join(__dirname, '../public/pwa-512x512.png'),
    path.join(app.getAppPath(), 'build/icon.png'),
    path.join(app.getAppPath(), 'dist/pwa-512x512.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function resolveIndexHtml() {
  const candidates = [
    path.join(__dirname, '../dist/index.html'),
    path.join(app.getAppPath(), 'dist/index.html'),
    path.join(process.resourcesPath, 'app/dist/index.html'),
    path.join(process.resourcesPath, 'dist/index.html'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(__dirname, '../dist/index.html');
}

function createWindow() {
  const appIcon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Records Money Time - Business Ledger',
    icon: appIcon,
    backgroundColor: '#FBFBFA',
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const localFile = resolveIndexHtml();
  const targetUrl = process.env.ELECTRON_START_URL;

  if (targetUrl) {
    mainWindow.loadURL(targetUrl).catch(() => {
      mainWindow.loadFile(localFile);
    });
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      mainWindow.loadFile(localFile);
    });
  } else {
    mainWindow.loadFile(localFile).catch((err) => {
      console.error('Failed to load local HTML file:', err);
    });
  }

  // Gracefully show window when ready, with fallback timeout
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1000);

  // Set dock icon on macOS if available
  if (process.platform === 'darwin' && app.dock && appIcon) {
    try {
      app.dock.setIcon(appIcon);
    } catch {}
  }

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS dock lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

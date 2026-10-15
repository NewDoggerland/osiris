import { app, BrowserWindow } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFreePort } from './lib/port.mjs';
import { waitForHealth } from './lib/health.mjs';
import { loadDesktopEnv } from './lib/env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL('data:text/html,<h1>Osiris desktop shell</h1>');
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setName('Osiris');

  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

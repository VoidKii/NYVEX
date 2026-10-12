'use strict';

const { app, BrowserWindow, session, shell } = require('electron');

const APP_URL = new URL(process.env.NYVEX_APP_URL || 'https://nyvex-kati.onrender.com/');
const TRUSTED_ORIGIN = APP_URL.origin;
const APP_ID = 'com.nyvex.agent';
let mainWindow;

app.setAppUserModelId(APP_ID);

function isTrustedUrl(value) {
  try {
    return new URL(value).origin === TRUSTED_ORIGIN;
  } catch {
    return false;
  }
}

function openExternalSafely(value) {
  try {
    const target = new URL(value);
    if (target.protocol === 'https:') {
      shell.openExternal(target.toString()).catch(() => {});
    }
  } catch {
    // Ignore malformed or unsupported navigation targets.
  }
}

function configureSessionPermissions() {
  const defaultSession = session.defaultSession;
  defaultSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    let requestingOrigin = '';
    try {
      requestingOrigin = new URL(details.requestingUrl || webContents.getURL()).origin;
    } catch {
      callback(false);
      return;
    }

    const mediaTypes = Array.isArray(details.mediaTypes) ? details.mediaTypes : [];
    const audioOnly = mediaTypes.length === 0 || (mediaTypes.includes('audio') && !mediaTypes.includes('video'));
    callback(requestingOrigin === TRUSTED_ORIGIN && permission === 'media' && audioOnly);
  });

  defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return requestingOrigin === TRUSTED_ORIGIN && permission === 'media';
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 920,
    minHeight: 640,
    title: 'NYVEX — AI Workspace',
    backgroundColor: '#0b0b0b',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: process.env.NYVEX_DEVTOOLS === '1'
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isTrustedUrl(url)) openExternalSafely(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTrustedUrl(url)) return;
    event.preventDefault();
    openExternalSafely(url);
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadURL(APP_URL.toString()).catch(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL('https://nyvex-kati.onrender.com/').catch(() => {});
    }
  });
}

app.whenReady().then(() => {
  configureSessionPermissions();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

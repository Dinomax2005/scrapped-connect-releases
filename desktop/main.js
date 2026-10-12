/* ============================================================================
 * SCRAPPED Connect — Desktop shell (Electron main process)
 * Handles: local file storage, native window, and the GitHub auto-updater.
 * ==========================================================================*/
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { autoUpdater } = require('./updater');

const APP_VERSION = require('../package.json').version;
const DATA_FILE = path.join(app.getPath('userData'), 'scrapped-connect-data.json');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

let mainWindow = null;

/* ------------------------------------------------------------ local storage */
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[SCRAPPED] failed to read workspace file:', err.message);
  }
  return null;
}

function persistState(data) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `workspace-${stamp}.json`));
      const backups = fs.readdirSync(BACKUP_DIR).sort();
      while (backups.length > 20) fs.unlinkSync(path.join(BACKUP_DIR, backups.shift()));
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, file: DATA_FILE };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* -------------------------------------------------------------------- window */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#090a0f',
    title: 'SCRAPPED Connect',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  const appRoot = app.isPackaged ? path.join(__dirname, '..') : path.join(__dirname, '..');
  mainWindow.loadFile(path.join(appRoot, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // External links open in the default browser, never inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildMenu() {
  const template = [
    {
      label: 'Studio',
      submenu: [
        { label: 'Open Workspace Folder', click: () => shell.openPath(app.getPath('userData')) },
        { label: 'Export Workspace Copy…', click: exportWorkspaceDialog },
        { type: 'separator' },
        { label: 'Check for Updates…', click: () => runUpdateCheck({ manual: true }) },
        { label: 'Relaunch App', click: () => { app.relaunch(); app.exit(0); } },
        { type: 'separator' },
        { role: 'quit', label: 'Exit SCRAPPED Connect' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: `Version ${APP_VERSION}`, enabled: false },
        { label: 'GitHub Releases', click: () => shell.openExternal('https://github.com/Dinomax2005/scrapped-connect-releases/releases') },
        { label: 'About SCRAPPED Connect', click: showAbout }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About SCRAPPED Connect',
    message: `SCRAPPED Connect v${APP_VERSION}`,
    detail: 'Serverless studio management, developer ranking and programming organizer for SCRAPPED studio.\n\n' +
      `Workspace file:\n${DATA_FILE}\n\nRuns fully offline — no SCRAPPED server involved.`,
    buttons: ['OK']
  });
}

function exportWorkspaceDialog() {
  const data = loadState();
  if (!data) {
    dialog.showMessageBox(mainWindow, { type: 'warning', message: 'No workspace to export yet.' });
    return;
  }
  const target = dialog.showSaveDialogSync(mainWindow, {
    title: 'Export SCRAPPED Connect workspace',
    defaultPath: `scrapped-connect-workspace-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON workspace', extensions: ['json'] }]
  });
  if (target) {
    fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');
    dialog.showMessageBox(mainWindow, { type: 'info', message: 'Workspace exported.', detail: target });
  }
}

/* --------------------------------------------------------------- auto update */
async function runUpdateCheck(opts) {
  const options = opts || {};
  const result = await autoUpdater.check({ currentVersion: app.getVersion() });
  if (options.manual) {
    if (result.error) {
      dialog.showMessageBox(mainWindow, { type: 'error', message: 'Update check failed', detail: result.error });
    } else if (result.updateAvailable) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'info',
        buttons: ['Install update now', 'Later'],
        defaultId: 0,
        message: `SCRAPPED Connect v${result.latestVersion} is available`,
        detail: `You are running v${app.getVersion()}.\n\n${(result.notes || 'No release notes.').slice(0, 600)}`
      });
      if (choice === 0) runUpdateApply({ version: result.latestVersion });
    } else {
      dialog.showMessageBox(mainWindow, { type: 'info', message: 'You are up to date.', detail: `Installed build: v${app.getVersion()}` });
    }
  }
  if (result.updateAvailable && options.auto) runUpdateApply({ version: result.latestVersion });
  return result;
}

async function runUpdateApply(payload) {
  const send = (message, type) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updater:status', { message, type });
  };
  send('Downloading SCRAPPED Connect update…', 'accent');
  const res = await autoUpdater.apply({
    onProgress: (pct, bytes, total) => {
      send(`Downloading update… ${pct}% (${(bytes / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB)`, 'accent');
    }
  });
  if (!res.ok) {
    send(`Update failed: ${res.error} — opening the release page instead.`, 'danger');
    shell.openExternal(res.releaseUrl || 'https://github.com/Dinomax2005/scrapped-connect-releases/releases');
    return res;
  }
  send('Update ready — restarting SCRAPPED Connect…', 'success');
  return res;
}

/* ----------------------------------------------------------------------- IPC */
ipcMain.handle('state:load', () => loadState());
ipcMain.handle('state:persist', (_evt, data) => persistState(data));
ipcMain.handle('state:file', () => DATA_FILE);
ipcMain.handle('app:openDataFolder', () => shell.openPath(app.getPath('userData')));
ipcMain.handle('app:relaunch', () => { app.relaunch(); app.exit(0); });
ipcMain.handle('app:setVersion', (_evt, v) => { APP_VERSION_LABEL = v; return true; });
ipcMain.handle('app:info', () => ({
  version: app.getVersion(), packaged: app.isPackaged, dataFile: DATA_FILE,
  platform: process.platform, arch: process.arch, electron: process.versions.electron,
  node: process.versions.node, os: `${os.type()} ${os.release()}`
}));
ipcMain.handle('updater:check', () => runUpdateCheck({}));
ipcMain.handle('updater:apply', (_evt, payload) => runUpdateApply(payload || {}));
ipcMain.handle('shell:openExternal', (_evt, url) => {
  if (/^https?:/i.test(String(url))) shell.openExternal(url);
  return true;
});

/* -------------------------------------------------------------------- startup */
let APP_VERSION_LABEL = app.getVersion();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    buildMenu();

    // Automatic update check shortly after launch (no dialogs unless available).
    setTimeout(async () => {
      const installed = loadState();
      const autoCheck = !(installed && installed.settings && installed.settings.autoUpdateCheck === false);
      if (!autoCheck) return;
      const autoApply = !!(installed && installed.settings && installed.settings.autoUpdateApply);
      const result = await runUpdateCheck({ auto: autoApply });
      if (result && result.updateAvailable && !autoApply && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:status', {
          message: `🚀 SCRAPPED Connect v${result.latestVersion} is available — open Updater & Setup .EXE to install it.`,
          type: 'accent', version: result.latestVersion
        });
      }
    }, 4500);

    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}

/* SCRAPPED Connect — secure bridge between the app UI and the desktop shell. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ScrappedDesktop', {
  isDesktop: true,
  platform: process.platform,
  loadState: () => ipcRenderer.invoke('state:load'),
  persist: (data) => ipcRenderer.invoke('state:persist', data),
  dataFile: () => ipcRenderer.invoke('state:file'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  setVersion: (v) => ipcRenderer.invoke('app:setVersion', v),
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  applyUpdate: (payload) => ipcRenderer.invoke('updater:apply', payload || {}),
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  onUpdateStatus: (cb) => {
    ipcRenderer.on('updater:status', (_evt, payload) => cb(payload));
  }
});

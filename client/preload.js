const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('QuizTownClient', {
  onVersion: cb => ipcRenderer.on('client-version', (_e,v)=>cb(v)),
  onUpdateStatus: cb => ipcRenderer.on('update-status', (_e,s)=>cb(s)),
  onForceUpdate: cb => ipcRenderer.on('force-update', (_e,i)=>cb(i)),
  setGameState: state => ipcRenderer.send('game-state', state),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  getDisplaySettings: () => ipcRenderer.invoke('get-display-settings'),
  applyDisplaySettings: opts => ipcRenderer.invoke('apply-display-settings', opts),
  saveAuthSession: s => ipcRenderer.invoke('store-set','authSession',s),
  loadAuthSession: () => ipcRenderer.invoke('store-get','authSession'),
  clearAuthSession: () => ipcRenderer.invoke('store-del','authSession'),
  saveCredential: s => ipcRenderer.invoke('store-set','credential',s),
  loadCredential: () => ipcRenderer.invoke('store-get','credential'),
  clearCredential: () => ipcRenderer.invoke('store-del','credential')
});

contextBridge.exposeInMainWorld('qtime', { onUpdateStatus: cb => ipcRenderer.on('update-status', (_e, msg) => cb(msg)) });

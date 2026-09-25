const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('qtime', {
  onUpdateStatus(callback) {
    ipcRenderer.on('update-status', (_event, message) => callback(message));
  }
});

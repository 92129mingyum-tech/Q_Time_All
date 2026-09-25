const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const fs = require('node:fs');

let mainWindow; let gameState = 'lobby'; let pendingUpdate = false;
function sendUpdate(message) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', message);
}

const storeFile=()=>path.join(app.getPath('userData'),'qtime-store.json');
function readStore(){try{return JSON.parse(fs.readFileSync(storeFile(),'utf8'))}catch{return {}}}
function writeStore(v){fs.writeFileSync(storeFile(),JSON.stringify(v,null,2),'utf8')}
function enc(v){const s=JSON.stringify(v);return safeStorage.isEncryptionAvailable()?{e:true,v:safeStorage.encryptString(s).toString('base64')}:{e:false,v:s}}
function dec(o){if(!o)return null;try{const s=o.e?safeStorage.decryptString(Buffer.from(o.v,'base64')):o.v;return JSON.parse(s)}catch{return null}}

ipcMain.on('game-state',(_e,s)=>{gameState=s||'lobby';if(gameState==='lobby'&&pendingUpdate){pendingUpdate=false;setTimeout(()=>autoUpdater.quitAndInstall(true,true),2000)}});
ipcMain.handle('toggle-fullscreen',()=>{mainWindow.setFullScreen(!mainWindow.isFullScreen());return mainWindow.isFullScreen()});
ipcMain.handle('get-display-settings',()=>({fullscreen:mainWindow.isFullScreen(),contentSize:mainWindow.getContentSize()}));
ipcMain.handle('apply-display-settings',(_e,o)=>{if(o?.mode==='fullscreen'){mainWindow.setFullScreen(true)}else{mainWindow.setFullScreen(false);const [w,h]=String(o?.resolution||'1280x720').split('x').map(Number);if(w&&h)mainWindow.setContentSize(w,h)}return true});
ipcMain.handle('store-set',(_e,k,v)=>{const s=readStore();s[k]=enc(v);writeStore(s);return true});
ipcMain.handle('store-get',(_e,k)=>dec(readStore()[k]));
ipcMain.handle('store-del',(_e,k)=>{const s=readStore();delete s[k];writeStore(s);return true});

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    title: 'Q-TIME',
    backgroundColor: '#102544',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  win.setMenuBarVisibility(false);
  mainWindow = win;
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('client-version', app.getVersion());
    if (!app.isPackaged) return;
    autoUpdater.checkForUpdates().catch(error => sendUpdate(`업데이트 확인 실패: ${error.message}`));
  });
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('update-not-available', () => sendUpdate({type:'current'}));
autoUpdater.on('update-available', info => sendUpdate({type:'available',version:info.version}));
autoUpdater.on('download-progress', progress => sendUpdate({type:'progress',percent:Math.floor(progress.percent)}));
autoUpdater.on('update-downloaded', info => {
  pendingUpdate=gameState!=='lobby';
  sendUpdate({type:'ready',version:info.version,deferred:pendingUpdate});
  if (!pendingUpdate) setTimeout(() => autoUpdater.quitAndInstall(true, true), 2000);
});
autoUpdater.on('error', error => sendUpdate({type:'error',message:error.message}));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');

let mainWindow;
function sendUpdate(message) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', message);
}

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
  win.loadFile(path.join(__dirname, 'index.html'));
  win.setMenuBarVisibility(false);
  mainWindow = win;
  win.webContents.once('did-finish-load', () => {
    if (!app.isPackaged) return sendUpdate('개발 모드: 업데이트 확인 생략');
    sendUpdate('업데이트 확인 중…');
    autoUpdater.checkForUpdates().catch(error => sendUpdate(`업데이트 확인 실패: ${error.message}`));
  });
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('update-not-available', () => sendUpdate('최신 버전입니다.'));
autoUpdater.on('update-available', info => sendUpdate(`v${info.version} 다운로드 중…`));
autoUpdater.on('download-progress', progress => sendUpdate(`업데이트 다운로드 중: ${Math.floor(progress.percent)}%`));
autoUpdater.on('update-downloaded', info => {
  sendUpdate(`v${info.version} 설치 준비 완료. 잠시 후 다시 실행됩니다.`);
  setTimeout(() => autoUpdater.quitAndInstall(false, true), 2000);
});
autoUpdater.on('error', error => sendUpdate(`업데이트 오류: ${error.message}`));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

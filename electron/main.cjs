const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5186');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

const configDir = path.join(app.getPath('userData'), 'config');
const modelsConfigPath = path.join(configDir, 'models.json');

function ensureConfigDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

ipcMain.handle('read-models-config', async () => {
  ensureConfigDir();
  try {
    if (fs.existsSync(modelsConfigPath)) {
      const data = fs.readFileSync(modelsConfigPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading models config:', error);
    return null;
  }
});

ipcMain.handle('write-models-config', async (event, config) => {
  ensureConfigDir();
  try {
    fs.writeFileSync(modelsConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing models config:', error);
    return false;
  }
});

ipcMain.handle('get-app-path', async () => {
  return app.getPath('userData');
});

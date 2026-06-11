const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

async function writeErrorLog(error, context = 'unknown') {
  const logPath = path.join(app.getPath('userData'), 'error.log');
  const timestamp = new Date().toISOString();
  const message = error?.stack || error?.message || JSON.stringify(error) || String(error);
  const logEntry = `[${timestamp}] [${context}] ${message}\n`;

  try {
    await fs.appendFile(logPath, logEntry, 'utf-8');
  } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

process.on('uncaughtException', error => {
  console.error('[main] uncaughtException:', error);
  writeErrorLog(error, 'uncaughtException');
});

process.on('unhandledRejection', reason => {
  console.error('[main] unhandledRejection:', reason);
  writeErrorLog(reason, 'unhandledRejection');
});

app.whenReady().then(() => {
  console.log('[main] app ready');
  console.log('[main] app path:', app.getAppPath());
  console.log('[main] userData path:', app.getPath('userData'));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-models', async () => {
  const userDataPath = app.getPath('userData');
  const targetFile = path.join(userDataPath, 'models.json');
  const defaultFile = path.join(__dirname, 'data', 'models.json');

  console.log('[get-models] userDataPath:', userDataPath);
  console.log('[get-models] targetFile:', targetFile);
  console.log('[get-models] defaultFile:', defaultFile);

  try {
    await fs.access(targetFile);
    console.log('[get-models] found userData models.json');
  } catch {
    console.log('[get-models] userData models.json not found, copying from project data');

    try {
      const defaultContent = await fs.readFile(defaultFile, 'utf-8');
      await fs.writeFile(targetFile, defaultContent, 'utf-8');
      console.log('[get-models] copied default models.json to userData');
    } catch (error) {
      console.error('[get-models] failed to copy default models.json:', error);
      await writeErrorLog(error, 'get-models:copy-default');
      return { code: -1, message: 'failed to copy default models.json', data: { list: [] } };
    }
  }

  try {
    const content = await fs.readFile(targetFile, 'utf-8');
    console.log('[get-models] raw file length:', content.length);

    const list = JSON.parse(content);
    console.log('[get-models] parsed models count:', Array.isArray(list) ? list.length : 'not array');

    if (!Array.isArray(list)) {
      return { code: -1, message: 'models.json is not an array', data: { list: [] } };
    }

    return { code: 0, message: 'ok', data: { list } };
  } catch (error) {
    console.error('[get-models] failed to read models.json:', error);
    await writeErrorLog(error, 'get-models:read');
    return { code: -1, message: 'failed to read models.json', data: { list: [] } };
  }
});

ipcMain.on('log-renderer-error', (_event, payload) => {
  console.error('[renderer-error]', payload);
  writeErrorLog(payload, payload?.source || 'renderer');
});

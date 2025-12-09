import { app, BrowserWindow } from 'electron';
import path from 'path';
import { startServer } from './server';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Start the Express server
  const serverUrl = await startServer();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app from the local server
  if (app.isPackaged) {
    // In production, load from the built files
    mainWindow.loadURL(serverUrl);
  } else {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
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
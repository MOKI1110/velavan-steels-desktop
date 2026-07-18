const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
autoUpdater.forceDevUpdateConfig = true;
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let isManualUpdateCheck = false;
app.setName('Velavan-Steels-Quotation');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Velavan Steels Quotation',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = path.join(__dirname, 'web', 'index.html');
  win.loadFile(startUrl);

  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates as soon as the app starts
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Auto Updater Event Listeners
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (isManualUpdateCheck) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. It is being downloaded in the background.`
    });
    isManualUpdateCheck = false;
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('No update available.');
  if (isManualUpdateCheck) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Up to Date',
      message: 'Your application is already up to date.'
    });
    isManualUpdateCheck = false;
  }
});

autoUpdater.on('error', (err) => {
  console.error('Error while checking for updates:', err);
  if (isManualUpdateCheck) {
    dialog.showMessageBox({
      type: 'error',
      title: 'Update Error',
      message: 'Error while checking for updates: ' + err.message
    });
    isManualUpdateCheck = false;
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send('update-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version has been downloaded. Restart the app to apply the update?',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// ✅ CHECK FOR UPDATES HANDLER
ipcMain.handle('check-updates', () => {
  isManualUpdateCheck = true;
  autoUpdater.checkForUpdatesAndNotify();
});

// ✅ SAVE PDF HANDLER
ipcMain.handle('save-pdf', async (event, buffer) => {
  const dir = 'C:\\QuotePDFs';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const fileName = `QT-${Date.now()}.pdf`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return filePath;
});


// ✅ PRINT TO PDF HANDLER
ipcMain.handle('print-to-pdf', async (event, brandName) => {
  const dir = 'C:\\QuotePDFs';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const safeBrand = (brandName || 'Unknown').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  const fileName  = `Quotation-${safeBrand}.pdf`;
  const filePath  = path.join(dir, fileName);

  const win     = BrowserWindow.getFocusedWindow();
  const pdfData = await win.webContents.printToPDF({
    printBackground: false,
    pageSize:        'A4',
    landscape:       false,
    marginsType:     0,
  });

  fs.writeFileSync(filePath, pdfData);
  return filePath;
});


// ✅ OPEN WHATSAPP + COPY FILE TO CLIPBOARD + OPEN FOLDER

ipcMain.handle('open-whatsapp', async (event, filePath) => {

  // ✅ Write PowerShell script to a temp file — avoids multiline/quote issues
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$files = New-Object System.Collections.Specialized.StringCollection
$files.Add("${filePath.replace(/\\/g, '\\\\')}")
[System.Windows.Forms.Clipboard]::SetFileDropList($files)
`;

  const tempScript = path.join(app.getPath('temp'), 'copy_clip.ps1');
  fs.writeFileSync(tempScript, psScript, 'utf8');

  // ✅ Run the script file — clean, no inline quoting issues
  await new Promise((resolve) => {
    exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tempScript}"`, (err, stdout, stderr) => {
      if (err) console.error('Clipboard error:', stderr);
      else console.log('✅ File copied to clipboard:', filePath);
      resolve(); // always continue even if clipboard fails
    });
  });

  shell.openExternal('whatsapp://');

});


// ✅ OPEN FOLDER ONLY (for Download PDF button)
ipcMain.handle('open-folder', async (event, filePath) => {
  setTimeout(() => {
    shell.showItemInFolder(filePath);
  }, 300);
});


// ✅ OPEN EMAIL (COPY TO CLIPBOARD + OPEN CLIENT)
ipcMain.handle('open-email', async (event, filePath, recipient) => {
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$files = New-Object System.Collections.Specialized.StringCollection
$files.Add("${filePath.replace(/\\/g, '\\\\')}")
[System.Windows.Forms.Clipboard]::SetFileDropList($files)
`;
  const tempScript = path.join(app.getPath('temp'), 'copy_clip_email.ps1');
  fs.writeFileSync(tempScript, psScript, 'utf8');

  await new Promise((resolve) => {
    exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tempScript}"`, () => resolve());
  });

  const subject = "Quotation";
  shell.openExternal(`mailto:${recipient || ''}?subject=${subject}`);
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  savePDF:      (buffer)    => ipcRenderer.invoke('save-pdf', buffer),

  printToPDF:   (brandName) => ipcRenderer.invoke('print-to-pdf', brandName),

  openWhatsApp: (filePath)  => ipcRenderer.invoke('open-whatsapp', filePath),

  openFolder:   (filePath)  => ipcRenderer.invoke('open-folder', filePath),

  openEmail:    (filePath, recipient) => ipcRenderer.invoke('open-email', filePath, recipient),

  checkUpdates: () => ipcRenderer.invoke('check-updates'),

  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value)),

});

const { contextBridge, ipcRenderer } = require('electron'); 
contextBridge.exposeInMainWorld('electronAPI', { getModels: () => ipcRenderer.invoke('get-models') }); 

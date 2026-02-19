const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readModelsConfig: () => ipcRenderer.invoke('read-models-config'),
  writeModelsConfig: (config) => ipcRenderer.invoke('write-models-config', config),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronDB', {
  execAsync: (sql) =>
    ipcRenderer.invoke('db:exec', sql),

  runAsync: (sql, params) =>
    ipcRenderer.invoke('db:run', sql, params),

  getAllAsync: (sql, params) =>
    ipcRenderer.invoke('db:getAll', sql, params),

  getFirstAsync: (sql, params) =>
    ipcRenderer.invoke('db:getFirst', sql, params),
});

contextBridge.exposeInMainWorld('electronFS', {
  importDB: () => ipcRenderer.invoke('fs:importDB'),
  exportDB: () => ipcRenderer.invoke('fs:exportDB'),
  readVcf: () => ipcRenderer.invoke('fs:readVcf'),
});

contextBridge.exposeInMainWorld('electronNotif', {
  checkBirthdays: () => ipcRenderer.invoke('notif:checkBirthdays'),
});

contextBridge.exposeInMainWorld('electronDrive', {
  readDBAsBase64: () => ipcRenderer.invoke('db:readAsBase64'),
  writeDBFromBase64: (base64) => ipcRenderer.invoke('db:writeFromBase64', base64),
});

contextBridge.exposeInMainWorld('electronAuth', {
  googleOAuth: (params) => ipcRenderer.invoke('auth:googleOAuth', params),
});

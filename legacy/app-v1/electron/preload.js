const { contextBridge, ipcRenderer } = require('electron');

/**
 * Context Bridge - Renderer 프로세스에 안전하게 API 노출
 * Context Isolation이 활성화된 상태에서 Node.js API 접근을 위한 브리지
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // Window Controls
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),

    // File System
    saveFile: (options) => ipcRenderer.invoke('fs:saveFile', options),
    openFile: () => ipcRenderer.invoke('fs:openFile'),

    // Platform Info
    platform: process.platform,
});

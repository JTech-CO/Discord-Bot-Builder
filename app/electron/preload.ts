// Runs sandboxed: only `electron`'s renderer APIs are available here.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { DesktopAPI } from '../src/platform/api';

const invoke = (channel: string, arg?: unknown) => ipcRenderer.invoke(channel, arg);

function subscribe<T>(channel: string) {
  return (cb: (value: T) => void) => {
    const listener = (_e: IpcRendererEvent, value: T) => cb(value);
    ipcRenderer.on(channel, listener);
    return () => void ipcRenderer.removeListener(channel, listener);
  };
}

const api: DesktopAPI = {
  platform: process.platform,
  ai: {
    keyLabel: () => invoke('ai:keyLabel'),
    setKey: (key) => invoke('ai:setKey', key),
    clearKey: () => invoke('ai:clearKey'),
    generate: (req) => invoke('ai:generate', req),
    cancel: () => invoke('ai:cancel'),
    onProgress: subscribe('ai:progress'),
  },
  project: {
    chooseFolder: (name) => invoke('project:chooseFolder', name),
    inspect: (dir) => invoke('project:inspect', dir),
    write: (dir, files) => invoke('project:write', { dir, files }),
    reveal: (dir) => invoke('project:reveal', dir),
  },
  env: {
    names: (dir) => invoke('env:names', dir),
    set: (dir, name, value) => invoke('env:set', { dir, name, value }),
    clear: (dir, name) => invoke('env:clear', { dir, name }),
  },
  bot: {
    node: () => invoke('bot:node'),
    start: (dir) => invoke('bot:start', dir),
    stop: () => invoke('bot:stop'),
    state: () => invoke('bot:state'),
    onState: subscribe('bot:state'),
    onLog: subscribe('bot:log'),
  },
};

contextBridge.exposeInMainWorld('dbb', api);

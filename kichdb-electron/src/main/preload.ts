import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getServerUrl: () => 'http://127.0.0.1:3030',
  getWsUrl: () => 'ws://127.0.0.1:3030/ws'
});

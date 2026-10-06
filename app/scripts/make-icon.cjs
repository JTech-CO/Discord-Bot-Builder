// Renders build/icon.svg to build/icon.png (1024×1024); electron-builder makes the Windows .ico and the macOS .icns from it.
// Run after changing the SVG: npm run icon
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const dir = join(__dirname, '..', 'build');
const SIZE = 1024;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: SIZE, height: SIZE, show: false, frame: false, transparent: true, webPreferences: { offscreen: true } });
  const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');
  await win.loadURL(`data:text/html,${encodeURIComponent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`)}`);
  await new Promise((r) => setTimeout(r, 300));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  writeFileSync(join(dir, 'icon.png'), image.resize({ width: SIZE, height: SIZE }).toPNG());
  console.log(`build/icon.png ${SIZE}×${SIZE}`);
  app.quit();
});

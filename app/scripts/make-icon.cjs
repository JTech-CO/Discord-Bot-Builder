// Renders build/icon.svg to build/icon.png (512×512); electron-builder makes the Windows .ico from it.
// Run after changing the SVG: npm run icon
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const dir = join(__dirname, '..', 'build');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 512, height: 512, show: false, frame: false, transparent: true, webPreferences: { offscreen: true } });
  const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');
  await win.loadURL(`data:text/html,${encodeURIComponent(`<style>html,body{margin:0;background:transparent}</style>${svg}`)}`);
  await new Promise((r) => setTimeout(r, 300));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  writeFileSync(join(dir, 'icon.png'), image.resize({ width: 512, height: 512 }).toPNG());
  app.quit();
});

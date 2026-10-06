import { defineConfig } from 'vite';

// Bundles the Electron main process and preload script to CommonJS.
// The preload runs sandboxed, so it must stay self-contained apart from `electron`.
// Dependencies are bundled too, so the installed app needs no node_modules.
export default defineConfig({
  ssr: { noExternal: true },
  build: {
    outDir: 'dist-electron',
    emptyOutDir: false, // cleaned by scripts/clean.mjs (see README: Node 25 rmSync issue)
    ssr: true,
    target: 'node22',
    minify: false,
    rollupOptions: {
      input: { main: 'electron/main.ts', preload: 'electron/preload.ts' },
      output: { format: 'cjs', entryFileNames: '[name].cjs' },
      external: ['electron'],
    },
  },
});

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// AI provider endpoints the web build may call directly with the user's own key.
const AI_ORIGINS = [
  'https://api.anthropic.com',
  'https://generativelanguage.googleapis.com',
  'https://api.openai.com',
];

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  `connect-src 'self' ${AI_ORIGINS.join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

// Dev mode needs inline scripts for React Fast Refresh, so the CSP is build-only.
function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  // Relative base so the same build loads from file:// inside Electron.
  base: './',
  plugins: [react(), tailwindcss(), cspPlugin()],
});

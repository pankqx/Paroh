import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

/**
 * The phone build (roadmap Phase 9): the same React renderer, started by `src/mobile-main/` instead of
 * Electron's preload. Capacitor wraps `out/mobile` (capacitor.config.ts).
 */
export default defineConfig({
  root: resolve(__dirname, 'src/mobile-main'),
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: [
      { find: '@assets', replacement: resolve(__dirname, 'assets') },
      // Desktop-only: keeps the speech worker and its WASM runtime out of the app package.
      { find: /^.*\/transcription\/transcribe$/, replacement: resolve(__dirname, 'src/mobile-main/stubs/transcribe.ts') },
    ],
  },
  plugins: [react()],
  build: { outDir: resolve(__dirname, 'out/mobile'), emptyOutDir: true, target: 'es2022' },
  server: { fs: { allow: [resolve(__dirname)] } },
});

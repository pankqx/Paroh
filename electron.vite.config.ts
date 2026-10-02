import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve(__dirname, 'src/main/index.ts') } } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve(__dirname, 'src/preload/bridge.ts') } } },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: { alias: { '@assets': resolve(__dirname, 'assets') } },
    build: { rollupOptions: { input: { index: resolve(__dirname, 'src/renderer/index.html') } } },
    plugins: [react()],
  },
});

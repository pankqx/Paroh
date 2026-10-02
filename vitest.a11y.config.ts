import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@assets': resolve(__dirname, 'assets') } },
  test: { include: ['tests/a11y/**/*.test.tsx'], environment: 'jsdom' },
});

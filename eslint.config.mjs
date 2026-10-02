import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['out/', 'dist/', 'node_modules/', 'vault/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Layer boundary (docs/coding-standards.md §4): the renderer reaches disk only through the preload bridge.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/main/**', 'fs', 'node:*', 'electron'], message: 'Renderer code must go through window.paroh (src/preload/bridge.ts).' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/renderer/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['react', 'react-dom', '**/features/**', '**/main/**', 'fs', 'node:*'], message: 'Domain code is pure: shared types only.' }] }],
    },
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'tests/**/*.ts', '*.config.{ts,mjs}'],
    languageOptions: { globals: globals.node },
  },
);

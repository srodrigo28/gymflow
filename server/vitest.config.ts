import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Um banco só: os arquivos rodam um depois do outro, e cada teste começa com as tabelas vazias.
    fileParallelism: false,
    globalSetup: ['./test/global-setup.ts'],
    hookTimeout: 60_000,
    setupFiles: ['./test/setup.ts'],
    testTimeout: 20_000,
  },
});

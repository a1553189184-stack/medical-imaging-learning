import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'assets/anatomy/runtime',
    emptyOutDir: true,
    target: 'es2022',
    lib: {entry:'src/anatomy-studio.js',formats:['es'],fileName:'anatomy'}
  }
});

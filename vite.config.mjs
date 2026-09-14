import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: { alias: { events: 'events/' } },
  worker: { format: 'es' },
  build: {
    outDir: 'assets/cornerstone',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      input: 'src/cornerstone-viewer.js',
      output: {
        entryFileNames: 'viewer.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});

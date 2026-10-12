import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    target: 'es2022',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'folio3d.js', cssFileName: 'folio3d' },
    rolldownOptions: { output: { chunkFileNames: 'chunks/[name]-[hash].js' } },
  },
});

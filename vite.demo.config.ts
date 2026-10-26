import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: 'demo',
  base: './',
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./demo/index.html', import.meta.url)),
        catalog: fileURLToPath(new URL('./demo/demos/catalog.html', import.meta.url)),
        portfolio: fileURLToPath(new URL('./demo/demos/portfolio.html', import.meta.url)),
        bookshelf: fileURLToPath(new URL('./demo/demos/bookshelf.html', import.meta.url)),
      },
    },
  },
});

import { defineConfig } from 'vite';
export default defineConfig({
  root: 'demo',
  base: './',
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: 'demo/index.html',
        catalog: 'demo/demos/catalog.html',
        portfolio: 'demo/demos/portfolio.html',
        bookshelf: 'demo/demos/bookshelf.html',
      },
    },
  },
});

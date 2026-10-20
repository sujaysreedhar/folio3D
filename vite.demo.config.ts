import { defineConfig } from 'vite';
export default defineConfig({
  root: 'demo',
  base: './',
  server: {
    // CI needs no live reload. Its socket can trigger the bundled Linux WebKit
    // network-process crash during cancellation: microsoft/playwright#42803.
    hmr: !process.env.CI,
    fs: { allow: ['..'] },
  },
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

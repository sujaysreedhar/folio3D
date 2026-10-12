import { defineConfig } from 'vite';
export default defineConfig({ root: 'demo', base: './', server: { fs: { allow: ['..'] } }, build: { outDir: '../demo-dist', emptyOutDir: true } });

import { defineConfig } from 'vite';

// Servi par l'API Node sous /3d/ en production ; proxy vers l'API en dev.
export default defineConfig({
  base: '/3d/',
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    proxy: {
      '/sessions': 'http://localhost:3000',
      '/dashboard': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});

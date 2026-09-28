import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  server: {
    port: 3006, // Using port 3006 as ports 3004-3005 are occupied
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:5001',
        ws: true
      }
    }
  },
  build: {
    outDir: '../dist'
  }
});

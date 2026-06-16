import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  test: {
    globals: true,
  },
  build: {
    outDir: 'build',
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:5001',
      '/health': 'http://localhost:5001',
    },
  },
});

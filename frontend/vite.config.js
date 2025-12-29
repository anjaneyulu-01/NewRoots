import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // backend runs on PORT from .env (default 5001 in this project)
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});

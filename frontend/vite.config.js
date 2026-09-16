import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env files so import.meta.env.VITE_API_BASE is populated natively
  // by Vite (any var prefixed with VITE_ is exposed to the client).
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8000',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});

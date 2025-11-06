import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '.sandbox.novita.ai',
      /^.*-iukw9njrdih7jga4yuix6-02b9cc79\.sandbox\.novita\.ai$/
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});

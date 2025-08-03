import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'axios': '/node_modules/axios/dist/axios.min.js'
    }
  },
  build: {
    rollupOptions: {
      external: ['axios'],
      output: {
        globals: {
          axios: 'axios'
        }
      }
    }
  }
});

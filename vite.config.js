import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['axios'],
      output: {
        globals: {
          'axios': 'axios' // هذا يحدد المتغير العام لـ axios
        }
      }
    }
  },
  resolve: {
    alias: {
      'axios': '/node_modules/axios/dist/axios.min.js' // تحديد المسار المطلق
    }
  }
});

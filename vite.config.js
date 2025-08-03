import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['axios']
  },
  build: {
    commonjsOptions: {
      include: [/axios/, /node_modules/]
    }
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['prop-types'], // أضف الحزم التي تريد استبعادها
      output: {
        globals: {
          'prop-types': 'PropTypes' // تعريف المتغير العام
        }
      }
    }
  },
  resolve: {
    alias: {
      'prop-types': '/node_modules/prop-types/prop-types.min.js' // مسار مباشر
    }
  }
});

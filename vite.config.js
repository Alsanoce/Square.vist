import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'uuid': 'uuid/dist/esm-node/index.js' // تغيير المسار هنا
    }
  }
})

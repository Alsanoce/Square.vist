export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['uuid'],
      output: {
        globals: {
          'uuid': 'uuid'
        }
      }
    }
  }
})

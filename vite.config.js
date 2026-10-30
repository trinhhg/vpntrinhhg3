import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('chart.js')) return 'vendor-chart';
            if (id.includes('quill')) return 'vendor-quill';
            if (id.includes('gridjs')) return 'vendor-grid';
            if (id.includes('sweetalert2')) return 'vendor-swal';
            return 'vendor-core';
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: false
  }
});

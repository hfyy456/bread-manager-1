import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // You can specify a port for the dev server
    open: true, // Automatically open the app in the browser
    proxy: {
      // Proxy API requests to your Express server
      // Adjust this if your API is on a different port or path
      '/api': {
        target: 'http://localhost:3001', // Assuming your Express server runs on 3001
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'build' // Output to the 'build' directory, similar to CRA
  }
}); 
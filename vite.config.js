import { defineConfig } from 'vite';

export default defineConfig({
  // Base public path
  base: '/',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/storage']
        }
      }
    }
  },
  
  // Development server
  server: {
    port: 3000,
    host: true
  },
  
  // Preview server
  preview: {
    port: 4173,
    host: true
  },
  
  // Environment variables - expose VITE_ prefixed vars
  envPrefix: 'VITE_',
  
  // Ensure proper handling of WebXR and Three.js
  optimizeDeps: {
    include: ['three', 'firebase/app', 'firebase/firestore', 'firebase/storage']
  }
});

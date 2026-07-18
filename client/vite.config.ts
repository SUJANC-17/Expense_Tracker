import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Show gzip-compressed sizes in the build report
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Use a function so we can match subpath imports like 'firebase/app'
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'vendor-firebase';
          if (id.includes('node_modules/recharts'))  return 'vendor-charts';
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) return 'vendor-motion';
          if (
            id.includes('node_modules/@mui') ||
            id.includes('node_modules/@emotion')
          ) return 'vendor-mui';
          if (id.includes('node_modules/react-dom'))  return 'vendor-react';
          if (id.includes('node_modules/react/'))     return 'vendor-react';
        },
      },
    },
  },
})


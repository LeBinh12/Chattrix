import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,      //  Quan trọng: mở cho mọi IP trong mạng LAN
    port: 5173,      // optional: giữ nguyên port
  },

  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: 'chat',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Keep remoteEntry.js at root, not in assets folder
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'remoteEntry') {
            return '[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: 'chat',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.tsx',
      },
      // Do not share React to avoid cross-version singleton issues
      shared: [],
    }),
  ],
  base: "/",
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
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

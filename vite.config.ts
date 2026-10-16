import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// El preview de React s'executa en un iframe aïllat (origen "null", vegeu preview.html): els seus
// mòduls es demanen amb CORS. Als orígens locals per defecte de Vite s'hi afegeix "null".
const previewCors = {
  origin: [/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, 'null'],
};

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    cors: previewCors,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'https://algorien.com',
        changeOrigin: true,
      }
    }
  },
  preview: {
    cors: previewCors,
  },
  build: {
    rollupOptions: {
      // preview.html: runtime del preview de React, que s'executa en un iframe aïllat
      input: {
        main: path.resolve(__dirname, 'index.html'),
        preview: path.resolve(__dirname, 'preview.html'),
      },
    },
    sourcemap: true,
    reportCompressedSize: true,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/material/styles',
      '@emotion/react',
      '@emotion/styled',
      'framer-motion',
    ],
  },
})
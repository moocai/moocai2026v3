import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Pyodide (Python real al navegador, per al botó "Executar") ===
// Els fitxers de Pyodide es serveixen des de la mateixa aplicació (sense CDN) a
// /pyodide/v<versió>/. La versió forma part de la ruta: es poden guardar a la memòria
// cau sense límit i, en actualitzar el paquet, el navegador demana els fitxers nous.
const PYODIDE_SRC = path.resolve(__dirname, 'node_modules/pyodide');
const PYODIDE_VERSION: string = JSON.parse(fs.readFileSync(path.join(PYODIDE_SRC, 'package.json'), 'utf8')).version;
const PYODIDE_DIR = `pyodide/v${PYODIDE_VERSION}/`;
const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
// Fitxers que Pyodide demana amb fetch en carregar-se, amb la seva mida: el worker
// en compta els bytes per mostrar el progrés de la primera càrrega.
const PYODIDE_FETCHED = ['pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const PYODIDE_SIZES = Object.fromEntries(PYODIDE_FETCHED.map((name) => [name, fs.statSync(path.join(PYODIDE_SRC, name)).size]));
const PYODIDE_TYPES: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.json': 'application/json',
};

function pyodideFiles(): Plugin {
  return {
    name: 'pyodide-files',
    configureServer(server) {
      server.middlewares.use(`/${PYODIDE_DIR}`, (req, res, next) => {
        const name = path.basename((req.url || '').split('?')[0]);
        if (!PYODIDE_FILES.includes(name)) return next();
        res.setHeader('Content-Type', PYODIDE_TYPES[path.extname(name)] || 'application/octet-stream');
        fs.createReadStream(path.join(PYODIDE_SRC, name)).pipe(res);
      });
    },
    generateBundle() {
      for (const name of PYODIDE_FILES) {
        this.emitFile({ type: 'asset', fileName: `${PYODIDE_DIR}${name}`, source: fs.readFileSync(path.join(PYODIDE_SRC, name)) });
      }
    },
  };
}

// El preview de React s'executa en un iframe aïllat (origen "null", vegeu preview.html): els seus
// mòduls es demanen amb CORS. Als orígens locals per defecte de Vite s'hi afegeix "null".
const previewCors = {
  origin: [/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, 'null'],
};

export default defineConfig({
  plugins: [
    react(),
    pyodideFiles(),
  ],
  define: {
    __PYODIDE_DIR__: JSON.stringify(PYODIDE_DIR),
    __PYODIDE_SIZES__: JSON.stringify(PYODIDE_SIZES),
  },
  // El worker de Python carrega Pyodide amb un import() dinàmic: cal format ES
  worker: {
    format: 'es',
  },
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
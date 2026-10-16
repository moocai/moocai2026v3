import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import crypto from 'crypto'
import fs from 'fs'
import https from 'https'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Proxy de l'API en desenvolupament (/api → algorien.com) ===
// Node prova les adreces del servidor (IPv6 i IPv4) amb només 250 ms per intent ("happy
// eyeballs"): amb una xarxa una mica lenta totes caduquen i la petició falla amb
// `AggregateError [ETIMEDOUT]` encara que el servidor estigui bé. Es dona més marge a cada
// intent i les connexions es reutilitzen (keep-alive) en lloc d'obrir-ne una de nova
// (TCP + TLS) per a cada petició, de manera que es connecta molt menys sovint.
net.setDefaultAutoSelectFamilyAttemptTimeout?.(2000);
const apiProxyAgent = new https.Agent({ keepAlive: true, maxSockets: 16 });

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
  '.whl': 'application/zip',
};

// === Paquets de Python (numpy...) ===
// Es serveixen al costat de Pyodide, però no es baixen mai si el programa no els importa:
// el worker els carrega en trobar-ne l'`import`. No vénen amb el paquet npm de Pyodide:
// en arrencar `vite` o fer `vite build` es baixen (un cop, a node_modules/.cache) de la
// distribució oficial d'aquesta mateixa versió i es comproven amb el sha256 de
// pyodide-lock.json (que Pyodide també comprova en carregar-los).
const PYODIDE_PACKAGES = ['numpy'];
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_PACKAGES_CACHE = path.resolve(__dirname, `node_modules/.cache/pyodide-packages/v${PYODIDE_VERSION}`);

type LockPackage = { name: string; file_name: string; sha256: string; depends: string[]; imports: string[] };
const PYODIDE_LOCK: Record<string, LockPackage> = JSON.parse(fs.readFileSync(path.join(PYODIDE_SRC, 'pyodide-lock.json'), 'utf8')).packages;

/** Els paquets demanats i les seves dependències (tal com les diu pyodide-lock.json). */
function packageClosure(names: string[]): LockPackage[] {
  const seen = new Map<string, LockPackage>();
  const visit = (name: string) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    const pkg = PYODIDE_LOCK[key];
    if (!pkg) throw new Error(`[pyodide] El paquet "${name}" no és a la distribució de Pyodide ${PYODIDE_VERSION}`);
    seen.set(key, pkg);
    pkg.depends.forEach(visit);
  };
  names.forEach(visit);
  return [...seen.values()];
}
const HOSTED_PACKAGES = packageClosure(PYODIDE_PACKAGES);
const HOSTED_FILES = new Set(HOSTED_PACKAGES.map((p) => p.file_name));
// Per al worker: `import x` → paquet que el porta. Els que són a la distribució però no
// se serveixen es diuen com a "no disponibles" (en lloc del missatge de Pyodide, que
// proposa instal·lar-los amb micropip).
const PYTHON_PACKAGES = {
  hosted: Object.fromEntries(HOSTED_PACKAGES.flatMap((p) => p.imports.map((m) => [m, p.name]))),
  unavailable: [...new Set(Object.values(PYODIDE_LOCK)
    .filter((p) => !HOSTED_FILES.has(p.file_name))
    .flatMap((p) => p.imports))].sort(),
};

const sha256 = (data: Buffer) => crypto.createHash('sha256').update(data).digest('hex');

/** Baixa (si no hi són ja) els fitxers dels paquets a la memòria cau i en comprova el sha256. */
async function ensurePyodidePackages(): Promise<string[]> {
  fs.mkdirSync(PYODIDE_PACKAGES_CACHE, { recursive: true });
  const failed: string[] = [];
  for (const pkg of HOSTED_PACKAGES) {
    const target = path.join(PYODIDE_PACKAGES_CACHE, pkg.file_name);
    if (fs.existsSync(target) && sha256(fs.readFileSync(target)) === pkg.sha256) continue;
    try {
      const res = await fetch(PYODIDE_CDN + pkg.file_name);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = Buffer.from(await res.arrayBuffer());
      if (sha256(data) !== pkg.sha256) throw new Error('sha256 diferent del de pyodide-lock.json');
      fs.writeFileSync(target, data);
    } catch (err) {
      failed.push(`${pkg.file_name} (${(err as Error).message})`);
    }
  }
  return failed;
}

function pyodideFiles(): Plugin {
  return {
    name: 'pyodide-files',
    async buildStart() {
      const failed = await ensurePyodidePackages();
      if (!failed.length) {
        this.info(`[pyodide] Paquets disponibles en importar-los: ${PYODIDE_PACKAGES.join(', ')}`);
        return;
      }
      const detail = `[pyodide] No s'han pogut baixar de ${PYODIDE_CDN}: ${failed.join(', ')}`;
      // Una versió publicada sense numpy fallaria en silenci a les mans de l'alumnat: el build
      // s'atura (si de debò no hi ha xarxa, MOOC_SKIP_PYTHON_PACKAGES=1 el deixa continuar).
      // En desenvolupament només s'avisa: importar-los donarà un error de càrrega.
      if (this.meta.watchMode || process.env.MOOC_SKIP_PYTHON_PACKAGES === '1') this.warn(detail);
      else this.error(detail);
    },
    configureServer(server) {
      server.middlewares.use(`/${PYODIDE_DIR}`, (req, res, next) => {
        const name = path.basename((req.url || '').split('?')[0]);
        const file = PYODIDE_FILES.includes(name) ? path.join(PYODIDE_SRC, name)
          : HOSTED_FILES.has(name) ? path.join(PYODIDE_PACKAGES_CACHE, name) : null;
        if (!file) return next();
        // Paquet no baixat: un 404 net (si no, el servidor respondria amb la pàgina de l'app)
        if (!fs.existsSync(file)) { res.statusCode = 404; res.end(); return; }
        res.setHeader('Content-Type', PYODIDE_TYPES[path.extname(name)] || 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const name of PYODIDE_FILES) {
        this.emitFile({ type: 'asset', fileName: `${PYODIDE_DIR}${name}`, source: fs.readFileSync(path.join(PYODIDE_SRC, name)) });
      }
      for (const name of HOSTED_FILES) {
        const file = path.join(PYODIDE_PACKAGES_CACHE, name);
        if (fs.existsSync(file)) this.emitFile({ type: 'asset', fileName: `${PYODIDE_DIR}${name}`, source: fs.readFileSync(file) });
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
    __PYTHON_PACKAGES__: JSON.stringify(PYTHON_PACKAGES),
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
        agent: apiProxyAgent,
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
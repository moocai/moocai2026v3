// Worker que executa codi Python real amb Pyodide (CPython compilat a WebAssembly).
// Viu en un fil a part: la pàgina no es bloqueja mentre el codi s'executa i, si el
// programa no acaba (bucle infinit), el fil principal pot aturar-lo eliminant el worker.
//
// input(): Python s'ha d'aturar fins que l'alumne escriu la resposta a la consola. Un
// worker només pot esperar de manera síncrona amb una petició XHR síncrona: la fa a una
// URL que intercepta el service worker `python-input-sw.js`, que no respon fins que la
// pàgina li passa el text escrit (vegeu `services/pythonRunner.ts`).
import type { PyodideInterface } from 'pyodide';

export type RunnerRequest =
  | { type: 'init'; indexURL: string; sizes: Record<string, number> }
  | { type: 'run'; id: number; code: string; inputURL: string | null; inputUnavailable: string };

export type RunnerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  | { type: 'output'; id: number; chunks: Array<{ stream: 'stdout' | 'stderr'; text: string }> }
  | { type: 'input-request'; id: number; requestId: string; prompt: string }
  | { type: 'done'; id: number; ok: boolean };

const ctx = self as unknown as {
  postMessage(message: RunnerResponse): void;
  onmessage: ((event: MessageEvent<RunnerRequest>) => void) | null;
  fetch: typeof fetch;
};

// Executa el codi de l'alumne com a `main.py`, en un espai de noms nou a cada execució,
// i escriu el traceback a stderr sense els marcs interns d'aquest embolcall.
// input() es substitueix per una versió que mostra el text a la consola i espera la resposta.
const RUNNER_SOURCE = `
import builtins, linecache, sys, traceback
from __mooc_js import read_input as __mooc_read_input

def __mooc_input(prompt=''):
    sys.stdout.flush()
    sys.stderr.flush()
    value = __mooc_read_input(str(prompt))
    if value is None:
        raise EOFError('EOF when reading a line')
    return value

builtins.input = __mooc_input

def __mooc_run(src):
    namespace = {'__name__': '__main__', '__builtins__': builtins}
    # Perquè el traceback mostri també la línia de codi que ha fallat
    linecache.cache['main.py'] = (len(src), None, src.splitlines(True), 'main.py')
    try:
        exec(compile(src, 'main.py', 'exec'), namespace)
        return True
    except SystemExit as e:
        if e.code in (None, 0):
            return True
        print(e.code if isinstance(e.code, str) else f'SystemExit: {e.code}', file=sys.stderr)
        return False
    except BaseException as e:
        tb = e.__traceback__.tb_next if e.__traceback__ else None
        sys.stderr.write(''.join(traceback.format_exception(type(e), e, tb)))
        return False
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
`;

// La sortida s'agrupa abans d'enviar-la: un print dins d'un bucle llarg no ha de
// generar milers de missatges. Mentre Python s'executa els temporitzadors del worker
// no corren, així que el buidatge periòdic es fa des del mateix callback de sortida.
const FLUSH_INTERVAL_MS = 50;
let currentRunId = 0;
let pending: Array<{ stream: 'stdout' | 'stderr'; text: string }> = [];
let lastFlush = 0;

function flush() {
  if (pending.length) ctx.postMessage({ type: 'output', id: currentRunId, chunks: pending });
  pending = [];
  lastFlush = Date.now();
}

// Fragments de text tal com Python els escriu (no línies senceres): la pàgina els
// enganxa. Els fragments seguits del mateix flux s'ajunten en un de sol.
function write(stream: 'stdout' | 'stderr', text: string) {
  if (!text) return;
  const last = pending[pending.length - 1];
  if (last && last.stream === stream) last.text += text;
  else pending.push({ stream, text });
  if (Date.now() - lastFlush >= FLUSH_INTERVAL_MS) flush();
}

// Escriptors de bytes: amb `isatty` Python fa servir memòria intermèdia per línies i
// buida en cada salt de línia (o en fer flush, p. ex. abans d'un input()), així el que
// s'escriu amb print(..., end='') també apareix a temps.
function writer(stream: 'stdout' | 'stderr') {
  const decoder = new TextDecoder();
  return {
    isatty: true,
    write(buffer: Uint8Array) {
      write(stream, decoder.decode(buffer, { stream: true }));
      return buffer.length;
    },
  };
}

// === input() ===
let inputURL: string | null = null;
let inputUnavailable = '';
let inputSeq = 0;

/** Demana una línia a l'alumne i espera (bloquejant) la resposta. `null` = sense resposta (EOF). */
function readInput(prompt: string): string | null {
  flush();
  if (!inputURL) {
    write('stderr', inputUnavailable);
    flush();
    return null;
  }
  const requestId = `${currentRunId}-${++inputSeq}`;
  ctx.postMessage({ type: 'input-request', id: currentRunId, requestId, prompt });
  // El service worker respon amb {retry: true} cada pocs segons perquè el navegador no
  // talli una petició massa llarga; es torna a preguntar fins que hi ha resposta.
  for (;;) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', inputURL, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ requestId }));
    if (xhr.status !== 200) {
      write('stderr', inputUnavailable);
      flush();
      return null;
    }
    const data = JSON.parse(xhr.responseText);
    if (data.retry) continue;
    return typeof data.value === 'string' ? data.value : null;
  }
}

// === Càrrega amb progrés ===
// Els fitxers grans de Pyodide (sobretot el .wasm) triguen a baixar la primera vegada:
// es compten els bytes rebuts perquè la pàgina pugui mostrar un percentatge.
function trackDownloads(indexURL: string, sizes: Record<string, number>) {
  const total = Object.values(sizes).reduce((a, b) => a + b, 0);
  let loaded = 0;
  let lastReport = 0;
  const report = (force = false) => {
    const now = Date.now();
    if (!force && now - lastReport < 150) return;
    lastReport = now;
    ctx.postMessage({ type: 'progress', loaded: Math.min(loaded, total), total });
  };
  const originalFetch = ctx.fetch.bind(ctx);
  ctx.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const name = url.startsWith(indexURL) ? url.slice(indexURL.length).split('?')[0] : '';
    if (!(name in sizes) || !response.ok || !response.body) return response;
    const reader = response.body.getReader();
    const counted = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) { report(true); controller.close(); return; }
        loaded += value.byteLength;
        report();
        controller.enqueue(value);
      },
      cancel(reason) { return reader.cancel(reason); },
    });
    // Mateixes capçaleres (p. ex. application/wasm, que permet compilar en streaming)
    return new Response(counted, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
  report(true);
}

let pyodidePromise: Promise<PyodideInterface> | null = null;
let runFn: ((src: string) => boolean) | null = null;

async function init(indexURL: string, sizes: Record<string, number>): Promise<PyodideInterface> {
  trackDownloads(indexURL, sizes);
  // Es carrega des de la carpeta servida per l'app (no s'empaqueta amb Vite)
  const { loadPyodide } = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`);
  const pyodide: PyodideInterface = await loadPyodide({ indexURL });
  pyodide.setStdout(writer('stdout'));
  pyodide.setStderr(writer('stderr'));
  // sys.stdin directe (sys.stdin.readline()) també demana la línia a la consola
  pyodide.setStdin({ stdin: () => readInput(''), isatty: true });
  pyodide.registerJsModule('__mooc_js', { read_input: readInput });
  pyodide.runPython(RUNNER_SOURCE);
  runFn = pyodide.globals.get('__mooc_run');
  return pyodide;
}

ctx.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    if (!pyodidePromise) pyodidePromise = init(msg.indexURL, msg.sizes);
    try {
      await pyodidePromise;
      ctx.postMessage({ type: 'ready' });
    } catch (err: any) {
      pyodidePromise = null;
      ctx.postMessage({ type: 'init-error', message: String(err?.message || err) });
    }
    return;
  }

  if (msg.type === 'run') {
    await pyodidePromise;
    currentRunId = msg.id;
    inputURL = msg.inputURL;
    inputUnavailable = msg.inputUnavailable;
    pending = [];
    lastFlush = Date.now();
    let ok = false;
    try {
      ok = !!runFn!(msg.code);
    } catch (err: any) {
      write('stderr', String(err?.message || err));
    }
    flush();
    ctx.postMessage({ type: 'done', id: msg.id, ok });
  }
};

// Worker que executa codi Python real amb Pyodide (CPython compilat a WebAssembly).
// Viu en un fil a part: la pàgina no es bloqueja mentre el codi s'executa i, si el
// programa no acaba (bucle infinit), el fil principal pot aturar-lo eliminant el worker.
import type { PyodideInterface } from 'pyodide';

export type RunnerRequest =
  | { type: 'init'; indexURL: string }
  | { type: 'run'; id: number; code: string; stdin: string };

export type RunnerResponse =
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  | { type: 'output'; id: number; chunks: Array<{ stream: 'stdout' | 'stderr'; text: string }> }
  | { type: 'done'; id: number; ok: boolean };

const ctx = self as unknown as {
  postMessage(message: RunnerResponse): void;
  onmessage: ((event: MessageEvent<RunnerRequest>) => void) | null;
};

// Executa el codi de l'alumne com a `main.py`, en un espai de noms nou a cada execució,
// i escriu el traceback a stderr sense els marcs interns d'aquest embolcall.
const RUNNER_SOURCE = `
import linecache, sys, traceback

def __mooc_run(src):
    namespace = {'__name__': '__main__', '__builtins__': __builtins__}
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

function write(stream: 'stdout' | 'stderr', text: string) {
  pending.push({ stream, text });
  if (Date.now() - lastFlush >= FLUSH_INTERVAL_MS) flush();
}

let pyodidePromise: Promise<PyodideInterface> | null = null;
let runFn: ((src: string) => boolean) | null = null;

async function init(indexURL: string): Promise<PyodideInterface> {
  // Es carrega des de la carpeta servida per l'app (no s'empaqueta amb Vite)
  const { loadPyodide } = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`);
  const pyodide: PyodideInterface = await loadPyodide({ indexURL });
  pyodide.setStdout({ batched: (text: string) => write('stdout', text) });
  pyodide.setStderr({ batched: (text: string) => write('stderr', text) });
  pyodide.runPython(RUNNER_SOURCE);
  runFn = pyodide.globals.get('__mooc_run');
  return pyodide;
}

ctx.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    if (!pyodidePromise) pyodidePromise = init(msg.indexURL);
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
    const pyodide = await pyodidePromise!;
    currentRunId = msg.id;
    pending = [];
    lastFlush = Date.now();
    // Cada input() llegeix la línia següent del quadre "Entrada"; en acabar-se, EOF.
    const lines = msg.stdin.length ? msg.stdin.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n') : [];
    pyodide.setStdin({ stdin: () => (lines.length ? lines.shift()! : null) });
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

// Execució de Python al navegador (botó "Executar" dels problemes de codi).
// Fa servir Pyodide (CPython real) dins d'un Web Worker: la sortida i els errors són
// els mateixos que els de Python, i un programa que no acaba es pot aturar.
import type { RunnerRequest, RunnerResponse } from '../workers/pythonRunner.worker';

export type PythonStream = 'stdout' | 'stderr';
export type PythonRunStatus = 'ok' | 'error' | 'stopped' | 'timeout' | 'load-error';

export interface PythonRunOptions {
  /** Text del quadre "Entrada": cada input() en llegeix una línia. */
  stdin?: string;
  /** Rep la sortida a mesura que el programa l'escriu. */
  onOutput?: (chunks: Array<{ stream: PythonStream; text: string }>) => void;
  /** Temps màxim d'execució (sense comptar la càrrega de Python). */
  timeoutMs?: number;
}

export const DEFAULT_PYTHON_TIMEOUT_MS = 15000;

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let ready = false;
let nextRunId = 1;
let activeRun: { id: number; finish: (status: PythonRunStatus) => void; onOutput?: PythonRunOptions['onOutput'] } | null = null;

const indexURL = () => new URL(`${import.meta.env.BASE_URL}${__PYODIDE_DIR__}`, window.location.origin).href;

function send(message: RunnerRequest) {
  worker!.postMessage(message);
}

function startWorker(): Promise<void> {
  const w = new Worker(new URL('../workers/pythonRunner.worker.ts', import.meta.url), { type: 'module' });
  worker = w;
  ready = false;
  readyPromise = new Promise<void>((resolve, reject) => {
    w.onmessage = (event: MessageEvent<RunnerResponse>) => {
      const msg = event.data;
      if (msg.type === 'ready') { ready = true; resolve(); return; }
      if (msg.type === 'init-error') { reject(new Error(msg.message)); return; }
      if (!activeRun || msg.id !== activeRun.id) return;
      if (msg.type === 'output') activeRun.onOutput?.(msg.chunks);
      else if (msg.type === 'done') activeRun.finish(msg.ok ? 'ok' : 'error');
    };
    w.onerror = (event) => reject(new Error(event.message || 'Python worker error'));
  });
  // Si la càrrega falla (sense connexió...), el pròxim intent tornarà a començar
  readyPromise.catch(() => { if (worker === w) discardWorker(); });
  send({ type: 'init', indexURL: indexURL() });
  return readyPromise;
}

function discardWorker() {
  worker?.terminate();
  worker = null;
  readyPromise = null;
  ready = false;
}

/** Comença a carregar Python en segon pla (uns quants MB; després queda a la memòria cau). */
export function preloadPython(): Promise<void> {
  return readyPromise ?? startWorker();
}

/** `true` si Python ja està carregat i una execució començarà a l'instant. */
export function isPythonReady(): boolean {
  return ready;
}

/** `true` mentre hi ha un programa en execució. */
export function isPythonRunning(): boolean {
  return activeRun !== null;
}

/**
 * Executa `code` i resol quan acaba, amb l'estat final. Només hi ha una execució
 * alhora: si n'hi ha una en marxa, s'atura abans de començar la nova.
 */
export async function runPython(code: string, options: PythonRunOptions = {}): Promise<PythonRunStatus> {
  if (activeRun) stopPython();
  const id = nextRunId++;
  let finish!: (status: PythonRunStatus) => void;
  const done = new Promise<PythonRunStatus>((resolve) => { finish = resolve; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  activeRun = {
    id,
    onOutput: options.onOutput,
    finish: (status) => {
      if (activeRun?.id !== id) return;
      activeRun = null;
      clearTimeout(timer);
      finish(status);
    },
  };
  const run = activeRun;

  try {
    await preloadPython();
  } catch {
    run.finish('load-error');
    return done;
  }
  if (activeRun !== run) return done; // aturat mentre es carregava

  send({ type: 'run', id, code, stdin: options.stdin ?? '' });
  timer = setTimeout(() => {
    if (activeRun?.id !== id) return;
    run.finish('timeout');
    restartWorker();
  }, options.timeoutMs ?? DEFAULT_PYTHON_TIMEOUT_MS);
  return done;
}

/** Atura l'execució en curs (p. ex. un bucle infinit) i prepara un Python nou. */
export function stopPython(): void {
  const run = activeRun;
  if (!run) return;
  run.finish('stopped');
  // Encara carregant: no hi ha res en execució, es deixa acabar la càrrega
  if (ready) restartWorker();
}

// Python no es pot interrompre des de fora: s'elimina el worker i se'n crea un altre
// (els fitxers ja són a la memòria cau, així que torna a estar a punt de seguida).
function restartWorker() {
  discardWorker();
  void preloadPython().catch(() => { /* es reintentarà a la pròxima execució */ });
}

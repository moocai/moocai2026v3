// Execució de Python al navegador (botó "Executar" dels problemes de codi).
// Fa servir Pyodide (CPython real) dins d'un Web Worker: la sortida i els errors són
// els mateixos que els de Python, i un programa que no acaba es pot aturar.
// input() es respon des de la consola: vegeu `answerPythonInput` i `public/python-input-sw.js`.
import type { RunnerRequest, RunnerResponse } from '../workers/pythonRunner.worker';

export type PythonStream = 'stdout' | 'stderr';
export type PythonRunStatus = 'ok' | 'error' | 'stopped' | 'timeout' | 'load-error';

export interface PythonRunResult {
  status: PythonRunStatus;
  /** Detall de l'error quan `status` és 'load-error'. */
  error?: string;
}

export interface PythonRunOptions {
  /** Rep la sortida a mesura que el programa l'escriu. */
  onOutput?: (chunks: Array<{ stream: PythonStream; text: string }>) => void;
  /** El programa ha cridat input(): cal demanar una línia i respondre amb `answerPythonInput`. */
  onInputRequest?: (prompt: string) => void;
  /** Progrés de la càrrega de Python (només si encara no està carregat). */
  onLoadProgress?: (loaded: number, total: number) => void;
  /** Text que es mostra si input() no es pot fer servir en aquest navegador. */
  inputUnavailableMessage?: string;
  /** Temps màxim d'execució (sense comptar la càrrega ni l'espera d'input()). */
  timeoutMs?: number;
}

export const DEFAULT_PYTHON_TIMEOUT_MS = 15000;

const BASE = import.meta.env.BASE_URL;
const INPUT_URL = `${BASE}__mooc_python_input__`;

interface ActiveRun {
  id: number;
  options: PythonRunOptions;
  timer?: ReturnType<typeof setTimeout>;
  waitingInput: string | null;
  finish: (result: PythonRunResult) => void;
}

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let ready = false;
let inputAvailable = false;
let nextRunId = 1;
let activeRun: ActiveRun | null = null;
const progressListeners = new Set<(loaded: number, total: number) => void>();

// === Canal d'input(): service worker ===
// El worker de Python queda aturat en una petició síncrona que el service worker
// respon quan la pàgina li passa el text. El service worker ha de controlar la pàgina
// abans de crear el worker (el worker hereta el controlador en crear-se).
let inputChannelPromise: Promise<boolean> | null = null;

function setupInputChannel(): Promise<boolean> {
  if (!inputChannelPromise) {
    inputChannelPromise = (async () => {
      if (!('serviceWorker' in navigator) || !window.isSecureContext) return false;
      try {
        await navigator.serviceWorker.register(`${BASE}python-input-sw.js`, { scope: BASE });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 3000);
            navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(timer); resolve(); }, { once: true });
          });
        }
        return !!navigator.serviceWorker.controller;
      } catch (err) {
        console.warn('[python] input() no disponible: no s\'ha pogut registrar el service worker', err);
        return false;
      }
    })();
  }
  return inputChannelPromise;
}

// === Worker ===
const indexURL = () => new URL(`${BASE}${__PYODIDE_DIR__}`, window.location.origin).href;

function send(message: RunnerRequest) {
  worker!.postMessage(message);
}

function startWorker(): Promise<void> {
  ready = false;
  const promise = (async () => {
    inputAvailable = await setupInputChannel();
    const w = new Worker(new URL('../workers/pythonRunner.worker.ts', import.meta.url), { type: 'module' });
    worker = w;
    await new Promise<void>((resolve, reject) => {
      w.onmessage = (event: MessageEvent<RunnerResponse>) => handleMessage(event.data, resolve, reject);
      w.onerror = (event) => reject(new Error(event.message || 'No s\'ha pogut iniciar el worker de Python'));
      send({ type: 'init', indexURL: indexURL(), sizes: __PYODIDE_SIZES__ });
    });
    ready = true;
  })();
  readyPromise = promise;
  // Si la càrrega falla (sense connexió...), el pròxim intent tornarà a començar
  promise.catch((err) => {
    console.error('[python] error en carregar Pyodide:', err);
    if (readyPromise === promise) discardWorker();
  });
  return promise;
}

function handleMessage(msg: RunnerResponse, resolve: () => void, reject: (err: Error) => void) {
  if (msg.type === 'progress') { progressListeners.forEach((cb) => cb(msg.loaded, msg.total)); return; }
  if (msg.type === 'ready') { resolve(); return; }
  if (msg.type === 'init-error') { reject(new Error(msg.message)); return; }
  const run = activeRun;
  if (!run || msg.id !== run.id) return;
  if (msg.type === 'output') {
    run.options.onOutput?.(msg.chunks);
  } else if (msg.type === 'input-request') {
    // Mentre l'alumne escriu, no corre el temps límit
    clearTimeout(run.timer);
    run.waitingInput = msg.requestId;
    run.options.onInputRequest?.(msg.prompt);
  } else if (msg.type === 'done') {
    run.finish({ status: msg.ok ? 'ok' : 'error' });
  }
}

function discardWorker() {
  worker?.terminate();
  worker = null;
  readyPromise = null;
  ready = false;
}

function startTimer(run: ActiveRun) {
  clearTimeout(run.timer);
  run.timer = setTimeout(() => {
    if (activeRun !== run) return;
    run.finish({ status: 'timeout' });
    restartWorker();
  }, run.options.timeoutMs ?? DEFAULT_PYTHON_TIMEOUT_MS);
}

/** Comença a carregar Python en segon pla (uns quants MB; després queda a la memòria cau). */
export function preloadPython(): Promise<void> {
  return readyPromise ?? startWorker();
}

/** `true` si Python ja està carregat i una execució començarà a l'instant. */
export function isPythonReady(): boolean {
  return ready;
}

/**
 * Executa `code` i resol quan acaba, amb l'estat final. Només hi ha una execució
 * alhora: si n'hi ha una en marxa, s'atura abans de començar la nova.
 */
export function runPython(code: string, options: PythonRunOptions = {}): Promise<PythonRunResult> {
  if (activeRun) stopPython();
  let resolveDone!: (result: PythonRunResult) => void;
  const done = new Promise<PythonRunResult>((resolve) => { resolveDone = resolve; });
  const run: ActiveRun = {
    id: nextRunId++,
    options,
    waitingInput: null,
    finish: (result) => {
      if (activeRun !== run) return;
      activeRun = null;
      clearTimeout(run.timer);
      progressListeners.delete(onProgress);
      resolveDone(result);
    },
  };
  const onProgress = (loaded: number, total: number) => options.onLoadProgress?.(loaded, total);
  activeRun = run;

  // No s'espera aquí: "Atura" ha de poder resoldre l'execució encara que Python s'estigui carregant
  void (async () => {
    if (!ready) progressListeners.add(onProgress);
    try {
      await preloadPython();
    } catch (err: any) {
      run.finish({ status: 'load-error', error: String(err?.message || err) });
      return;
    }
    progressListeners.delete(onProgress);
    if (activeRun !== run) return; // aturat mentre es carregava
    send({
      type: 'run',
      id: run.id,
      code,
      inputURL: inputAvailable ? INPUT_URL : null,
      inputUnavailable: options.inputUnavailableMessage ?? 'input() is not available in this browser.',
    });
    startTimer(run);
  })();
  return done;
}

/** Resposta de l'alumne a l'input() pendent (`null` = sense resposta: EOF). */
export function answerPythonInput(value: string | null): void {
  const run = activeRun;
  if (!run?.waitingInput) return;
  const requestId = run.waitingInput;
  run.waitingInput = null;
  navigator.serviceWorker?.controller?.postMessage({ type: 'mooc-python-input', requestId, value });
  startTimer(run);
}

/** Atura l'execució en curs (p. ex. un bucle infinit) i prepara un Python nou. */
export function stopPython(): void {
  const run = activeRun;
  if (!run) return;
  run.finish({ status: 'stopped' });
  // Encara carregant: no hi ha res en execució, es deixa acabar la càrrega
  if (ready) restartWorker();
}

// Python no es pot interrompre des de fora: s'elimina el worker i se'n crea un altre
// (els fitxers ja són a la memòria cau, així que torna a estar a punt de seguida).
function restartWorker() {
  discardWorker();
  void preloadPython().catch(() => { /* es reintentarà a la pròxima execució */ });
}

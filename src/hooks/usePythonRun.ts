import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConsoleLine } from '../components/ConsolePanel';
import { DEFAULT_PYTHON_TIMEOUT_MS, answerPythonInput, isPythonReady, runPython, stopPython } from '../services/pythonRunner';

// Límit de línies a la consola: un print dins d'un bucle llarg no ha de penjar la pàgina
const MAX_CONSOLE_LINES = 1000;

type Stream = 'stdout' | 'stderr';

interface RunState {
  lines: ConsoleLine[];
  /** Flux de l'última línia si encara no ha acabat amb un salt de línia. */
  open: Stream | null;
  truncated: boolean;
  loading: boolean;
}

/**
 * Botó "Executar" amb Python real (Pyodide): escriu la sortida a la consola de la pàgina
 * (`setLines`) com un terminal, inclòs input(), que es respon a la mateixa consola.
 * `resetKey`: en canviar (p. ex. de problema) s'atura el programa i se n'ignora la sortida.
 */
export function usePythonRun(setLines: (lines: ConsoleLine[]) => void, resetKey?: unknown) {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const generationRef = useRef(0);
  const stateRef = useRef<RunState | null>(null);

  useEffect(() => () => {
    generationRef.current++;
    stateRef.current = null;
    stopPython();
    setIsRunning(false);
    setInputActive(false);
  }, [resetKey]);

  const run = useCallback(async (code: string) => {
    const generation = ++generationRef.current;
    const st: RunState = { lines: [], open: null, truncated: false, loading: false };
    stateRef.current = st;
    const current = () => generationRef.current === generation;
    const show = () => { if (current()) setLines([...st.lines]); };
    const loadingLine = (percent: number): ConsoleLine => ({ kind: 'info', text: t('lesson.python_loading', 'Carregant Python… {{percent}}% (només la primera vegada)', { percent }) });
    const clearLoading = () => { if (st.loading) { st.lines.shift(); st.loading = false; } };

    // Afegeix text tal com arriba (pot ser un tros de línia) enganxant-lo a l'última línia oberta
    const append = (stream: Stream, text: string) => {
      const parts = text.split('\n');
      parts.forEach((part, i) => {
        const lastIndex = st.lines.length - 1;
        const last = st.lines[lastIndex];
        if (i === 0 && st.open === stream && last && typeof last === 'object') {
          st.lines[lastIndex] = { ...last, text: last.text + part };
        } else if (!(i === parts.length - 1 && part === '')) {
          if (st.lines.length >= MAX_CONSOLE_LINES) { st.truncated = true; return; }
          st.lines.push({ kind: stream, text: part });
        }
      });
      st.open = text.endsWith('\n') ? null : stream;
    };

    setIsRunning(true);
    setInputActive(false);
    if (!isPythonReady()) {
      st.loading = true;
      st.lines.push(loadingLine(0));
    }
    show();

    const result = await runPython(code, {
      inputUnavailableMessage: t('lesson.input_unavailable', "input() no funciona en aquest navegador (p. ex. en mode privat). Torna a carregar la pàgina i, si continua, prova un altre navegador.") + '\n',
      onLoadProgress: (loaded, total) => {
        if (!st.loading) return;
        st.lines[0] = loadingLine(total ? Math.floor((loaded / total) * 100) : 0);
        show();
      },
      onOutput: (chunks) => {
        clearLoading();
        chunks.forEach(({ stream, text }) => append(stream, text));
        show();
      },
      onInputRequest: (prompt) => {
        clearLoading();
        // El camp d'entrada va al final de l'última línia de sortida, darrere del text d'input()
        if (st.open !== 'stdout') { st.lines.push({ kind: 'stdout', text: '' }); st.open = 'stdout'; }
        if (prompt) append('stdout', prompt);
        if (st.open !== 'stdout') { st.lines.push({ kind: 'stdout', text: '' }); st.open = 'stdout'; }
        show();
        if (current()) setInputActive(true);
      },
    });
    if (!current()) return;

    clearLoading();
    setInputActive(false);
    const info = (text: string): ConsoleLine => ({ kind: 'info', text });
    if (st.truncated) st.lines.push(info(t('lesson.output_truncated', 'Sortida retallada: només es mostren les primeres {{count}} línies.', { count: MAX_CONSOLE_LINES })));
    if (result.status === 'ok') {
      if (!st.lines.length) st.lines.push(info(t('lesson.run_no_output', "El programa s'ha executat sense mostrar res. Per veure un resultat, fes servir print().")));
      st.lines.push(info(t('lesson.run_finished', 'Execució finalitzada.')));
    } else if (result.status === 'stopped') {
      st.lines.push(info(t('lesson.run_stopped', 'Execució aturada.')));
    } else if (result.status === 'timeout') {
      st.lines.push({ kind: 'stderr', text: t('lesson.run_timeout', 'Aturat: ha trigat més de {{seconds}} s. Potser hi ha un bucle infinit?', { seconds: DEFAULT_PYTHON_TIMEOUT_MS / 1000 }) });
    } else if (result.status === 'load-error') {
      st.lines.push({ kind: 'stderr', text: t('lesson.python_load_error', "No s'ha pogut carregar Python. Comprova la connexió i torna-ho a provar.") });
      if (result.error) st.lines.push(info(result.error));
    }
    show();
    setIsRunning(false);
  }, [setLines, t]);

  /** Resposta de l'alumne a l'input() pendent: queda escrita a la consola, com en un terminal. */
  const submitInput = useCallback((value: string) => {
    const st = stateRef.current;
    if (!st) return;
    const lastIndex = st.lines.length - 1;
    const last = st.lines[lastIndex];
    if (last && typeof last === 'object') st.lines[lastIndex] = { ...last, echo: value };
    st.open = null;
    setLines([...st.lines]);
    setInputActive(false);
    answerPythonInput(value);
  }, [setLines]);

  const stop = useCallback(() => stopPython(), []);

  return { isRunning, inputActive, run, stop, submitInput };
}

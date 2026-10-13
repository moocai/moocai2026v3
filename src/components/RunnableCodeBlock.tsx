import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { Play, RotateCcw, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConsolePanel, type ConsoleLine } from './ConsolePanel';
import { usePythonRun } from '../hooks/usePythonRun';
import { getMonacoEditorTheme, loadMonaco } from '../utils/monaco';

const FONT_SIZE = 14;
const LINE_HEIGHT = 20;
const EDITOR_PADDING = 8;

/**
 * Exemple de Python de la teoria que l'alumne pot editar i executar (com a algorien): el mateix
 * aspecte que el codi dels companys, però editable, i la sortida a sota, en una consola pròpia.
 * Res no es desa: en tornar a la pàgina surt el codi original.
 */
export function RunnableCodeBlock({ code }: { code: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(code);
  const [output, setOutput] = useState<ConsoleLine[] | null>(null);
  const [monacoReady, setMonacoReady] = useState(false);
  const [height, setHeight] = useState(code.split('\n').length * LINE_HEIGHT + EDITOR_PADDING * 2);
  const { isRunning, inputActive, run, stop, submitInput } = usePythonRun(setOutput);

  useEffect(() => { setValue(code); setOutput(null); }, [code]);
  // L'editor només es crea amb el Monaco local configurat (si no, el carregaria d'un CDN)
  useEffect(() => {
    let cancelled = false;
    loadMonaco().then(() => { if (!cancelled) setMonacoReady(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const runLabel = t('lesson.run_button');
  const stopLabel = t('lesson.stop_button');
  const resetLabel = t('lesson.theory_reset_code');
  const edited = value !== code;

  const staticCode = (
    <Box component="pre" sx={{ m: 0, px: 1.5, py: `${EDITOR_PADDING}px`, overflowX: 'auto', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: FONT_SIZE, lineHeight: `${LINE_HEIGHT}px`, color: '#d4d4d4', whiteSpace: 'pre' }}>
      {value}
    </Box>
  );

  return (
    <Box sx={{ my: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: '#1e1e1e' }}>
      {/* Executar a l'esquerra, al costat del codi (com les cel·les de Jupyter): a la dreta quedava
          massa lluny en pantalles grans */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5, bgcolor: '#111', borderBottom: '1px solid #333', minHeight: 36 }}>
        <Button
          size="small"
          onClick={() => (isRunning ? stop() : void run(value))}
          startIcon={isRunning ? <Square size={12} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          sx={{
            textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', minWidth: 0, px: 1.25, py: 0.25, borderRadius: 1,
            color: isRunning ? '#f87171' : '#fff', bgcolor: isRunning ? 'transparent' : '#8400ff',
            border: '1px solid', borderColor: isRunning ? '#f87171' : '#8400ff',
            '&:hover': { bgcolor: isRunning ? '#2a1414' : '#6d00d4' },
          }}
        >
          {isRunning ? stopLabel : runLabel}
        </Button>
        {edited && (
          <Tooltip title={resetLabel} arrow>
            <IconButton size="small" onClick={() => setValue(code)} aria-label={resetLabel} sx={{ color: '#e5e7eb', '&:hover': { bgcolor: '#222' } }}>
              <RotateCcw size={14} />
            </IconButton>
          </Tooltip>
        )}
        <Box component="span" sx={{ ml: 'auto', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 700, fontFamily: "'Fira Code', 'Consolas', monospace" }}>Python</Box>
      </Box>

      <Box sx={{ height }}>
        {monacoReady ? (
          <Editor
            value={value}
            language="python"
            // Sempre fosc, com el codi dels companys
            theme={getMonacoEditorTheme('dark')}
            onChange={(v) => setValue(v ?? '')}
            onMount={(editor) => {
              // L'alçada segueix el codi: sense barra de desplaçament dins de la teoria
              const fit = () => setHeight(editor.getContentHeight());
              editor.onDidContentSizeChange(fit);
              fit();
            }}
            loading={staticCode}
            options={{
              fontSize: FONT_SIZE,
              lineHeight: LINE_HEIGHT,
              minimap: { enabled: false },
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              folding: false,
              glyphMargin: false,
              wordWrap: 'on',
              renderLineHighlight: 'none',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollBeyondLastLine: false,
              scrollbar: { vertical: 'hidden', horizontal: 'hidden', alwaysConsumeMouseWheel: false },
              padding: { top: EDITOR_PADDING, bottom: EDITOR_PADDING },
              stickyScroll: { enabled: false },
              quickSuggestions: false,
              insertSpaces: true,
              detectIndentation: false,
              tabSize: 4,
              automaticLayout: true,
            }}
          />
        ) : staticCode}
      </Box>

      {/* La sortida apareix a sota en executar-lo, com a algorien */}
      {output !== null && (
        <Box sx={{ display: 'flex', maxHeight: 300, bgcolor: '#0a0a0a' }}>
          <ConsolePanel
            output={output}
            inputActive={inputActive}
            onInputSubmit={submitInput}
            inputLabel={t('lesson.console_input_label')}
            inputPlaceholder={t('lesson.console_input_placeholder')}
          />
        </Box>
      )}
    </Box>
  );
}

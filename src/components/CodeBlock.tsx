import { useEffect, useState, type ReactNode } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Play, Square } from 'lucide-react';
import { loadMonaco } from '../utils/monaco';

/**
 * Codi de només lectura amb el resaltat de sintaxi de l'editor (Monaco `colorize`) i,
 * opcionalment, un botó per executar-lo (p. ex. la solució o la d'un company).
 */
export function CodeBlock({ code, language = 'python', onRun, running = false, runLabel, stopLabel, header }: {
  code: string;
  language?: string;
  onRun?: () => void;
  /** Aquest bloc s'està executant: el botó passa a ser "Atura". */
  running?: boolean;
  runLabel?: string;
  stopLabel?: string;
  header?: ReactNode;
}) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    // colorize escapa el codi i només hi afegeix <span> amb classes de color de Monaco
    loadMonaco()
      .then((m) => m.editor.colorize(code, language, { tabSize: 4 }))
      .then((out: string) => { if (!cancelled) setHtml(out); })
      .catch(() => { /* es queda el text pla */ });
    return () => { cancelled = true; };
  }, [code, language]);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: '#1e1e1e' }}>
      {(header || onRun) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, bgcolor: '#111', borderBottom: '1px solid #333', minHeight: 36 }}>
          <Box sx={{ flex: 1, minWidth: 0, color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 700 }}>{header}</Box>
          {onRun && (
            <Tooltip title={running ? stopLabel : runLabel} arrow>
              <IconButton size="small" onClick={onRun} aria-label={running ? stopLabel : runLabel} sx={{ color: running ? '#f87171' : '#e5e7eb', '&:hover': { bgcolor: '#222' } }}>
                {running ? <Square size={13} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
      <Box
        component="pre"
        sx={{ m: 0, p: 1.5, overflowX: 'auto', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 13, lineHeight: 1.5, color: '#d4d4d4', bgcolor: '#1e1e1e', whiteSpace: 'pre' }}
      >
        {html !== null ? <span dangerouslySetInnerHTML={{ __html: html }} /> : code}
      </Box>
    </Box>
  );
}

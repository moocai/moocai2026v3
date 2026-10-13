import { useEffect, useState, type ReactNode } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Play, Square } from 'lucide-react';
import { loadMonaco } from '../utils/monaco';
import { useCodeSurface } from '../theme/codeSurface';

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
  // colorize pinta amb el tema actiu de Monaco (clar o fosc): el fons ha de seguir el mateix mode
  const c = useCodeSurface();

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
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: c.bg }}>
      {(header || onRun) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, bgcolor: c.bar, borderBottom: `1px solid ${c.border}`, minHeight: 36 }}>
          <Box sx={{ flex: 1, minWidth: 0, color: c.text, fontSize: '0.8rem', fontWeight: 700 }}>{header}</Box>
          {onRun && (
            <Tooltip title={running ? stopLabel : runLabel} arrow>
              <IconButton size="small" onClick={onRun} aria-label={running ? stopLabel : runLabel} sx={{ color: running ? c.error : c.icon, '&:hover': { bgcolor: c.hover } }}>
                {running ? <Square size={13} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
      <Box
        component="pre"
        sx={{ m: 0, p: 1.5, overflowX: 'auto', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 13, lineHeight: 1.5, color: c.stdout, bgcolor: c.bg, whiteSpace: 'pre' }}
      >
        {html !== null ? <span dangerouslySetInnerHTML={{ __html: html }} /> : code}
      </Box>
    </Box>
  );
}

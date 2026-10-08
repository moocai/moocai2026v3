import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useThemeMode } from '../hooks/useTheme';

/**
 * Línia de la consola: un text de l'aplicació (string, amb el prefix "> ") o
 * sortida d'un programa, que es mostra tal qual (stdout, stderr en vermell, o info).
 */
export type ConsoleLine = string | { kind: 'stdout' | 'stderr' | 'info'; text: string };

interface ConsolePanelProps {
  output: ConsoleLine[];
  emptyMessage?: string;
}

const KIND_COLORS = { stdout: '#e5e7eb', stderr: '#f87171', info: '#9ca3af' } as const;

export function ConsolePanel({ output, emptyMessage = 'Esperando ejecución...' }: ConsolePanelProps) {
  const { mode } = useThemeMode();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sempre a la vista l'última sortida
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output]);

  return (
    <Box sx={{ 
      flex: 1, 
      minHeight: 0, 
      display: 'flex', 
      flexDirection: 'column', 
      width: '100%', 
      borderTop: '1px solid', 
      borderTopColor: mode === 'light' ? '#000' : 'divider', 
      borderBottom: '1px solid', 
      borderColor: mode === 'light' ? '#000' : 'divider' 
    }}>
      <Box sx={{ 
        height: 30,
        px: 2,
        bgcolor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: `1px solid ${mode === 'light' ? '#000' : '#333'}`, 
        flexShrink: 0 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 900 }}>CONSOLE</Typography>
        </Box>
      </Box>
      <Box ref={scrollRef} sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        {output.length === 0 && (
          <Typography sx={{ fontSize: 14, color: '#444', fontFamily: 'monospace' }}>
            {`// ${emptyMessage}`}
          </Typography>
        )}
        {output.map((line, i) =>
          typeof line === 'string' ? (
            <Typography 
              key={i} 
              sx={{ 
                fontSize: 14, 
                fontFamily: 'monospace', 
                color: line.includes('✅') ? '#4ade80' : line.includes('❌') ? '#f87171' : '#aaa',
                mb: 0.5
              }}
            >
              {'>'} {line}
            </Typography>
          ) : (
            <Typography
              key={i}
              sx={{
                fontSize: 14,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.45,
                color: KIND_COLORS[line.kind],
                fontStyle: line.kind === 'info' ? 'italic' : 'normal',
                mt: line.kind === 'info' ? 0.75 : 0,
              }}
            >
              {line.text || ' '}
            </Typography>
          )
        )}
      </Box>
    </Box>
  );
}

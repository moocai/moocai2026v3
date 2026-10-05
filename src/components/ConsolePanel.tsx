import { Box, Typography } from '@mui/material';
import { useThemeMode } from '../hooks/useTheme';

interface ConsolePanelProps {
  output: string[];
  emptyMessage?: string;
}

export function ConsolePanel({ output, emptyMessage = 'Esperando ejecución...' }: ConsolePanelProps) {
  const { mode } = useThemeMode();

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
      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        {output.length === 0 && (
          <Typography sx={{ fontSize: 14, color: '#444', fontFamily: 'monospace' }}>
            {`// ${emptyMessage}`}
          </Typography>
        )}
        {output.map((line, i) => (
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
        ))}
      </Box>
    </Box>
  );
}

import { Box, useTheme } from '@mui/material';
import { calcularColorProgreso } from '../../utils/formatters';

export function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <Box sx={{ width: '100%', height: 8, bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200', borderRadius: 4, overflow: 'hidden' }}>
      <Box sx={{ width: `${Math.min(value, 100)}%`, height: '100%', bgcolor: calcularColorProgreso(value), borderRadius: 4, transition: 'width 0.5s ease' }} />
    </Box>
  );
}
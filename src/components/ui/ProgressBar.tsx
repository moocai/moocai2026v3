import { Box, useTheme } from '@mui/material';
import { calcularColorProgreso } from '../../utils/formatters';

export function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <Box
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={`${Math.round(clamped)}%`}
      sx={{ width: '100%', height: 8, bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200', border: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#fff' : '#000', borderRadius: 4, overflow: 'hidden' }}
    >
      <Box sx={{ width: '100%', height: '100%', bgcolor: calcularColorProgreso(clamped), transform: `scaleX(${clamped / 100})`, transformOrigin: 'left center', transition: 'transform 0.5s ease' }} />
    </Box>
  );
}

import { Box, type SxProps, type Theme } from '@mui/material';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Groc de l'estrella de puntuació (el mateix que la dels temes que en donen, com a algorien). */
export const STAR_COLOR = '#facc15';

/**
 * Puntuació en format compacte: el número i una estrella (no hi ha abreviatura per a
 * "estrelles"). La paraula sencera ("120 estrelles") hi és per als lectors de pantalla i
 * en passar-hi per sobre.
 */
export function StarScore({ value, size = 16, sx }: { value: number; size?: number; sx?: SxProps<Theme> }) {
  const { t } = useTranslation();
  const label = t('common.stars_count', { count: value });
  return (
    <Box component="span" role="img" aria-label={label} title={label}
      sx={[{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, whiteSpace: 'nowrap' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      <span aria-hidden="true">{value}</span>
      <Star size={size} color={STAR_COLOR} fill={STAR_COLOR} aria-hidden="true" style={{ flexShrink: 0 }} />
    </Box>
  );
}

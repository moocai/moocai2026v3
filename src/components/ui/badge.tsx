import { Chip, SxProps, Theme } from '@mui/material';
import type { Estado } from '../../types';

interface BadgeProps {children: string; className?: string; mode?: 'standard' | 'outline'; sx?: SxProps<Theme>;}

export function Badge({ children, mode = 'standard', className, sx }: BadgeProps) {
  return (
    <Chip label={children} className={className}
      sx={{height: '24px', fontSize: '0.7rem',fontWeight: 800, texttransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '8px', cursor: 'default',transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',border: '1px solid',
        ...(mode === 'standard' ? {bgcolor: 'primary.main' + '1A', color: 'primary.main', borderColor: 'primary.main' + '33','&:hover': {bgcolor: 'primary.main' + '33', borderColor: 'primary.main', transform: 'translateY(-1px)'},
        } : {bgcolor: 'transparent', color: 'text.secondary',borderColor: 'divider','&:hover': {borderColor: 'text.primary',color: 'text.primary',transform: 'translateY(-1px)',}}), ...sx,
      }}
    />
  );
}

const estadoColors: Record<Estado, 'success' | 'warning' | 'info' | 'error'> = {
  activo: 'success',
  inactivo: 'warning',
  completado: 'info',
  bloqueado: 'error',
};

export function BadgeEstado({ estado }: { estado: Estado }) {
  return <Chip label={estado} color={estadoColors[estado]} size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }} />;
}
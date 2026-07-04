import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Typography, Paper, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BadgeEstado } from '../../components/ui/badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatearFecha, formatearNota } from '../../utils/formatters';
import type { Estudiante } from '../../types';

export function StudentTable({ estudiantes }: { estudiantes: Estudiante[] }) {
  const { t } = useTranslation();

  if (estudiantes.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">{t('teacher.sinInvitaciones')}</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('teacher.estudiante')}</TableCell>
            <TableCell>{t('teacher.estado')}</TableCell>
            <TableCell>{t('teacher.progreso')}</TableCell>
            <TableCell>{t('teacher.ejerciciosCompletados')}</TableCell>
            <TableCell>{t('teacher.nota')}</TableCell>
            <TableCell>{t('teacher.ultimoAcceso')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {estudiantes.map((est) => (
            <TableRow key={est.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={est.avatar} alt={est.nombre} sx={{ width: 36, height: 36 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{est.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">{est.email}</Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell><BadgeEstado estado={est.estado} /></TableCell>
              <TableCell sx={{ minWidth: 120 }}><ProgressBar value={est.progreso} /></TableCell>
              <TableCell>{est.ejerciciosCompletados}/{est.ejerciciosTotales}</TableCell>
              <TableCell>{formatearNota(est.notaPromedio)}</TableCell>
              <TableCell>{formatearFecha(est.ultimoAcceso)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
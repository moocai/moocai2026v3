import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { StatsCards } from '../../features/teacher/StatsCards';
import { StudentFilters } from '../../features/teacher/StudentFilters';
import { StudentTable } from '../../features/teacher/StudentTable';
import type { FiltrosEstudiante, Estudiante } from '../../types';

export default function Students() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FiltrosEstudiante>({ buscar: '', estado: 'todos', orden: 'nombre' });
  const estudiantes: Estudiante[] = [];

  const stats = [
    { label: t('teacher.totalEstudiantes'), value: 0 },
    { label: t('teacher.cursosActivos'), value: 0 },
    { label: t('teacher.promedioProgreso'), value: '0%' },
    { label: t('teacher.ejerciciosPendientes'), value: 0 },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>{t('teacher.estudiantes')}</Typography>
      <Box sx={{ mb: 3 }}><StatsCards stats={stats} /></Box>
      <StudentFilters filters={filters} onChange={setFilters} />
      <StudentTable estudiantes={estudiantes} />
    </Box>
  );
}
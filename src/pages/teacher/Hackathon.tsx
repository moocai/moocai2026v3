import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTranslation } from 'react-i18next';
import { StatsCards } from '../../features/teacher/StatsCards';

export default function Hackathon() {
  const { t } = useTranslation();

  const stats = [
    { label: t('teacher.equiposHackathon'), value: 0 },
    { label: t('teacher.estudiantes'), value: 0 },
    { label: t('teacher.premio'), value: '—' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{t('teacher.hackathon')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{t('teacher.sinInvitaciones')}</Typography>
      <Box sx={{ mb: 3 }}><StatsCards stats={stats} /></Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography color="text.secondary">{t('teacher.sinEquipos')}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
}
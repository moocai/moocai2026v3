import { Box, Typography, Card, Grid } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CodeIcon from '@mui/icons-material/Code';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    { label: t('teacher.gestionarEstudiantes'), desc: t('teacher.gestionarEstudiantesDesc'), icon: <PeopleIcon sx={{ fontSize: 40 }} />, path: '/teacher/students' },
    { label: t('teacher.corregirEjercicios'), desc: t('teacher.corregirEjerciciosDesc'), icon: <AssignmentIcon sx={{ fontSize: 40 }} />, path: '/teacher/exercises' },
    { label: t('teacher.gestionarHackathon'), desc: t('teacher.gestionarHackathonDesc'), icon: <CodeIcon sx={{ fontSize: 40 }} />, path: '/teacher/hackathon' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{t('teacher.bienvenidoProfesor')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>{t('teacher.panelControl')}</Typography>

      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{t('teacher.accionesRapidas')}</Typography>
      <Grid container spacing={3}>
        {actions.map((action) => (
          <Grid key={action.path} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              onClick={() => navigate(action.path)}
              sx={{ p: 4, cursor: 'pointer', borderRadius: 3, transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' }, border: 1, borderColor: 'divider' }}
            >
              <Box sx={{ color: 'primary.main', mb: 2 }}>{action.icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{action.label}</Typography>
              <Typography variant="body2" color="text.secondary">{action.desc}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
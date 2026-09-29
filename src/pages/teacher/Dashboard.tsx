import { useState, useEffect } from 'react';
import { Box, Typography, Card, Grid, FormControl, InputLabel, Select, MenuItem, Chip, Stack, Alert } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { localCourseService } from '../../services/localCourseService';
import { TeacherLeaderboard } from '../../features/teacher/TeacherLeaderboard';

interface CourseOption {
  id: string;
  nombre: string;
}

export function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(() => localStorage.getItem('teacher_selected_course') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const apiCourses = await courseService.getAllCourses();
        const localCourses = localCourseService.getAll();
        const all: CourseOption[] = [
          ...localCourses.map((c) => ({ id: c.id, nombre: c.nombre })),
          ...apiCourses.map((c) => ({ id: c.slug || c.id, nombre: c.title || c.id })),
        ];
        setCourses(all);
      } catch {
        setCourses(localCourseService.getAll().map((c) => ({ id: c.id, nombre: c.nombre })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const courseSelected = !!selectedCourse;

  const actions = [
    {
      label: t('teacher.gestionarEstudiantes'),
      desc: t('teacher.gestionarEstudiantesDesc'),
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      path: '/teacher/students',
      disabled: !courseSelected,
    },
    {
      label: t('teacher.corregirEjercicios'),
      desc: t('teacher.corregirEjerciciosDesc'),
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      path: '/teacher/exercises',
      disabled: !courseSelected,
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{t('teacher.bienvenidoProfesor')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{t('teacher.panelControl')}</Typography>

      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{t('teacher.accionesRapidas')}</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>{t('teacher.seleccionarCurso')}</Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="course-select-label">{t('teacher.curso')}</InputLabel>
                <Select
                  labelId="course-select-label"
                  value={selectedCourse}
                  label={t('teacher.curso')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCourse(val);
                    localStorage.setItem('teacher_selected_course', val);
                    const name = courses.find((c) => c.id === val)?.nombre || '';
                    localStorage.setItem('teacher_selected_course_name', name);
                    window.dispatchEvent(new Event('teacher-course-changed'));
                  }}
                >
                  {courses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                  ))}
                  {selectedCourse && <MenuItem value="" divider>{t('teacher.quitarSeleccion')}</MenuItem>}
                </Select>
              </FormControl>
            </Box>
            <Box>
              {!courseSelected && !loading && (
                <Alert severity="info" sx={{ mt: 1 }}>{t('teacher.seleccionaCursoParaDesbloquear')}</Alert>
              )}
              {courseSelected && (
                <Chip label={courses.find((c) => c.id === selectedCourse)?.nombre} color="primary" sx={{ mt: 1 }} />
              )}
            </Box>
          </Card>
        </Grid>

        {actions.map((action) => (
          <Grid key={action.path} size={{ xs: 12, sm: 4 }}>
            <Card
              onClick={() => { if (!action.disabled) navigate(action.path); }}
              sx={{
                p: 3, borderRadius: 3, transition: 'all 0.2s', border: 1, borderColor: 'divider', height: 200,
                cursor: action.disabled ? 'default' : 'pointer',
                opacity: action.disabled ? 0.5 : 1,
                '&:hover': action.disabled ? {} : { borderColor: 'primary.main', transform: 'translateY(-2px)' },
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ color: action.disabled ? 'action.disabled' : 'primary.main', mb: 2 }}>{action.icon}</Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{action.label}</Typography>
                  {action.disabled && <LockIcon sx={{ fontSize: 18, color: 'action.disabled' }} />}
                </Stack>
              </Box>
              <Typography variant="body2" color="text.secondary">{action.desc}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TeacherLeaderboard />
    </Box>
  );
}

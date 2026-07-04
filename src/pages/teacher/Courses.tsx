import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, Card, CardContent, Chip, Stack, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import { CourseForm } from '../../features/teacher/CourseForm';
import { courseService } from '../../services/courseService';
import type { Curso } from '../../types';

function toCurso(c: any): Curso {
  return {
    id: c.slug || c.id,
    nombre: c.name || c.title,
    descripcion: c.description || '',
    duracion: c.duration || '',
    estado: c.active ? 'activo' : 'activo',
    fechaInicio: '',
    totalEstudiantes: 0,
    alumnos: [],
  };
}

export default function Courses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService.getAllCourses().then((list) => {
      setCursos(list.map(toCurso));
    }).catch(() => setCursos([])).finally(() => setLoading(false));
  }, []);

  const estadoColor: Record<string, 'success' | 'warning' | 'default'> = { activo: 'success', inactivo: 'warning', borrador: 'default' };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>{t('teacher.cursos')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('teacher.crearCurso')}</Button>
      </Stack>
      <Stack spacing={2}>
        {cursos.length === 0 ? (
          <Typography color="text.secondary">{t('teacher.sinInvitaciones')}</Typography>
        ) : (
          cursos.map((curso) => (
            <Card key={curso.id} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{curso.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{curso.descripcion}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{curso.duracion}{curso.duracion ? ' · ' : ''}{curso.totalEstudiantes} estudiantes</Typography>
                      <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => navigate(`/courses/${curso.id}`)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                        Ver Lecciones
                      </Button>
                    </Stack>
                  </Box>
                  <Chip label={curso.estado} color={estadoColor[curso.estado]} size="small" />
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('teacher.crearCurso')}</DialogTitle>
        <DialogContent>
          <CourseForm onSubmit={() => { setOpen(false); }} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
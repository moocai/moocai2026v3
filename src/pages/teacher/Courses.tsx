import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Chip, Stack, CircularProgress, TextField, FormControlLabel, Checkbox, FormGroup, Alert, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { CourseForm } from '../../features/teacher/CourseForm';
import { courseService } from '../../services/courseService';
import { localCourseService } from '../../services/localCourseService';
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
  const [cloneTarget, setCloneTarget] = useState<Curso | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [selectedAlumnos, setSelectedAlumnos] = useState<string[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string }[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Curso | null>(null);

  const loadCourses = async () => {
    try {
      const list = await courseService.getAllCourses();
      const apiCursos = list.map(toCurso);
      const localCursos = localCourseService.getAll();
      const localIds = new Set(localCursos.map((c) => c.id));
      setCursos([...localCursos, ...apiCursos.filter((c) => !localIds.has(c.id))]);
    } catch {
      setCursos(localCourseService.getAll());
    }
  };

  useEffect(() => {
    loadCourses().finally(() => setLoading(false));
    const localStudents = JSON.parse(localStorage.getItem('mooc_local_students') || '[]');
    const deletedIds = JSON.parse(localStorage.getItem('mooc_deleted_ids') || '[]');
    const merged = localStudents
      .filter((s: any) => !deletedIds.includes(s.id))
      .map((s: any) => ({ id: s.id, name: s.name }));
    setAllStudents(merged);
  }, []);

  const handleOpenClone = (curso: Curso) => {
    setCloneTarget(curso);
    setCloneName(`${curso.nombre} - ${t('teacher.claseB')}`);
    setSelectedAlumnos([]);
  };

  const handleClone = () => {
    if (!cloneTarget || !cloneName.trim()) return;
    localCourseService.cloneFrom(cloneTarget, cloneName.trim(), selectedAlumnos);
    loadCourses();
    setCloneTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    localCourseService.remove(deleteTarget.id);
    loadCourses();
    setDeleteTarget(null);
  };

  const toggleAlumno = (id: string) => {
    setSelectedAlumnos((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

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
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{curso.nombre}</Typography>
                      {curso.id.startsWith('clone-') && (
                        <Chip label={t('teacher.clonado')} size="small" color="info" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{curso.descripcion}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {curso.duracion}{curso.duracion ? ' · ' : ''}{curso.totalEstudiantes} {t('teacher.alumnosMin')}
                      </Typography>
                      <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => navigate(`/courses/${curso.id}`)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                        {t('teacher.verLecciones')}
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => handleOpenClone(curso)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                        {t('teacher.clonarCurso')}
                      </Button>
                      <Tooltip title={t('teacher.eliminarCurso')}>
                        <IconButton size="small" onClick={() => setDeleteTarget(curso)} sx={{ color: 'error.main' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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

      <Dialog open={!!cloneTarget} onClose={() => setCloneTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('teacher.clonarCurso')}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">{t('teacher.clonarCursoDesc')}</Alert>
            <TextField
              label={t('teacher.nombreClon')}
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              fullWidth
              required
            />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('teacher.seleccionarAlumnos')}</Typography>
              {allStudents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('teacher.sinEstudiantes')}</Typography>
              ) : (
                <FormGroup>
                  {allStudents.map((s) => (
                    <FormControlLabel
                      key={s.id}
                      control={<Checkbox checked={selectedAlumnos.includes(s.id)} onChange={() => toggleAlumno(s.id)} />}
                      label={s.name}
                    />
                  ))}
                </FormGroup>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneTarget(null)}>{t('teacher.cancelar')}</Button>
          <Button variant="contained" onClick={handleClone} disabled={!cloneName.trim()}>{t('teacher.crearClon')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('teacher.eliminarCurso')}</DialogTitle>
        <DialogContent>
          <Typography>{t('teacher.eliminarCursoConfirmar', { nombre: deleteTarget?.nombre })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('teacher.cancelar')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>{t('teacher.eliminar')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

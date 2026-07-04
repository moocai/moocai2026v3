import { useState, useEffect } from 'react';
import { Box, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText, Chip, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { ExerciseEditor } from '../../features/teacher/ExerciseEditor';
import { courseService } from '../../services/courseService';
import type { Ejercicio } from '../../types';

function nivelFromDifficulty(d: string): 'básico' | 'intermedio' | 'avanzado' {
  if (d === 'easy' || d === 'basico' || d === 'básico') return 'básico';
  if (d === 'hard' || d === 'avanzado') return 'avanzado';
  return 'intermedio';
}

export default function Exercises() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [selected, setSelected] = useState<Ejercicio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cursos = await courseService.getAllCourses();
        if (!cursos.length) return;
        const detail = await courseService.getFullCourseDetail(cursos[0].slug!);
        const topics = detail.content || [];
        const all: Ejercicio[] = [];
        topics.forEach((topic: any) => {
          (topic.subTopics || []).forEach((st: any) => {
            all.push({
              id: st.problemSlug || st.subtitle || Math.random().toString(),
              titulo: { es: st.subtitle },
              descripcion: { es: st.text },
              nivel: nivelFromDifficulty(st.difficulty || ''),
              categoria: topic.title || '',
              codigoInicio: st.precode || '',
              pista: { es: '' },
              solucion: st.solution || '',
            });
          });
        });
        setEjercicios(all);
      } catch {
        setEjercicios([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>{t('teacher.ejercicios')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('teacher.crearCurso')}</Button>
      </Stack>
      {ejercicios.length === 0 ? (
        <Typography color="text.secondary">{t('teacher.sinInvitaciones')}</Typography>
      ) : (
        <List>
          {ejercicios.map((ej) => (
            <ListItemButton key={ej.id} onClick={() => setSelected(ej)} selected={selected?.id === ej.id} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemText primary={ej.titulo?.es || ej.id} secondary={ej.categoria} />
              <Chip label={ej.nivel} size="small" color={ej.nivel === 'avanzado' ? 'error' : ej.nivel === 'intermedio' ? 'warning' : 'success'} />
            </ListItemButton>
          ))}
        </List>
      )}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="lg" fullWidth>
        <DialogTitle>{selected?.titulo?.es || selected?.id || t('teacher.ejercicios')}</DialogTitle>
        <DialogContent>
          <ExerciseEditor initialCode={selected?.codigoInicio || ''} hint={selected?.pista?.es} solution={selected?.solucion} />
        </DialogContent>
      </Dialog>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{t('teacher.ejercicios')}</DialogTitle>
        <DialogContent>
          <ExerciseEditor initialCode="// Write your exercise code here" hint="Add a hint for students" solution="// Solution code" />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
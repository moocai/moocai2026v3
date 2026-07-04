import { useState, useEffect } from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, ListItemIcon, Chip, CircularProgress } from '@mui/material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTranslation } from 'react-i18next';
import { courseService } from '../../services/courseService';
import type { Ejercicio } from '../../types';

function nivelFromDifficulty(d: string): 'básico' | 'intermedio' | 'avanzado' {
  if (d === 'easy' || d === 'basico' || d === 'básico') return 'básico';
  if (d === 'hard' || d === 'avanzado') return 'avanzado';
  return 'intermedio';
}

export default function ExerciseList() {
  const { t } = useTranslation();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
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
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>{t('teacher.listaEjercicios')}</Typography>
      {ejercicios.length === 0 ? (
        <Typography color="text.secondary">{t('teacher.sinInvitaciones')}</Typography>
      ) : (
        <List>
          {ejercicios.map((ej) => (
            <ListItemButton key={ej.id} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <RadioButtonUncheckedIcon color="disabled" />
              </ListItemIcon>
              <ListItemText primary={ej.titulo?.es || ej.id} secondary={ej.categoria} />
              <Chip label={ej.nivel} size="small" color={ej.nivel === 'avanzado' ? 'error' : ej.nivel === 'intermedio' ? 'warning' : 'success'} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
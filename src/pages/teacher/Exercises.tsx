import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Stack, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress, Paper } from '@mui/material';
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
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  
  // Recuperar tema y ejercicio seleccionados de localStorage
  const [selectedTopic, setSelectedTopic] = useState(() => {
    return localStorage.getItem('teacher_selected_topic') || '';
  });
  const [selectedId, setSelectedId] = useState(() => {
    return localStorage.getItem('teacher_selected_exercise') || '';
  });
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
              titulo: typeof st.subtitle === 'object' ? st.subtitle : { es: st.subtitle || '' },
              descripcion: typeof st.text === 'object' ? st.text : { es: st.text || '' },
              nivel: nivelFromDifficulty(st.difficulty || ''),
              categoria: topic.title || '',
              codigoInicio: st.precode || '',
              pista: typeof st.hint === 'object' ? st.hint : { es: st.hint || '' },
              solucion: st.solution || '',
              teacherSolution: st.teacherSolution || '',
              type: st.type || 'code',
              choices: st.choices || [],
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

  // Guardar tema seleccionado en localStorage
  useEffect(() => {
    if (selectedTopic) {
      localStorage.setItem('teacher_selected_topic', selectedTopic);
    }
  }, [selectedTopic]);

  // Guardar ejercicio seleccionado en localStorage
  useEffect(() => {
    if (selectedId) {
      localStorage.setItem('teacher_selected_exercise', selectedId);
    }
  }, [selectedId]);

  const topics = useMemo(() => {
    const map = new Map<string, Ejercicio[]>();
    ejercicios.forEach((ej) => {
      const key = ej.categoria || t('teacher.sinCategoria');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ej);
    });
    return Array.from(map.entries());
  }, [ejercicios, t]);

  const exercisesInTopic = useMemo(() => {
    if (!selectedTopic) return [];
    return ejercicios.filter((ej) => (ej.categoria || t('teacher.sinCategoria')) === selectedTopic);
  }, [ejercicios, selectedTopic, t]);

  const selected = ejercicios.find((ej) => ej.id === selectedId) || null;

  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
    setSelectedId('');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>{t('teacher.ejercicios')}</Typography>

        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="topic-select-label">{t('teacher.seleccionarTema')}</InputLabel>
            <Select
              labelId="topic-select-label"
              value={selectedTopic}
              label={t('teacher.seleccionarTema')}
              onChange={(e) => handleTopicChange(e.target.value)}
            >
              {topics.map(([topic, items]) => (
                <MenuItem key={topic} value={topic}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                    <Box sx={{ flex: 1, fontWeight: 600 }}>{topic}</Box>
                    <Chip label={items.length} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 260 }} disabled={!selectedTopic}>
            <InputLabel id="exercise-select-label">{t('teacher.seleccionarEjercicio')}</InputLabel>
            <Select
              labelId="exercise-select-label"
              value={selectedId}
              label={t('teacher.seleccionarEjercicio')}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {exercisesInTopic.map((ej) => (
                <MenuItem key={ej.id} value={ej.id}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>{ej.titulo?.es || ej.id}</Box>
                    <Chip
                      label={ej.nivel}
                      size="small"
                      color={ej.nivel === 'avanzado' ? 'error' : ej.nivel === 'intermedio' ? 'warning' : 'success'}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
        {selected ? (
          <ExerciseEditor
            key={selected.id}
            exerciseId={selected.id}
            initialCode={selected.codigoInicio || ''}
            hint={selected.pista?.es}
            solution={selected.solucion}
            teacherSolution={selected.teacherSolution}
            statement={selected.descripcion?.es}
            type={selected.type}
            choices={selected.choices}
          />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 8 }}>
            <Typography color="text.secondary">{selectedTopic ? t('teacher.seleccionarEjercicio') : t('teacher.seleccionarTemaPrimero')}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
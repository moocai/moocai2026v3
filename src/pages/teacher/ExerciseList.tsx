import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Stack, List, ListItemButton, ListItemText, Chip, CircularProgress, ToggleButton, ToggleButtonGroup, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useTranslation } from 'react-i18next';
import { courseService } from '../../services/courseService';
import type { Ejercicio } from '../../types';

function nivelFromDifficulty(d: string): 'básico' | 'intermedio' | 'avanzado' {
  if (d === 'easy' || d === 'basico' || d === 'básico') return 'básico';
  if (d === 'hard' || d === 'avanzado') return 'avanzado';
  return 'intermedio';
}

type ViewMode = 'temas' | 'nivel';

const nivelColor = (nivel: string) => nivel === 'avanzado' ? 'error.main' : nivel === 'intermedio' ? 'warning.main' : 'success.main';

export default function ExerciseList() {
  const { t } = useTranslation();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('temas');
  const [expandedGroup, setExpandedGroup] = useState<string | false>('');

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

  const grouped = useMemo(() => {
    if (viewMode === 'temas') {
      const map = new Map<string, Ejercicio[]>();
      ejercicios.forEach((ej) => {
        const key = ej.categoria || t('teacher.sinCategoria');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ej);
      });
      return Array.from(map.entries());
    } else {
      const order = ['básico', 'intermedio', 'avanzado'];
      const map = new Map<string, Ejercicio[]>();
      ejercicios.forEach((ej) => {
        const key = ej.nivel;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ej);
      });
      return Array.from(map.entries()).sort((a, b) => {
        const ia = order.indexOf(a[0]);
        const ib = order.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    }
  }, [ejercicios, viewMode, t]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>{t('teacher.listaEjercicios')}</Typography>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, val) => { if (val !== null) { setViewMode(val); setExpandedGroup(''); } }}
        sx={{ mb: 3 }}
      >
        <ToggleButton value="temas">
          <AccountTreeIcon sx={{ mr: 1, fontSize: 18 }} />
          {t('teacher.porTemas')}
        </ToggleButton>
        <ToggleButton value="nivel">
          <BarChartIcon sx={{ mr: 1, fontSize: 18 }} />
          {t('teacher.porNivel')}
        </ToggleButton>
      </ToggleButtonGroup>

      {ejercicios.length === 0 ? (
        <Typography color="text.secondary">{t('teacher.sinInvitaciones')}</Typography>
      ) : (
        grouped.map(([grupo, items]) => (
          <Accordion
            key={grupo}
            expanded={expandedGroup === grupo}
            onChange={(_, isExpanded) => setExpandedGroup(isExpanded ? grupo : false)}
            sx={{ mb: 1, borderRadius: '12px !important', overflow: 'hidden', '&::before': { display: 'none' }, boxShadow: 'none', border: 1, borderColor: 'divider' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 56, '&.Mui-expanded': { minHeight: 56 }, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1 }}>
                {expandedGroup === grupo ? (
                  <FolderOpenIcon sx={{ color: viewMode === 'nivel' ? nivelColor(grupo) : 'primary.main' }} />
                ) : (
                  <FolderIcon sx={{ color: viewMode === 'nivel' ? nivelColor(grupo) : 'primary.main' }} />
                )}
                <Typography sx={{ fontWeight: 800, flex: 1 }}>{grupo}</Typography>
                <Chip
                  label={`${items.length} ${t('teacher.ejerciciosMin')}`}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: viewMode === 'nivel' ? nivelColor(grupo) : 'primary.main', color: '#fff', height: 22 }}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List disablePadding>
                {items.map((ej) => (
                  <ListItemButton key={ej.id} sx={{ borderRadius: 0, py: 1, px: 3 }}>
                    <ListItemText
                      primary={ej.titulo?.es || ej.id}
                      secondary={viewMode === 'temas' ? ej.nivel : ej.categoria}
                      slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                    />
                    <Chip label={ej.nivel} size="small" color={ej.nivel === 'avanzado' ? 'error' : ej.nivel === 'intermedio' ? 'warning' : 'success'} />
                  </ListItemButton>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}

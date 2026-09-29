import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Stack, CircularProgress, ToggleButton, ToggleButtonGroup, Accordion, AccordionSummary, AccordionDetails, Card, CardContent, Radio, RadioGroup, FormControlLabel, FormControl, Button, Chip, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { courseService } from '../../services/courseService';

interface TestQuestion {
  id: string;
  titulo: string;
  descripcion: string;
  nivel: 'básico' | 'intermedio' | 'avanzado';
  categoria: string;
  choices: { label: string; correct: boolean }[];
}

function nivelFromDifficulty(d: string): 'básico' | 'intermedio' | 'avanzado' {
  if (d === 'easy' || d === 'basico' || d === 'básico') return 'básico';
  if (d === 'hard' || d === 'avanzado') return 'avanzado';
  return 'intermedio';
}

type ViewMode = 'temas' | 'nivel';

const nivelColor = (nivel: string) => nivel === 'avanzado' ? 'error.main' : nivel === 'intermedio' ? 'warning.main' : 'success.main';

export default function Test() {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('temas');
  const [expandedGroup, setExpandedGroup] = useState<string | false>('');
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const cursos = await courseService.getAllCourses();
        if (!cursos.length) return;
        const detail = await courseService.getFullCourseDetail(cursos[0].slug!);
        const topics = detail.content || [];
        const all: TestQuestion[] = [];
        topics.forEach((topic: any) => {
          (topic.subTopics || []).forEach((st: any) => {
            if (st.choices && Array.isArray(st.choices) && st.choices.length > 0) {
              all.push({
                id: st.problemSlug || st.subtitle || Math.random().toString(),
                titulo: st.subtitle || '',
                descripcion: st.text || '',
                nivel: nivelFromDifficulty(st.difficulty || ''),
                categoria: topic.title || '',
                choices: st.choices,
              });
            }
          });
        });
        setQuestions(all);
      } catch {
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    if (viewMode === 'temas') {
      const map = new Map<string, TestQuestion[]>();
      questions.forEach((q) => {
        const key = q.categoria || t('teacher.sinCategoria');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(q);
      });
      return Array.from(map.entries());
    } else {
      const order = ['básico', 'intermedio', 'avanzado'];
      const map = new Map<string, TestQuestion[]>();
      questions.forEach((q) => {
        const key = q.nivel;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(q);
      });
      return Array.from(map.entries()).sort((a, b) => {
        const ia = order.indexOf(a[0]);
        const ib = order.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    }
  }, [questions, viewMode, t]);

  const toggleAnswer = (id: string) => {
    setShowAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>{t('teacher.test')}</Typography>

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

      {questions.length === 0 ? (
        <Alert severity="info">{t('teacher.sinTests')}</Alert>
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
                  label={`${items.length} ${t('teacher.testMin')}`}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: viewMode === 'nivel' ? nivelColor(grupo) : 'primary.main', color: '#fff', height: 22 }}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Stack spacing={2} sx={{ p: 2 }}>
                {items.map((q) => (
                  <Card key={q.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>{q.titulo}</Typography>
                        <Chip label={q.nivel} size="small" color={q.nivel === 'avanzado' ? 'error' : q.nivel === 'intermedio' ? 'warning' : 'success'} />
                      </Stack>

                      {q.descripcion && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{q.descripcion}</Typography>
                      )}

                      <FormControl component="fieldset" sx={{ width: '100%' }}>
                        <RadioGroup>
                          {q.choices.map((choice, idx) => {
                            const isCorrect = choice.correct;
                            const revealed = showAnswers[q.id];
                            return (
                              <FormControlLabel
                                key={idx}
                                value={idx}
                                control={<Radio size="small" disabled />}
                                label={
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: revealed && isCorrect ? 700 : 400 }}>
                                      {choice.label}
                                    </Typography>
                                    {revealed && isCorrect && (
                                      <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                                    )}
                                  </Stack>
                                }
                                sx={{
                                  mb: 0.5,
                                  mx: 0,
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.25,
                                  bgcolor: revealed && isCorrect ? 'success.main' + '15' : 'transparent',
                                  border: 1,
                                  borderColor: revealed && isCorrect ? 'success.main' : 'divider',
                                }}
                              />
                            );
                          })}
                        </RadioGroup>
                      </FormControl>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => toggleAnswer(q.id)}
                        sx={{ mt: 1.5, textTransform: 'none', borderRadius: 2 }}
                        startIcon={showAnswers[q.id] ? <CheckCircleIcon /> : undefined}
                      >
                        {showAnswers[q.id] ? t('teacher.ocultarRespuesta') : t('teacher.mostrarRespuesta')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}

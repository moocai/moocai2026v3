import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Stack, CircularProgress, ToggleButton, ToggleButtonGroup, Accordion, AccordionSummary, AccordionDetails, Card, CardContent, Radio, RadioGroup, FormControlLabel, FormControl, Button, Chip, Alert, alpha, useTheme } from '@mui/material';
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
  choices: any[];
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
  const theme = useTheme();
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
                titulo: typeof st.subtitle === 'object' ? (st.subtitle.es || st.subtitle.ca || st.subtitle.en || '') : (st.subtitle || ''),
                descripcion: typeof st.text === 'object' ? (st.text.es || st.text.ca || st.text.en || '') : (st.text || ''),
                nivel: nivelFromDifficulty(st.difficulty || ''),
                categoria: typeof topic.title === 'object' ? (topic.title.es || topic.title.ca || topic.title.en || '') : (topic.title || ''),
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
                        <Box 
                          sx={{ 
                            mb: 2,
                            '& p': { color: 'text.secondary', lineHeight: 1.8, mb: 2, m: 0 },
                            '& .codehilite': { 
                              bgcolor: alpha(theme.palette.primary.main, 0.05), 
                              p: 2, 
                              borderRadius: 1, 
                              overflow: 'auto',
                              '& pre': { m: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem', lineHeight: 1.6 },
                              '& code': { color: 'text.primary' },
                            },
                            '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem' },
                          }}
                          dangerouslySetInnerHTML={{ __html: q.descripcion }}
                        />
                      )}

                      <FormControl component="fieldset" sx={{ width: '100%' }}>
                        <RadioGroup>
                          {q.choices.map((choice: any, idx: number) => {
                            const isCorrect = choice.correct || choice.is_correct;
                            const revealed = showAnswers[q.id];
                            const html = choice.textHtml || choice.text || choice.label || '';
                            
                            return (
                              <Box
                                key={idx}
                                sx={{
                                  mb: 1,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: revealed && isCorrect ? alpha('#4caf50', 0.15) : 'transparent',
                                  border: 1,
                                  borderColor: revealed && isCorrect ? 'success.main' : 'divider',
                                }}
                              >
                                <FormControlLabel
                                  control={<Radio size="small" disabled />}
                                  label={
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                      <Box 
                                        sx={{ 
                                          flex: 1,
                                          '& p': { m: 0, lineHeight: 1.6 },
                                          '& .codehilite': { 
                                            bgcolor: alpha(theme.palette.primary.main, 0.05), 
                                            p: 1.5, 
                                            borderRadius: 1, 
                                            overflow: 'auto',
                                            '& pre': { m: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.8rem', lineHeight: 1.5 },
                                            '& code': { color: 'text.primary' },
                                          },
                                          '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem' },
                                        }}
                                        dangerouslySetInnerHTML={{ __html: html }}
                                      />
                                      {revealed && isCorrect && (
                                        <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main', flexShrink: 0 }} />
                                      )}
                                    </Stack>
                                  }
                                  sx={{ mx: 0, width: '100%' }}
                                />
                              </Box>
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
                        {showAnswers[q.id] ? t('teacher.ocultarRespuesta', 'Ocultar respuesta') : t('teacher.mostrarRespuesta', 'Mostrar respuesta')}
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

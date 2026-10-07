import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, useTheme, alpha, Paper, Radio, Checkbox, IconButton, ButtonBase, RadioGroup, FormControlLabel, FormControl, FormGroup } from '@mui/material';
import { ChevronLeft, ChevronRight, Zap, CircleCheck, CircleX,} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCourse } from '../../hooks/useCourse';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getProgressKey = () => {
  let studentId = 'temp';
  try {
    const savedStudent = localStorage.getItem('currentStudent');
    if (savedStudent) {
      const parsedStudent = JSON.parse(savedStudent);
      if (parsedStudent?.id) studentId = parsedStudent.id;
    }
  } catch { studentId = 'temp'; }
  return `mooc_global_progress_${studentId}`;
};

export default function TopicTestPage() {
  const { courseId, challengeSlug } = useParams<{ courseId: string; challengeSlug: string }>();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { data: course } = useCourse(courseId);

  const [loading, setLoading] = useState(true);
  const [topicTests, setTopicTests] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [topicTest, setTopicTest] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const [progress, setProgress] = useState<Record<string, any>>({});

  const resultRef = useRef<HTMLDivElement>(null);

  const lang = i18n.language?.split('-')[0] || 'ca';

  const getText = useCallback((field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.ca || field.es || field.en || '';
  }, [lang]);

  // Progrés dels tests (encertat / intentat) per pintar el navegador de preguntes
  useEffect(() => {
    const load = () => {
      try { setProgress(JSON.parse(localStorage.getItem(getProgressKey()) || '{}')); } catch { setProgress({}); }
    };
    load();
    window.addEventListener('lessonProgressUpdated', load);
    return () => window.removeEventListener('lessonProgressUpdated', load);
  }, []);

  // Fa scroll fins al feedback just després d'enviar
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [result]);

  useEffect(() => {
    if (!courseId || !challengeSlug || !course) return;

    const topic = course.content?.find((t: any) => (t.subTopics || []).some((st: any) => st.problemSlug === challengeSlug));
    const tests = topic?.subTopics?.filter((st: any) => st.type === 'test') || [];
    setTopicTests(tests);

    const initialIdx = tests.findIndex((st: any) => st.problemSlug === challengeSlug);
    if (initialIdx !== -1) {
      setCurrentIdx(initialIdx);
    }
  }, [courseId, challengeSlug, course]);

  const currentTestSlug = topicTests[currentIdx]?.problemSlug || challengeSlug;

  useEffect(() => {
    if (!courseId || !currentTestSlug || !course) return;
    let cancelled = false;

    const loadTopicTest = async () => {
      try {
        setLoading(true);
        setResult(null);
        setSelectedAnswers([]);

        const topic = course.content?.find((t: any) => (t.subTopics || []).some((st: any) => st.problemSlug === currentTestSlug));
        const problem = topic?.subTopics?.find((st: any) => st.problemSlug === currentTestSlug);

        // Sense fallback: si el problema no és dins del tema, el test es mostra
        // com a "no trobat". L'antiga crida amb `topic?.id || ''` construïa
        // `/topics//problems/<slug>/` (404) i acabava en el mateix resultat.
        if (!cancelled) setTopicTest(problem || null);
      } catch (error) {
        console.error('Error loading topic test:', error);
        if (!cancelled) setTopicTest(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTopicTest();
    return () => { cancelled = true; };
  }, [courseId, currentTestSlug, course]);

  // Comprova la resposta al moment, sense enviar res al backend
  const evaluate = (answers: string[]) => {
    const correctSet = new Set<string>(
      (choices as any[]).filter((c: any) => c.is_correct).map((c: any) => String(c.id))
    );
    if (correctSet.size === 0) {
      setResult({ error: t('topic_test.no_solution', "No es pot comprovar la resposta: el test no inclou la solució") });
      return;
    }

    const passed = answers.length === correctSet.size && answers.every((a) => correctSet.has(a));
    setResult({ correct: passed });

    if (!courseId || !currentTestSlug) return;
    const progressKey = getProgressKey();
    let progress: Record<string, any> = {};
    try { progress = JSON.parse(localStorage.getItem(progressKey) || '{}'); } catch { progress = {}; }

    const challengeKey = `${courseId}_${currentTestSlug}`;
    if (passed) progress[challengeKey] = true;
    else if (progress[challengeKey] !== true) progress[challengeKey] = 'attempted';

    localStorage.setItem(progressKey, JSON.stringify(progress));
    window.dispatchEvent(new Event('lessonProgressUpdated'));
  };

  const handleCheckboxChange = (value: string, checked: boolean) => {
    if (answered) return;
    setSelectedAnswers((prev) => checked
      ? (prev.includes(value) ? prev : [...prev, value])
      : prev.filter((answer) => answer !== value));
  };

  const handleRadioChange = (value: string) => {
    if (answered) return;
    setSelectedAnswers([value]);
  };

  // L'alumne decideix quan enviar: cal haver marcat almenys una opció
  const handleSubmit = () => {
    if (answered || selectedAnswers.length === 0) return;
    evaluate(selectedAnswers);
  };

  const handleRetry = () => {
    setResult(null);
    setSelectedAnswers([]);
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= topicTests.length || idx === currentIdx) return;
    setCurrentIdx(idx);
    window.scrollTo({ top: 0 });
  };

  // Dreceres de teclat: ←/→ canvien de test, Enter envia (o torna-ho a provar)
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && (target as HTMLInputElement).type !== 'radio' && (target as HTMLInputElement).type !== 'checkbox')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIdx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIdx + 1); }
    else if (e.key === 'Enter' && !target?.closest('button, a')) {
      if (answered) { e.preventDefault(); handleRetry(); }
      else if (selectedAnswers.length > 0) { e.preventDefault(); handleSubmit(); }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading && !topicTest) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  }

  if (!topicTest) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>{t('topic_test.not_found', 'Test no trobat')}</Typography></Box>;
  }

  const title = topicTest.title || topicTest.name || getText(topicTest.subtitle) || currentTestSlug;
  const statement = topicTest.statement_ca || topicTest.statement || topicTest.description || getText(topicTest.text) || '';
  const fixtureData = (window as any).EXAM_DATA?.[currentTestSlug || ''];
  const rawChoices = fixtureData?.options || topicTest.choices || [];

  const choices = fixtureData ? rawChoices.map((option: any) => ({
    id: option.id,
    is_correct: option.id === fixtureData.correctAnswerId,
    textHtml: `<p>${option.text}</p>`,
  })) : rawChoices;

  const correctCount = choices.filter((choice: any) => choice.is_correct).length;
  const isMultiChoice = correctCount > 1;

  // ---- Feedback just després d'enviar ----
  const answered = !!result && !result.error;

  // Si el backend retorna result.choices el fem servir; si no, caiem a les opcions locals
  const reviewChoices: any[] = Array.isArray(result?.choices) ? result.choices : [];
  const correctChoices: any[] = (reviewChoices.length ? reviewChoices : choices).filter((c: any) => c.is_correct);
  const correctIds = new Set<string>(correctChoices.map((c: any) => String(c.id)));

  const choiceState = (value: string): 'correct' | 'wrong' | null => {
    if (!answered) return null;
    if (correctIds.has(value)) return 'correct';
    if (selectedAnswers.includes(value)) return 'wrong';
    return null;
  };

  const choiceSx = (value: string, checked: boolean) => {
    const state = choiceState(value);
    const color = state === 'correct' ? theme.palette.success.main
      : state === 'wrong' ? theme.palette.error.main
      : checked ? '#8400ff' : null;
    return {
      p: 0.5,
      borderRadius: 1,
      borderWidth: state ? 2 : 1,
      borderColor: color ?? 'divider',
      bgcolor: color ? alpha(color, 0.08) : 'transparent',
    };
  };

  const choiceBadge = (value: string) => {
    const state = choiceState(value);
    if (!state) return null;
    const isSel = selectedAnswers.includes(value);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 4, mb: 0.5, fontSize: '0.75rem', fontWeight: 700, color: state === 'correct' ? 'success.main' : 'error.main' }}>
        {state === 'correct' ? <CircleCheck size={14} /> : <CircleX size={14} />}
        {state === 'correct'
          ? (isSel ? t('topic_test.your_correct', 'Has encertat!') : t('topic_test.was_correct', 'Era la resposta correcta'))
          : t('topic_test.your_wrong', 'La teva resposta')}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1.5, sm: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
        {/* Botó de tornar enrere */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button component={RouterLink} to={`/courses/${courseId}`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
            {course ? (typeof course.title === 'string' ? course.title : getText(course.title) || '') : t('lesson.back', 'Tornar')}
          </Button>
        </Box>

        {/* Navegador de tests: posició fixa (no depèn del nombre d'opcions) */}
        {topicTests.length > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <IconButton aria-label={t('topic_test.prev', 'Anterior')} title={`${t('topic_test.prev', 'Anterior')} (←)`} onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <ChevronLeft size={18} />
            </IconButton>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              {topicTests.map((st: any, idx: number) => {
                const status = progress[`${courseId}_${st.problemSlug}`];
                const isCurrent = idx === currentIdx;
                const color = status === true ? theme.palette.success.main : status === 'attempted' ? theme.palette.error.main : null;
                return (
                  <ButtonBase
                    key={st.problemSlug}
                    onClick={() => goTo(idx)}
                    aria-current={isCurrent ? 'step' : undefined}
                    title={st.title || st.name || getText(st.subtitle) || st.problemSlug}
                    sx={{
                      minWidth: 32, height: 32, px: 0.5, borderRadius: 1, fontSize: '0.8rem', fontWeight: 800,
                      border: isCurrent ? '2px solid #8400ff' : '1px solid',
                      borderColor: isCurrent ? '#8400ff' : (color ?? 'divider'),
                      bgcolor: color ? alpha(color, 0.15) : 'transparent',
                      color: color ?? 'text.primary',
                    }}
                  >
                    {idx + 1}
                  </ButtonBase>
                );
              })}
            </Box>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}>{currentIdx + 1} / {topicTests.length}</Typography>
            <IconButton aria-label={t('topic_test.next_short', 'Següent')} title={`${t('topic_test.next_short', 'Següent')} (→)`} onClick={() => goTo(currentIdx + 1)} disabled={currentIdx >= topicTests.length - 1} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <ChevronRight size={18} />
            </IconButton>
          </Box>
        )}

        {/* Títol principal */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, flex: 1 }}>{title}</Typography>
        </Box>

        {/* Contingut amb scroll vertical natural */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3, mb: 3 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('topic_test.statement', 'Enunciat')}</Typography>
            <Box sx={{ '& p': { color: 'text.secondary', lineHeight: 1.8, mb: 2 }, '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem', wordBreak: 'break-all' } }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{statement}</ReactMarkdown>
            </Box>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                {isMultiChoice ? t('topic_test.multi_choice', 'Test de selecció múltiple') : t('topic_test.choose_answer', "Test d'elecció única")}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: topicTest.difficulty === 'hard' ? 'error.main' : topicTest.difficulty === 'medium' ? 'warning.main' : 'success.main' }}>
                <Zap size={16} fill={topicTest.difficulty === 'hard' ? 'error.main' : topicTest.difficulty === 'medium' ? 'warning.main' : 'success.main'} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{topicTest.difficulty}</Typography>
              </Box>
            </Box>

            <FormControl disabled={answered} fullWidth>
              {isMultiChoice ? (
                <FormGroup>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: choices.length > 6 ? '1fr 1fr' : '1fr' }, gap: 1 }}>
                    {choices.map((choice: any, index: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : String(choice.id ?? choice.value ?? index);
                      const checked = selectedAnswers.includes(value);
                      return (
                        <Paper key={value} variant="outlined" sx={choiceSx(value, checked)}>
                          <FormControlLabel
                            control={<Checkbox checked={checked} onChange={(event) => handleCheckboxChange(value, event.target.checked)} sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }} dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1, width: '100%', mr: 0 }}
                          />
                          {choiceBadge(value)}
                        </Paper>
                      );
                    })}
                  </Box>
                </FormGroup>
              ) : (
                <RadioGroup value={selectedAnswers[0] || ''} onChange={(event) => handleRadioChange(event.target.value)}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: choices.length > 6 ? '1fr 1fr' : '1fr' }, gap: 1 }}>
                    {choices.map((choice: any, index: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : String(choice.id ?? choice.value ?? index);
                      const checked = selectedAnswers[0] === value;
                      return (
                        <Paper key={value} variant="outlined" sx={choiceSx(value, checked)}>
                          <FormControlLabel
                            value={value}
                            control={<Radio sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }} dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1, width: '100%', mr: 0 }}
                          />
                          {choiceBadge(value)}
                        </Paper>
                      );
                    })}
                  </Box>
                </RadioGroup>
              )}
            </FormControl>

            {/* Enviament */}
            <Box ref={resultRef} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mt: 3, gap: 1.5 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: answered ? (result.correct ? 'success.main' : 'error.main') : 'text.secondary' }}>
                {answered
                  ? (result.correct ? t('topic_test.result_correct', 'Correcte!') : t('topic_test.result_wrong', 'Incorrecte'))
                  : isMultiChoice
                    ? `${t('topic_test.pick_n', 'Tria {{count}} opcions', { count: correctCount })} (${selectedAnswers.length}/${correctCount})`
                    : ''}
                {result?.error && <Box component="span" sx={{ color: 'error.main' }}>{result.error}</Box>}
              </Typography>
              {answered ? (
                <Button variant="outlined" onClick={handleRetry} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
                  {t('topic_test.retry', 'Torna-ho a provar')}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleSubmit} disabled={selectedAnswers.length === 0} sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, bgcolor: '#8400ff', color: '#fff', '&:hover': { bgcolor: '#6a00cc' } }}>
                  {t('topic_test.submit', 'Envia')}
                </Button>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
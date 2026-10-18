import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button, CircularProgress, useTheme, alpha, Paper, Radio, Checkbox, ButtonBase, RadioGroup, FormControlLabel, FormControl, FormGroup } from '@mui/material';
import { ChevronLeft, ChevronRight, Zap, CircleCheck, CircleX,} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveSlug } from '../../hooks/useCourse';
import { courseService, mapProblem } from '../../services/courseService';
import { refreshCoursePoints } from '../../utils/pointsSync';
import { answerKey, isLoggedIn, readAllSavedAnswers, readSavedAnswer, saveAnswers, syncTopicAnswers } from '../../services/topicTestAnswers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TopicTestPage() {
  const { courseId, challengeSlug } = useParams<{ courseId: string; challengeSlug: string }>();
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get('topic');
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [courseTitle, setCourseTitle] = useState<any>(null);
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [topicTests, setTopicTests] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Respostes desades d'aquest usuari: pinten el navegador de preguntes (mateixa font que les opcions)
  const [savedAnswers, setSavedAnswers] = useState<Record<string, any>>({});

  const resultRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lang = i18n.language?.split('-')[0] || 'ca';
  const courseSlug = courseId ? resolveSlug(courseId) : '';

  const getText = useCallback((field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.ca || field.es || field.en || '';
  }, [lang]);

  useEffect(() => {
    const load = () => setSavedAnswers(readAllSavedAnswers());
    load();
    window.addEventListener('lessonProgressUpdated', load);
    return () => window.removeEventListener('lessonProgressUpdated', load);
  }, []);

  // Fa scroll fins al resultat just després d'enviar (no quan es restaura un test ja respost)
  useEffect(() => {
    if (result?.fresh) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  // Càrrega mínima: el títol del curs i els problemes d'UN sol tema (no tot el curs).
  // El tema ve a la URL (?topic=); si no hi és, es treu del detall del curs en cache
  // (p. ex. si venim de LessonPage) i, com a últim recurs, es carrega el detall complet.
  useEffect(() => {
    if (!courseId || !challengeSlug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const cached: any = queryClient.getQueryData(['course', courseId]);
        if (cached?.title) setCourseTitle(cached.title);
        else queryClient.fetchQuery({
          queryKey: ['course-info', courseSlug],
          queryFn: () => courseService.getCourseBySlug(courseSlug),
          staleTime: 30 * 60 * 1000,
        }).then((c: any) => { if (!cancelled) setCourseTitle(c?.name ?? null); }).catch(() => {});

        let tSlug = topicParam;
        if (!tSlug) {
          const detail: any = cached ?? await queryClient.fetchQuery({
            queryKey: ['course', courseId],
            queryFn: () => courseService.getFullCourseDetail(courseSlug),
            staleTime: 30 * 60 * 1000,
          });
          tSlug = detail?.content?.find((tp: any) => (tp.subTopics || []).some((st: any) => st.problemSlug === challengeSlug))?.id ?? null;
        }
        if (!tSlug) { if (!cancelled) setNotFound(true); return; }

        // Sempre fresca: un cop respost un test, la llista inclou `is_correct` de les seves opcions
        // (fetchQuery amb staleTime 0: sempre fresca, però fusiona peticions simultànies)
        const problems: any[] = await queryClient.fetchQuery({
          queryKey: ['topic-problems', courseSlug, tSlug],
          queryFn: () => courseService.getTopicProblems(courseSlug, tSlug!),
          staleTime: 0,
        });
        if (cancelled) return;
        const tests = problems.filter((p: any) => p.type === 'test');
        const idx = tests.findIndex((p: any) => p.slug === challengeSlug);
        if (idx === -1) { setNotFound(true); return; }

        await syncTopicAnswers(courseId, courseSlug, tSlug, tests);
        if (cancelled) return;
        setTopicSlug(tSlug);
        setTopicTests(tests.map(mapProblem));
        setCurrentIdx(idx);
      } catch (error) {
        console.error('Error loading topic test:', error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, challengeSlug, topicParam]);

  const topicTest = topicTests[currentIdx] || null;
  const currentTestSlug = topicTest?.problemSlug || challengeSlug;

  // En canviar de test: es restaura la resposta desada (si n'hi ha) — sense cap petició
  useEffect(() => {
    setSubmitError(null);
    const saved = topicTest && courseId ? readSavedAnswer(answerKey(courseId, topicTest.problemSlug), topicTest.choices) : null;
    setSelectedAnswers(saved ? saved.answers.map(String) : []);
    setResult(saved ? { correct: saved.correct, choices: saved.choices || [] } : null);
  }, [topicTest, courseId]);

  // Envia la resposta al servidor, que la corregeix i retorna totes les opcions amb la correcció
  const submitAnswers = async (answers: string[]) => {
    if (!courseId || !currentTestSlug || !topicSlug) return;
    let correct: boolean;
    let review: any[];
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await courseService.submitChallenge(courseSlug, topicSlug, currentTestSlug, {
        answers: answers.map((a) => (/^\d+$/.test(a) ? Number(a) : a)) as any,
      });
      correct = !!res?.correct;
      review = Array.isArray(res?.choices) ? res.choices : [];
    } catch (error: any) {
      const status = error?.response?.status;
      setSubmitError(status === 429 || status === 503
        ? t('topic_test.submit_busy', 'El servidor està ocupat. Torna-ho a provar d\'aquí a una estona.')
        : t('topic_test.submit_error', "No s'ha pogut enviar la resposta."));
      return;
    } finally {
      setSubmitting(false);
    }

    setResult({ correct, choices: review, fresh: true });
    saveAnswers({ [answerKey(courseId, currentTestSlug)]: { answers, correct, choices: review } });
    if (isLoggedIn()) void refreshCoursePoints(courseSlug, correct ? 4 : 0);
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
    if (answered || submitting || loading || selectedAnswers.length === 0) return;
    void submitAnswers(selectedAnswers);
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= topicTests.length || idx === currentIdx) return;
    setCurrentIdx(idx);
    scrollRef.current?.scrollTo({ top: 0 });
    // La URL segueix el test actual (per recarregar o compartir) sense tornar a carregar la pàgina
    const slug = topicTests[idx]?.problemSlug;
    if (slug && courseId && topicSlug) {
      window.history.replaceState(window.history.state, '', `/courses/${courseId}/test/${slug}?topic=${encodeURIComponent(topicSlug)}`);
    }
  };

  // Dreceres de teclat: ←/→ canvien de test, Enter envia (o passa al següent si ja s'ha respost)
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && (target as HTMLInputElement).type !== 'radio' && (target as HTMLInputElement).type !== 'checkbox')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIdx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIdx + 1); }
    else if (e.key === 'Enter' && !target?.closest('button, a')) {
      if (answered) { e.preventDefault(); goTo(currentIdx + 1); }
      else if (selectedAnswers.length > 0) { e.preventDefault(); handleSubmit(); }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  }

  if (notFound || !topicTest) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>{t('topic_test.not_found', 'Test no trobat')}</Typography></Box>;
  }

  const title = topicTest.title || topicTest.name || getText(topicTest.subtitle) || currentTestSlug;
  const statement = topicTest.statement_ca || topicTest.statement || topicTest.description || getText(topicTest.text) || '';
  const choices: any[] = topicTest.choices || [];

  const isMultiChoice = topicTest.choiceType
    ? topicTest.choiceType === 'multi'
    : choices.filter((choice: any) => choice.is_correct).length > 1;

  // ---- Feedback just després d'enviar ----
  const answered = !!result;

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

  // Icona a la dreta de l'opció (sense línia de text extra): ✓ correcta, ✗ triada i incorrecta
  const choiceIcon = (value: string) => {
    const state = choiceState(value);
    if (!state) return null;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', pr: 1.5, color: state === 'correct' ? 'success.main' : 'error.main', flexShrink: 0 }}
        aria-label={state === 'correct' ? t('topic_test.correct_option', 'Opció correcta') : t('topic_test.wrong_option', 'Opció incorrecta')}>
        {state === 'correct' ? <CircleCheck size={22} /> : <CircleX size={22} />}
      </Box>
    );
  };

  // Explicació del professor (si n'hi ha), un cop respost
  const choiceExplanation = (value: string) => {
    if (!answered) return null;
    const review = reviewChoices.find((c: any) => String(c.id) === value);
    const explanation = review?.explanation_html || review?.explanationHtml || '';
    if (!explanation) return null;
    return <Box sx={{ ml: 5.5, mr: 2, mb: 1, fontSize: '0.85rem', color: 'text.secondary', '& p': { m: 0 } }} dangerouslySetInnerHTML={{ __html: explanation }} />;
  };

  return (
    // El MainLayout dona una alçada fixa amb overflow ocult: el scroll ha de ser aquí dins
    <Box ref={scrollRef} sx={{ width: '100%', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1.5, sm: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
        {/* Botó de tornar enrere */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button component={RouterLink} to={`/courses/${courseId}`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
            {getText(courseTitle) || t('lesson.back', 'Tornar')}
          </Button>
        </Box>

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
            {/* Navegador de preguntes: a dalt de la targeta, posició fixa (no depèn del nombre d'opcions) */}
            {topicTests.length > 1 && (
              <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography sx={{ flex: 1, fontSize: '0.85rem', fontWeight: 800, color: 'text.secondary' }}>
                    {t('topic_test.question_n_of', 'Pregunta {{n}} de {{total}}', { n: currentIdx + 1, total: topicTests.length })}
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<ChevronLeft size={16} />} onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0} title="←" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5, color: 'text.primary', borderColor: 'divider' }}>
                    {t('topic_test.prev', 'Anterior')}
                  </Button>
                  <Button size="small" variant="outlined" endIcon={<ChevronRight size={16} />} onClick={() => goTo(currentIdx + 1)} disabled={currentIdx >= topicTests.length - 1} title="→" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5, color: 'text.primary', borderColor: 'divider' }}>
                    {t('topic_test.next_short', 'Següent')}
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {topicTests.map((st: any, idx: number) => {
                    const saved = savedAnswers[`${courseId}_${st.problemSlug}`];
                    const status = saved?.correct === true ? true : saved?.correct === false ? 'attempted' : null;
                    const isCurrent = idx === currentIdx;
                    const color = status === true ? theme.palette.success.main : status === 'attempted' ? theme.palette.error.main : null;
                    const statusLabel = status === true ? t('topic_test.status_correct', 'encertada')
                      : status === 'attempted' ? t('topic_test.status_wrong', 'fallada')
                      : t('topic_test.status_pending', 'pendent');
                    return (
                      <ButtonBase
                        key={st.problemSlug}
                        onClick={() => goTo(idx)}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-label={`${t('topic_test.question', 'Pregunta')} ${idx + 1}: ${statusLabel}`}
                        title={`${idx + 1}. ${st.title || st.name || getText(st.subtitle) || st.problemSlug} (${statusLabel})`}
                        sx={{
                          minWidth: 30, height: 30, px: 0.5, borderRadius: 1, fontSize: '0.8rem', fontWeight: 800,
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
              </Box>
            )}

            <Box ref={resultRef} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                {/* Resultat global del test: icona al costat del títol, sense línies extra */}
                {answered && result.correct !== null && (
                  <Box component="span" role="img"
                    aria-label={result.correct ? t('topic_test.result_correct', 'Resposta correcta') : t('topic_test.result_wrong', 'Resposta incorrecta')}
                    title={result.correct ? t('topic_test.result_correct', 'Resposta correcta') : t('topic_test.result_wrong', 'Resposta incorrecta')}
                    sx={{ display: 'flex', color: result.correct ? 'success.main' : 'error.main' }}>
                    {result.correct ? <CircleCheck size={26} /> : <CircleX size={26} />}
                  </Box>
                )}
                {isMultiChoice ? t('topic_test.multi_choice', 'Test de selecció múltiple') : t('topic_test.choose_answer', "Test d'elecció única")}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: topicTest.difficulty === 'hard' ? 'error.main' : topicTest.difficulty === 'medium' ? 'warning.main' : 'success.main' }}>
                <Zap size={16} fill={topicTest.difficulty === 'hard' ? 'error.main' : topicTest.difficulty === 'medium' ? 'warning.main' : 'success.main'} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{topicTest.difficulty}</Typography>
              </Box>
            </Box>

            <FormControl disabled={answered || loading} fullWidth>
              {isMultiChoice ? (
                <FormGroup>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: choices.length > 6 ? '1fr 1fr' : '1fr' }, gap: 1 }}>
                    {choices.map((choice: any, index: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : String(choice.id ?? choice.value ?? index);
                      const checked = selectedAnswers.includes(value);
                      return (
                        <Paper key={value} variant="outlined" sx={choiceSx(value, checked)}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            control={<Checkbox checked={checked} onChange={(event) => handleCheckboxChange(value, event.target.checked)} sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }} dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1, mr: 0, flex: 1 }}
                          />
                          {choiceIcon(value)}
                          </Box>
                          {choiceExplanation(value)}
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            value={value}
                            control={<Radio sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }} dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1, mr: 0, flex: 1 }}
                          />
                          {choiceIcon(value)}
                          </Box>
                          {choiceExplanation(value)}
                        </Paper>
                      );
                    })}
                  </Box>
                </RadioGroup>
              )}
            </FormControl>

            {/* Enviament */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mt: 3, gap: 1.5 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'error.main' }}>{submitError ?? ''}</Typography>
              {answered ? (
                currentIdx < topicTests.length - 1 && (
                  <Button variant="contained" onClick={() => goTo(currentIdx + 1)} endIcon={<ChevronRight size={16} />} sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, bgcolor: '#8400ff', color: '#fff', '&:hover': { bgcolor: '#6a00cc' } }}>
                    {t('topic_test.next_question', 'Següent pregunta')}
                  </Button>
                )
              ) : (
                <Button variant="contained" onClick={handleSubmit} disabled={selectedAnswers.length === 0 || submitting || loading} startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined} sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, bgcolor: '#8400ff', color: '#fff', '&:hover': { bgcolor: '#6a00cc' } }}>
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
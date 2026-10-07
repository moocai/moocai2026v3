import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, useTheme, alpha, Paper, Radio, Checkbox, ButtonBase, RadioGroup, FormControlLabel, FormControl, FormGroup } from '@mui/material';
import { ChevronLeft, ChevronRight, Zap, CircleCheck, CircleX,} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCourse } from '../../hooks/useCourse';
import { courseService } from '../../services/courseService';
import { refreshCoursePoints } from '../../utils/pointsSync';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getStudentId = () => {
  let studentId = 'temp';
  try {
    const savedStudent = localStorage.getItem('currentStudent');
    if (savedStudent) {
      const parsedStudent = JSON.parse(savedStudent);
      if (parsedStudent?.id) studentId = parsedStudent.id;
    }
  } catch { studentId = 'temp'; }
  return studentId;
};

const getProgressKey = () => `mooc_global_progress_${getStudentId()}`;
// Respostes enviades per test, per usuari: { answers, correct, choices }.
// Com que només hi ha un intent, una resposta desada no canvia mai: si hi és, no cal
// preguntar al servidor. Per a usuaris sense sessió és l'única còpia (el servidor no
// desa res seu en cursos públics).
const getAnswersKey = () => `mooc_test_answers_${getStudentId()}`;
const readSavedAnswer = (key: string) => {
  const saved = readJson(getAnswersKey())[key];
  return saved && Array.isArray(saved.answers) ? saved : null;
};
const writeSavedAnswers = (entries: Record<string, { answers: string[]; correct: boolean | null; choices: any[] }>) => {
  const answersKey = getAnswersKey();
  localStorage.setItem(answersKey, JSON.stringify({ ...readJson(answersKey), ...entries }));
};
const isLoggedIn = () => !!localStorage.getItem('token');

const readJson = (key: string): Record<string, any> => {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Respostes desades d'aquest usuari: pinten el navegador de preguntes (mateixa font que les opcions)
  const [savedAnswers, setSavedAnswers] = useState<Record<string, any>>({});

  // false mentre es demanen al servidor les respostes que no hi ha desades localment
  const [serverReady, setServerReady] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const lang = i18n.language?.split('-')[0] || 'ca';

  const getText = useCallback((field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.ca || field.es || field.en || '';
  }, [lang]);

  useEffect(() => {
    const load = () => setSavedAnswers(readJson(getAnswersKey()));
    load();
    window.addEventListener('lessonProgressUpdated', load);
    return () => window.removeEventListener('lessonProgressUpdated', load);
  }, []);

  // Fa scroll fins al feedback just després d'enviar (no quan es restaura un test ja respost)
  useEffect(() => {
    if (result?.fresh) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  useEffect(() => {
    if (!courseId || !challengeSlug || !course) return;

    const topic = course.content?.find((t: any) => (t.subTopics || []).some((st: any) => st.problemSlug === challengeSlug));
    const tests = topic?.subTopics?.filter((st: any) => st.type === 'test') || [];
    setTopicTests(tests);
    loadTopicAnswers(topic?.id, tests);

    const initialIdx = tests.findIndex((st: any) => st.problemSlug === challengeSlug);
    if (initialIdx !== -1) {
      setCurrentIdx(initialIdx);
    }
  }, [courseId, challengeSlug, course]);

  const currentTestSlug = topicTests[currentIdx]?.problemSlug || challengeSlug;

  // Estat de tots els tests del tema, perquè el navegador de preguntes es pinti bé en
  // qualsevol dispositiu. Primer es mira què hi ha desat per a aquest usuari; només dels
  // tests sense resposta desada es pregunta al servidor (una petició per test, perquè l'API
  // no té endpoint per tema, més la llista de problemes fresca, que un cop respost inclou
  // `is_correct`).
  const topicLoadRef = useRef(0);
  function loadTopicAnswers(topicSlug: string | undefined, tests: any[]) {
    const run = ++topicLoadRef.current;
    const missing = tests.filter((st: any) => !readSavedAnswer(`${courseId}_${st.problemSlug}`));
    if (!isLoggedIn() || !courseId || !topicSlug || missing.length === 0) { setServerReady(true); return; }
    setServerReady(false);
    (async () => {
      const [problems, ...subs] = await Promise.all([
        courseService.getTopicProblems(courseId, topicSlug).catch(() => [] as any[]),
        ...missing.map((st: any) => courseService.getChallengeSubmissions(courseId, topicSlug, st.problemSlug).catch(() => [] as any[])),
      ]);
      if (run !== topicLoadRef.current) return;
      const found: Record<string, { answers: string[]; correct: boolean | null; choices: any[] }> = {};
      const progressKey = getProgressKey();
      const localProgress = readJson(progressKey);
      missing.forEach((st: any, i: number) => {
        const own = (subs[i] || []).find((sub: any) => Array.isArray(sub?.choices) && sub.choices.length > 0);
        if (!own) return;
        const answers = own.choices.map(String);
        const choices = (problems as any[]).find((p: any) => p.slug === st.problemSlug)?.choices || [];
        const correctIds = choices.filter((c: any) => c.is_correct).map((c: any) => String(c.id));
        const correct = correctIds.length > 0
          ? correctIds.length === answers.length && answers.every((id: string) => correctIds.includes(id))
          : null;
        const key = `${courseId}_${st.problemSlug}`;
        // Sense correcció (no hauria de passar) no es desa: així es torna a demanar
        if (correct === null) return;
        found[key] = { answers, correct, choices };
        localProgress[key] = correct ? true : 'attempted';
      });
      writeSavedAnswers(found);
      localStorage.setItem(progressKey, JSON.stringify(localProgress));
      window.dispatchEvent(new Event('lessonProgressUpdated'));
      setServerReady(true);
    })();
  }

  useEffect(() => {
    if (!courseId || !currentTestSlug || !course) return;
    let cancelled = false;

    const loadTopicTest = async () => {
      try {
        setLoading(true);
        setResult(null);
        setSubmitError(null);
        setSelectedAnswers([]);

        const topic = course.content?.find((t: any) => (t.subTopics || []).some((st: any) => st.problemSlug === currentTestSlug));
        const problem = topic?.subTopics?.find((st: any) => st.problemSlug === currentTestSlug);

        // Sense fallback: si el problema no és dins del tema, el test es mostra
        // com a "no trobat". L'antiga crida amb `topic?.id || ''` construïa
        // `/topics//problems/<slug>/` (404) i acabava en el mateix resultat.
        if (cancelled) return;
        setTopicTest(problem || null);
        if (!problem || !topic) return;

        // Si ja s'havia respost, es mostra la resposta i la correcció (només hi ha un intent).
        // Amb sessió cal esperar l'estat del servidor (loadTopicAnswers).
        if (isLoggedIn() && !serverReady) return;
        const saved = readSavedAnswer(`${courseId}_${currentTestSlug}`);
        if (saved) {
          setSelectedAnswers(saved.answers.map(String));
          setResult({ correct: saved.correct, choices: saved.choices || [] });
        }
      } catch (error) {
        console.error('Error loading topic test:', error);
        if (!cancelled) setTopicTest(null);
      } finally {
        if (!cancelled) setLoading(isLoggedIn() && !serverReady);
      }
    };

    loadTopicTest();
    return () => { cancelled = true; };
  }, [courseId, currentTestSlug, course, serverReady]);

  const saveProgress = (key: string, passed: boolean) => {
    const progressKey = getProgressKey();
    const progress = readJson(progressKey);
    progress[key] = passed ? true : 'attempted';
    localStorage.setItem(progressKey, JSON.stringify(progress));
    window.dispatchEvent(new Event('lessonProgressUpdated'));
  };

  // Envia la resposta al servidor, que la corregeix i retorna totes les opcions amb la correcció
  const submitAnswers = async (answers: string[]) => {
    if (!courseId || !currentTestSlug) return;
    const key = `${courseId}_${currentTestSlug}`;
    let correct: boolean;
    let review: any[];

    if (fixtureData) {
      // Fixture local antic (window.EXAM_DATA): es corregeix aquí mateix
      const correctIds = choices.filter((c: any) => c.is_correct).map((c: any) => String(c.id));
      correct = correctIds.length === answers.length && answers.every((a) => correctIds.includes(a));
      review = choices;
    } else {
      const topic = course?.content?.find((t: any) => (t.subTopics || []).some((st: any) => st.problemSlug === currentTestSlug));
      if (!topic) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await courseService.submitChallenge(courseId, topic.id, currentTestSlug, {
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
    }

    setResult({ correct, choices: review, fresh: true });
    writeSavedAnswers({ [key]: { answers, correct, choices: review } });
    saveProgress(key, correct);
    if (isLoggedIn()) void refreshCoursePoints(course?.slug || courseId, correct ? 4 : 0);
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
    window.scrollTo({ top: 0 });
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
    <Box sx={{ width: '100%', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1.5, sm: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
        {/* Botó de tornar enrere */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button component={RouterLink} to={`/courses/${courseId}`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
            {course ? (typeof course.title === 'string' ? course.title : getText(course.title) || '') : t('lesson.back', 'Tornar')}
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

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                {isMultiChoice ? t('topic_test.multi_choice', 'Test de selecció múltiple') : t('topic_test.choose_answer', "Test d'elecció única")}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: topicTest.difficulty === 'hard' ? 'error.main' : topicTest.difficulty === 'medium' ? 'warning.main' : 'success.main' }}>
                <Zap size={16} fill={topicTest.difficulty === 'hard' ? 'error.main' : topicTest.difficulty === 'medium' ? 'warning.main' : 'success.main'} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{topicTest.difficulty}</Typography>
              </Box>
            </Box>

            {/* Resultat del test: ben visible, abans de les opcions */}
            {answered && result.correct !== null && (
              <Box ref={resultRef} role="status" sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, borderRadius: 1.5, border: '2px solid',
                borderColor: result.correct ? 'success.main' : 'error.main',
                bgcolor: alpha(result.correct ? theme.palette.success.main : theme.palette.error.main, 0.12),
                color: result.correct ? 'success.main' : 'error.main',
              }}>
                {result.correct ? <CircleCheck size={32} /> : <CircleX size={32} />}
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.2 }}>
                    {result.correct ? t('topic_test.result_correct_title', 'Resposta correcta') : t('topic_test.result_wrong_title', 'Resposta incorrecta')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    {result.correct
                      ? t('topic_test.result_correct_text', 'Has encertat aquest test.')
                      : t('topic_test.result_wrong_text', 'Les opcions correctes estan marcades en verd.')}
                  </Typography>
                </Box>
              </Box>
            )}

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
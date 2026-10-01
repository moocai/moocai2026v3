import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, useTheme, alpha, Paper, Radio, Checkbox, RadioGroup, FormControlLabel, FormControl, FormGroup, Stack, Alert, AlertTitle } from '@mui/material';
import { ChevronLeft, Zap, CircleCheck, CircleX,} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCourse } from '../../hooks/useCourse';
import { courseService } from '../../services/courseService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ExamPage() {
  const { courseId, challengeSlug } = useParams<{ courseId: string; challengeSlug: string }>();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { data: course } = useCourse(courseId);

  const [loading, setLoading] = useState(true);
  const [topicTests, setTopicTests] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [exam, setExam] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const resultRef = useRef<HTMLDivElement>(null);

  const REVEAL_DELAY_MS = 3000;
  const pendingRef = useRef<string[]>([]);
  const [revealDeadline, setRevealDeadline] = useState<number | null>(null);
  const [revealMsLeft, setRevealMsLeft] = useState(0);

  const lang = i18n.language?.split('-')[0] || 'ca';

  const getText = useCallback((field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.ca || field.es || field.en || '';
  }, [lang]);

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

    const loadExamData = async () => {
      try {
        setLoading(true);
        setResult(null);
        setRevealDeadline(null);
        setSelectedAnswers([]);

        const topic = course.content?.find((t: any) => (t.subTopics || []).some((st: any) => st.problemSlug === currentTestSlug));
        const problem = topic?.subTopics?.find((st: any) => st.problemSlug === currentTestSlug);
        let loadedExam = problem;

        if (!loadedExam) {
          loadedExam = await courseService.getChallenge(courseId, topic?.id || '', currentTestSlug).catch(() => null);
        }
        if (!cancelled) setExam(loadedExam || null);

        const topicSlug = topic?.id || '';
        if (topicSlug) {
          const subs = await courseService.getChallengeSubmissions(courseId, topicSlug, currentTestSlug).catch(() => []);
          if (!cancelled) setSubmissions(Array.isArray(subs) ? subs : []);
        }
      } catch (error) {
        console.error('Error loading exam:', error);
        if (!cancelled) setExam(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadExamData();
    return () => { cancelled = true; };
  }, [courseId, currentTestSlug, course]);

  // Comprova la resposta al moment, sense enviar res al backend
  const evaluate = (answers: string[]) => {
    const correctSet = new Set<string>(
      (choices as any[]).filter((c: any) => c.is_correct).map((c: any) => String(c.id))
    );
    if (correctSet.size === 0) {
      setResult({ error: t('exam.no_solution', "No es pot comprovar la resposta: l'examen no inclou la solució") });
      return;
    }

    const passed = answers.length === correctSet.size && answers.every((a) => correctSet.has(a));
    setResult({ correct: passed });

    if (!courseId || !currentTestSlug) return;
    let studentId = 'temp';
    try {
      const savedStudent = localStorage.getItem('currentStudent');
      if (savedStudent) {
        const parsedStudent = JSON.parse(savedStudent);
        if (parsedStudent?.id) studentId = parsedStudent.id;
      }
    } catch { studentId = 'temp'; }

    const progressKey = `mooc_global_progress_${studentId}`;
    let progress: Record<string, any> = {};
    try { progress = JSON.parse(localStorage.getItem(progressKey) || '{}'); } catch { progress = {}; }

    const challengeKey = `${courseId}_${currentTestSlug}`;
    if (passed) progress[challengeKey] = true;
    else if (progress[challengeKey] !== true) progress[challengeKey] = 'attempted';

    localStorage.setItem(progressKey, JSON.stringify(progress));
    window.dispatchEvent(new Event('lessonProgressUpdated'));
  };

  // ---- Revelació diferida: 3 s després de la darrera selecció ----
  useEffect(() => {
    if (revealDeadline === null) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, revealDeadline - Date.now());
      setRevealMsLeft(left);
      if (left === 0) {
        window.clearInterval(id);
        setRevealDeadline(null);
        evaluate(pendingRef.current);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [revealDeadline]);

  const armReveal = (answers: string[]) => {
    pendingRef.current = answers;
    setRevealMsLeft(REVEAL_DELAY_MS);
    setRevealDeadline(Date.now() + REVEAL_DELAY_MS);
  };

  // Selecció múltiple: s'avalua quan s'han marcat tantes opcions com respostes correctes hi ha
  const handleCheckboxChange = (value: string, checked: boolean) => {
    if (answered) return;
    const next = checked
      ? (selectedAnswers.includes(value) ? selectedAnswers : [...selectedAnswers, value])
      : selectedAnswers.filter((answer) => answer !== value);
    setSelectedAnswers(next);
    if (next.length >= correctCount) armReveal(next);
    else setRevealDeadline(null);
  };

  // Elecció única: en marcar una opció, el feedback surt 3 s després
  const handleRadioChange = (value: string) => {
    if (answered) return;
    setSelectedAnswers([value]);
    armReveal([value]);
  };

  const handleRetry = () => {
    setRevealDeadline(null);
    setResult(null);
    setSelectedAnswers([]);
  };

  if (loading && !exam) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  }

  if (!exam) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>{t('lesson.course_not_found', 'Examen no trobat')}</Typography></Box>;
  }

  const latestSubmission = submissions?.[submissions.length - 1];
  const grade = typeof result?.correct === 'boolean' ? (result.correct ? exam.score ?? 10 : 0) : undefined;
  const title = exam.title || exam.name || getText(exam.subtitle) || currentTestSlug;
  const statement = exam.statement_ca || exam.statement || exam.description || getText(exam.text) || '';
  const examData = (window as any).EXAM_DATA?.[currentTestSlug || ''];
  const rawChoices = examData?.options || exam.choices || [];

  const choices = examData ? rawChoices.map((option: any) => ({
    id: option.id,
    is_correct: option.id === examData.correctAnswerId,
    textHtml: `<p>${option.text}</p>`,
  })) : rawChoices;

  const correctCount = choices.filter((choice: any) => choice.is_correct).length;
  const isMultiChoice = correctCount > 1;

  // ---- Feedback just després d'enviar ----
  const answered = !!result && !result.error;
  const isCorrect = result?.correct === true;
  const pointsEarned = isCorrect
    ? (result.points_awarded ?? result.points ?? exam.score ?? 10)
    : 0;

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
          ? (isSel ? t('exam.your_correct', 'Has encertat!') : t('exam.was_correct', 'Era la resposta correcta'))
          : t('exam.your_wrong', 'La teva resposta')}
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

        {/* Títol principal */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, flex: 1 }}>{title}</Typography>
        </Box>

        {/* Contingut amb scroll vertical natural */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3, mb: 3 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('exam.statement', 'Enunciat')}</Typography>
            <Box sx={{ '& p': { color: 'text.secondary', lineHeight: 1.8, mb: 2 }, '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem', wordBreak: 'break-all' } }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{statement}</ReactMarkdown>
            </Box>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                {isMultiChoice ? t('exam.multi_choice', 'Test de selecció múltiple') : t('exam.choose_answer', "Test d'elecció única")}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: exam.difficulty === 'hard' ? 'error.main' : exam.difficulty === 'medium' ? 'warning.main' : 'success.main' }}>
                <Zap size={16} fill={exam.difficulty === 'hard' ? 'error.main' : exam.difficulty === 'medium' ? 'warning.main' : 'success.main'} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{exam.difficulty}</Typography>
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

            {revealDeadline !== null && (
              <Typography sx={{ mt: 2, fontSize: '0.8rem', color: 'text.secondary', textAlign: 'right' }}>
                {t('exam.reveal_in', "Resposta correcta d'aquí a")} {Math.ceil(revealMsLeft / 1000)} s
              </Typography>
            )}

            {/* Botons de navegació i enviament */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mt: 3, gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                {currentIdx > 0 && (
                  <Button variant="outlined" onClick={() => setCurrentIdx(currentIdx - 1)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, color: 'white', flex: { xs: 1, sm: 'initial' } }}>
                    {`← `}{t('exam.prev', 'Anterior')}
                  </Button>
                )}
                {currentIdx < topicTests.length - 1 && (
                  <Button variant="outlined" onClick={() => setCurrentIdx(currentIdx + 1)} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, color: 'white', flex: { xs: 1, sm: 'initial' } }}>
                    {t('exam.next', 'Següent →')}
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'stretch', sm: 'flex-end' }, gap: 0.5, width: { xs: '100%', sm: 'auto' } }}>
                {answered ? (
                  <Button
                    variant="outlined"
                    onClick={handleRetry}
                    sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
                  >
                    {t('exam.retry', 'Torna-ho a provar')}
                  </Button>
                ) : (
                  isMultiChoice && (
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: { xs: 'center', sm: 'right' } }}>
                      {t('exam.pick_n', 'Tria {{count}} opcions', { count: correctCount })} ({selectedAnswers.length}/{correctCount})
                    </Typography>
                  )
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
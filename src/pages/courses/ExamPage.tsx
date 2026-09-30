import { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, useTheme, alpha, Paper, Radio, Checkbox, RadioGroup, FormControlLabel, FormControl, FormGroup, Stack } from '@mui/material';
import { ChevronLeft, Send, Zap } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const lang = i18n.language?.split('-')[0] || 'ca';

  const getText = useCallback((field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.ca || field.es || field.en || '';
  }, [lang]);

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

  const isLastQuestion = currentIdx === topicTests.length - 1 || topicTests.length === 0;

  const handleSubmit = async () => {
    if (submitting || !courseId || !currentTestSlug || selectedAnswers.length === 0 || !isLastQuestion) return;
    setSubmitting(true);
    setResult(null);

    try {
      const topic = course?.content?.find((t: any) => (t.subTopics || []).some((st: any) => st.problemSlug === currentTestSlug));
      if (!topic) throw new Error(t('exam.topic_not_found', "No s'ha trobat el tema del problema"));

      const topicSlug = topic.id;
      const answersToSubmit = [...selectedAnswers];

      const response = await courseService.submitChallenge(courseId, topicSlug, currentTestSlug, { answers: answersToSubmit });
      setResult(response);

      const subs = await courseService.getChallengeSubmissions(courseId, topicSlug, currentTestSlug).catch(() => []);
      setSubmissions(Array.isArray(subs) ? subs : []);

      const passed = response?.correct === true;
      const savedStudent = localStorage.getItem('currentStudent');
      let studentId = 'temp';

      try {
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
    } catch (error: any) {
      const detail = error?.response?.data;
      const message = typeof detail === 'string' ? detail : (detail && typeof detail === 'object' ? Object.values(detail).flat().join(' ') : error?.message || t('exam.error', 'Error en enviar'));
      console.error('Error en enviar la resposta:', error);
      setResult({ error: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckboxChange = (value: string, checked: boolean) => {
    setSelectedAnswers((previous) => {
      if (checked) return previous.includes(value) ? previous : [...previous, value];
      return previous.filter((answer) => answer !== value);
    });
  };

  const handleRadioChange = (value: string) => setSelectedAnswers([value]);

  if (loading && !exam) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  }

  if (!exam) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>{t('lesson.course_not_found', 'Examen no trobat')}</Typography></Box>;
  }

  const latestSubmission = submissions?.[submissions.length - 1];
  const grade = latestSubmission?.grade ?? latestSubmission?.score ?? (typeof result?.correct === 'boolean' ? (result.correct ? exam.score ?? 10 : 0) : undefined);
  const title = exam.title || exam.name || getText(exam.subtitle) || currentTestSlug;
  const statement = exam.statement_ca || exam.statement || exam.description || getText(exam.text) || '';
  const examData = (window as any).EXAM_DATA?.[currentTestSlug || ''];
  const rawChoices = examData?.options || exam.choices || [];
  
  const choices = examData ? rawChoices.map((option: any) => ({
    id: option.id,
    is_correct: option.id === examData.correctAnswerId,
    textHtml: `<p>${option.text}</p>`,
  })) : rawChoices;

  const isMultiChoice = choices.filter((choice: any) => choice.is_correct).length > 1;

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

            <FormControl disabled={submitting} fullWidth>
              {isMultiChoice ? (
                <FormGroup>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: choices.length > 6 ? '1fr 1fr' : '1fr' }, gap: 1 }}>
                    {choices.map((choice: any, index: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : String(choice.id ?? choice.value ?? index);
                      const checked = selectedAnswers.includes(value);
                      return (
                        <Paper key={value} variant="outlined" sx={{ p: 0.5, borderRadius: 1, borderColor: checked ? '#8400ff' : 'divider', bgcolor: checked ? alpha('#8400ff', 0.06) : 'transparent' }}>
                          <FormControlLabel
                            control={<Checkbox checked={checked} onChange={(event) => handleCheckboxChange(value, event.target.checked)} sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }} dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1, width: '100%', mr: 0 }}
                          />
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
                        <Paper key={value} variant="outlined" sx={{ p: 0.5, borderRadius: 1, borderColor: checked ? '#8400ff' : 'divider', bgcolor: checked ? alpha('#8400ff', 0.06) : 'transparent' }}>
                          <FormControlLabel
                            value={value}
                            control={<Radio sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }} dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1, width: '100%', mr: 0 }}
                          />
                        </Paper>
                      );
                    })}
                  </Box>
                </RadioGroup>
              )}
            </FormControl>

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
                <Button 
                  variant="contained" 
                  endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />} 
                  onClick={handleSubmit} 
                  disabled={selectedAnswers.length === 0 || submitting || !isLastQuestion} 
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
                >
                  {submitting ? t('exam.sending', 'Enviant...') : t('exam.submit', 'Enviar')}
                </Button>
                {!isLastQuestion && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: { xs: 'center', sm: 'right' } }}>{t('exam.reach_last_question', "Has d'arribar a l'última pregunta per poder enviar")}</Typography>}
                {isLastQuestion && selectedAnswers.length === 0 && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: { xs: 'center', sm: 'right' } }}>{t('exam.select_at_least_one', 'Selecciona com a mínim una opció')}</Typography>}
                {isLastQuestion && selectedAnswers.length > 0 && <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: { xs: 'center', sm: 'right' } }}>{selectedAnswers.length} {selectedAnswers.length === 1 ? 'opció seleccionada' : 'opcions seleccionades'}</Typography>}
              </Box>
            </Box>
          </Paper>
        </Box>

        {result && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: result.error || result.correct === false ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.success.main, 0.08), border: '1px solid', borderColor: result.error || result.correct === false ? 'error.main' : 'success.main', borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1, color: result.error || result.correct === false ? 'error.main' : 'success.main' }}>
              {result.error ? t('exam.error', 'Error') : result.correct === true ? t('exam.correct', 'Resposta correcta!') : result.correct === false ? t('exam.incorrect', 'Resposta incorrecta') : t('exam.success', 'Enviat correctament')}
            </Typography>
            {result.error && <Typography color="error">{result.error}</Typography>}
            {result.feedback && <Typography color="text.secondary">{result.feedback}</Typography>}
            {Array.isArray(result.choices) && result.choices.length > 0 && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {result.choices.map((choice: any) => {
                  const wrongPick = choice.was_selected && !choice.is_correct;
                  const goodPick = choice.was_selected && choice.is_correct;
                  return (
                    <Box key={choice.id} sx={{ p: 1.5, borderRadius: 1, fontSize: '0.9rem', border: '1px solid', borderColor: wrongPick ? 'error.main' : goodPick ? 'success.main' : 'divider', bgcolor: wrongPick ? alpha(theme.palette.error.main, 0.06) : goodPick ? alpha(theme.palette.success.main, 0.06) : 'transparent' }}>
                      <Box component="span" sx={{ mr: 1, fontWeight: 800 }}>{wrongPick ? '✕' : goodPick ? '✓' : '•'}</Box>
                      {choice.text || choice.textHtml}
                      {choice.explanation && <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.5 }}>{choice.explanation}</Typography>}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        )}

        {grade !== undefined && grade !== null && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: alpha('#8400ff', 0.06), border: '1px solid', borderColor: '#8400ff', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#8400ff' }}>{t('exam.grade', 'Nota')}</Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: grade >= 5 ? 'success.main' : 'error.main' }}>{grade}/10</Typography>
            {latestSubmission?.comment && <Typography sx={{ mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>"{latestSubmission.comment}"</Typography>}
          </Paper>
        )}
      </Box>
    </Box>
  );
}
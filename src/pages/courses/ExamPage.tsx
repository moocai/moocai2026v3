import { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, useTheme, alpha,
  Paper, Radio, Checkbox, RadioGroup, FormControlLabel, FormControl, FormGroup, Stack
} from '@mui/material';
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
    (async () => {
      try {
        const topic = course.content?.find((t: any) =>
          t.subTopics?.some((s: any) => s.problemSlug === challengeSlug)
        );
        const problem = topic?.subTopics?.find((s: any) => s.problemSlug === challengeSlug);
        if (problem) {
          setExam(problem);
        } else {
          const challengeData = await courseService.getChallenge(courseId, topic?.id || '', challengeSlug).catch(() => null);
          if (challengeData) setExam(challengeData);
        }
        const topicSlug = topic?.id || '';
        const subs = await courseService.getChallengeSubmissions(courseId, topicSlug, challengeSlug).catch(() => []);
        setSubmissions(Array.isArray(subs) ? subs : []);
      } catch (e) {
        console.error('Error loading exam:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, challengeSlug, course]);

  const handleSubmit = async () => {
    if (!selectedAnswers.length || !courseId || !challengeSlug) return;
    setSubmitting(true);
    setResult(null);
    try {
      const topic = course?.content?.find((t: any) =>
        t.subTopics?.some((s: any) => s.problemSlug === challengeSlug)
      );
      if (!topic) throw new Error(t('exam.topic_not_found', 'No s\'ha trobat el tema del problema'));
      const topicSlug = topic.id;
      const res = await courseService.submitChallenge(courseId, topicSlug, challengeSlug, { answers: selectedAnswers });
      setResult(res);
      const subs = await courseService.getChallengeSubmissions(courseId, topicSlug, challengeSlug).catch(() => []);
      setSubmissions(Array.isArray(subs) ? subs : []);
      // SenseEnrollment/en Anonymous el backend retorna { correct, choices } i no persisteix res
      const passed = res?.correct === true;
      const saved = localStorage.getItem('currentStudent');
      const studentId = saved ? JSON.parse(saved).id : 'temp';
      const key = `mooc_global_progress_${studentId}`;
      const prog = JSON.parse(localStorage.getItem(key) || '{}');
      if (passed) {
        prog[`${courseId}_${challengeSlug}`] = true;
      } else if (prog[`${courseId}_${challengeSlug}`] !== true) {
        prog[`${courseId}_${challengeSlug}`] = 'attempted';
      }
      localStorage.setItem(key, JSON.stringify(prog));
      window.dispatchEvent(new Event('lessonProgressUpdated'));
    } catch (err: any) {
      const detail = err?.response?.data;
      const message =
        (typeof detail === 'string' ? detail : null) ||
        (detail && typeof detail === 'object' ? Object.values(detail).flat().join(' ') : null) ||
        err?.message ||
        t('exam.error', 'Error en enviar');
      console.error('Error en enviar la resposta:', err);
      setResult({ error: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  );

  if (!exam) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography>{t('lesson.course_not_found', 'Examen no trobat')}</Typography>
    </Box>
  );

  const latestSubmission = submissions?.[submissions.length - 1];
  const grade = latestSubmission?.grade ?? latestSubmission?.score ??
    (typeof result?.correct === 'boolean' ? (result.correct ? exam.score ?? 10 : 0) : undefined);
  const title = exam.title || exam.name || getText(exam.subtitle) || challengeSlug;
  const statement = exam.statement_ca || exam.statement || exam.description || getText(exam.text) || '';
  const examData = (window as any).EXAM_DATA?.[challengeSlug || ''];
  const rawChoices = examData?.options || exam.choices || [];
  const choices = examData
    ? rawChoices.map((o: any) => ({
        id: o.id,
        is_correct: o.id === examData.correctAnswerId,
        textHtml: `<p>${o.text}</p>`,
      }))
    : rawChoices;

  const topic = course?.content?.find((t: any) => (t.subTopics || []).some((s: any) => s.problemSlug === challengeSlug));
  const topicTests = topic?.subTopics?.filter((s: any) => s.type === 'test') || [];
  const currentIdx = topicTests.findIndex((s: any) => s.problemSlug === challengeSlug);
  const nextTest = currentIdx >= 0 && currentIdx < topicTests.length - 1 ? topicTests[currentIdx + 1] : null;
  const prevTest = currentIdx > 0 ? topicTests[currentIdx - 1] : null;
  const isMultiChoice = choices.filter((c: any) => c.is_correct).length > 1;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button
          component={RouterLink}
          to={`/courses/${courseId}`}
          startIcon={<ChevronLeft size={18} />}
          sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
        >
          {course ? (typeof course.title === 'string' ? course.title : getText(course.title) || '') : t('lesson.back', 'Tornar')}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ fontWeight: 900, flex: 1 }}>
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3, mb: 3 }}>
        <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {t('exam.statement', 'Enunciat')}
          </Typography>
          <Box sx={{
            '& p': { color: 'text.secondary', lineHeight: 1.8, mb: 2 },
            '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem' },
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{statement}</ReactMarkdown>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2}}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {isMultiChoice ? t('exam.multi_choice', 'Test de selecció múltiple') : t('exam.choose_answer', "Test d'elecció única")}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: exam.difficulty === 'hard' ? 'error.main' : exam.difficulty === 'medium' ? 'warning.main' : 'success.main' }}>
              <Zap size={16} fill={exam.difficulty === 'hard' ? 'error.main' : exam.difficulty === 'medium' ? 'warning.main' : 'success.main'} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{exam.difficulty}</Typography>
            </Box>
          </Box>
          <FormControl disabled={submitting}>
            {isMultiChoice ? (
              <FormGroup>
                {choices.length > 6 ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    {choices.map((choice: any, i: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : (choice.id || choice.value || String(i));
                      const checked = selectedAnswers.includes(value);
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 0.5, borderRadius: 1, borderColor: checked ? '#8400ff' : 'divider', bgcolor: checked ? alpha('#8400ff', 0.06) : 'transparent' }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAnswers([...selectedAnswers, value]);
                                  } else {
                                    setSelectedAnswers(selectedAnswers.filter((v) => v !== value));
                                  }
                                }}
                                sx={{ '&.Mui-checked': { color: '#8400ff' } }}
                              />
                            }
                            label={<Box component="span" dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1 }}
                          />
                        </Paper>
                      );
                    })}
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {choices.map((choice: any, i: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : (choice.id || choice.value || String(i));
                      const checked = selectedAnswers.includes(value);
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 0.5, borderRadius: 1, borderColor: checked ? '#8400ff' : 'divider', bgcolor: checked ? alpha('#8400ff', 0.06) : 'transparent' }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAnswers([...selectedAnswers, value]);
                                  } else {
                                    setSelectedAnswers(selectedAnswers.filter((v) => v !== value));
                                  }
                                }}
                                sx={{ '&.Mui-checked': { color: '#8400ff' } }}
                              />
                            }
                            label={<Box component="span" dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1 }}
                          />
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </FormGroup>
            ) : (
              <RadioGroup value={selectedAnswers[0] || ''} onChange={(e) => setSelectedAnswers([e.target.value])}>
                {choices.length > 6 ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    {choices.map((choice: any, i: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : (choice.id || choice.value || String(i));
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 0.5, borderRadius: 1, borderColor: selectedAnswers[0] === value ? '#8400ff' : 'divider', bgcolor: selectedAnswers[0] === value ? alpha('#8400ff', 0.06) : 'transparent' }}>
                          <FormControlLabel
                            value={value}
                            control={<Radio sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1 }}
                          />
                        </Paper>
                      );
                    })}
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {choices.map((choice: any, i: number) => {
                      const html = choice.textHtml || choice.text || '';
                      const value = typeof choice === 'string' ? choice : (choice.id || choice.value || String(i));
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 0.5, borderRadius: 1, borderColor: selectedAnswers[0] === value ? '#8400ff' : 'divider', bgcolor: selectedAnswers[0] === value ? alpha('#8400ff', 0.06) : 'transparent' }}>
                          <FormControlLabel
                            value={value}
                            control={<Radio sx={{ '&.Mui-checked': { color: '#8400ff' } }} />}
                            label={<Box component="span" dangerouslySetInnerHTML={{ __html: html }} />}
                            sx={{ mx: 1 }}
                          />
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </RadioGroup>
            )}
          </FormControl>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {prevTest && (
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to={`/courses/${courseId}/exam/${prevTest.problemSlug}`}
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, color: 'white' }}
                >
                  {'← '}{t('exam.prev', 'Anterior Pregunta')}
                </Button>
              )}
              {nextTest && (
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to={`/courses/${courseId}/exam/${nextTest.problemSlug}`}
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, color: 'white' }}
                >
                  {t('exam.next', 'Següent pregunta →')}
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
              <Button
                variant="contained"
                endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
                onClick={handleSubmit}
                disabled={!selectedAnswers.length || submitting || !!nextTest}
                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
              >
                {submitting ? t('exam.sending', 'Enviant...') : t('exam.submit', 'Enviar')}
              </Button>
              {nextTest && (
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {t('exam.complete_previous', 'Resol les preguntes anteriors per poder enviar el test')}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {result && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: result.error || result.correct === false ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.success.main, 0.08), border: '1px solid', borderColor: result.error || result.correct === false ? 'error.main' : 'success.main', borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1, color: result.error || result.correct === false ? 'error.main' : 'success.main' }}>
            {result.error
              ? t('exam.error', 'Error')
              : result.correct === true
                ? t('exam.correct', 'Resposta correcta!')
                : result.correct === false
                  ? t('exam.incorrect', 'Resposta incorrecta')
                  : t('exam.success', 'Enviat correctament')}
          </Typography>
          {result.error && <Typography color="error">{result.error}</Typography>}
          {result.feedback && <Typography color="text.secondary">{result.feedback}</Typography>}
          {Array.isArray(result.choices) && result.choices.length > 0 && (
            <Stack spacing={1} sx={{ mt: 2 }}>
              {result.choices.map((c: any) => {
                const wrongPick = c.was_selected && !c.is_correct;
                const goodPick = c.was_selected && c.is_correct;
                return (
                  <Box
                    key={c.id}
                    sx={{
                      p: 1.5, borderRadius: 1, fontSize: '0.9rem',
                      border: '1px solid',
                      borderColor: wrongPick ? 'error.main' : goodPick ? 'success.main' : 'divider',
                      bgcolor: wrongPick ? alpha(theme.palette.error.main, 0.06) : goodPick ? alpha(theme.palette.success.main, 0.06) : 'transparent',
                    }}
                  >
                    <Box component="span" sx={{ mr: 1, fontWeight: 800 }}>
                      {wrongPick ? '✕' : goodPick ? '✓' : '•'}
                    </Box>
                    {c.text || c.textHtml}
                    {c.explanation && (
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.5 }}>
                        {c.explanation}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}

      {grade !== undefined && grade !== null && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: alpha('#8400ff', 0.06), border: '1px solid', borderColor: '#8400ff', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#8400ff' }}>
            {t('exam.grade', 'Nota')}
          </Typography>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: grade >= 5 ? 'success.main' : 'error.main' }}>
            {grade}/10
          </Typography>
          {latestSubmission?.comment && (
            <Typography sx={{ mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>
              "{latestSubmission.comment}"
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}

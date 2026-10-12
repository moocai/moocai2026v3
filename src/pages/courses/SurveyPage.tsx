import { useState, type FormEvent } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Alert, Box, Button, CircularProgress, Container, Stack, TextField, Typography } from '@mui/material';
import { CheckCircleOutlined as CheckIcon } from '@mui/icons-material';
import { useThemeMode } from '../../hooks/useTheme';
import { resolveSlug } from '../../hooks/useCourse';
import { surveyService } from '../../services/surveyService';
import { apiErrorMessages } from '../../services/httpClient';
import { isSurveyAnswered, markSurveyAnswered } from '../../utils/answeredSurveys';

const ACCENT = '#00685d';

/** Una enquesta: descripció i una resposta de text lliure (anònima). */
export default function SurveyPage() {
  const { courseId = '', surveySlug = '' } = useParams();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const slug = resolveSlug(courseId);
  const [answer, setAnswer] = useState('');
  const survey = useQuery({
    queryKey: ['survey', slug, surveySlug],
    queryFn: () => surveyService.get(slug, surveySlug),
    enabled: !!slug && !!surveySlug,
    retry: false,
  });
  const submit = useMutation({
    mutationFn: () => surveyService.submitAnswer(slug, surveySlug, answer.trim()),
    onSuccess: () => {
      markSurveyAnswered(slug, surveySlug);
      setAnswer('');
    },
  });
  const answeredBefore = isSurveyAnswered(slug, surveySlug);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !submit.isPending) submit.mutate();
  };

  const backToSurveys = (
    <Button component={RouterLink} to={`/courses/${courseId}/surveys`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
      {t('surveys.title')}
    </Button>
  );

  return (
    <Box sx={{
      position: 'relative', height: '100%', overflowY: 'auto',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
        {backToSurveys}

        {survey.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : survey.isError || !survey.data ? (
          // 404: tancada, o no existeix
          <Box sx={{ border: '2px solid', borderColor: ACCENT, borderRadius: 3, p: 3, mt: 2, bgcolor: 'background.paper', textAlign: 'center' }}>
            <Typography color="text.secondary">{t('surveys.not_found')}</Typography>
          </Box>
        ) : (
          <>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, mb: 2 }}>
              {survey.data.name}
            </Typography>
            {survey.data.description && (
              <Typography sx={{ whiteSpace: 'pre-line', color: 'text.secondary', mb: 3 }}>{survey.data.description}</Typography>
            )}

            <Box sx={{ border: '2px solid', borderColor: ACCENT, borderRadius: 3, p: { xs: 2, md: 3 }, bgcolor: 'background.paper', mb: 4 }}>
              {submit.isSuccess ? (
                <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
                  <CheckIcon sx={{ color: 'success.main', fontSize: 48 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('surveys.thanks_title')}</Typography>
                  <Typography variant="body2" color="text.secondary">{t('surveys.thanks_text')}</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                    <Button component={RouterLink} to={`/courses/${courseId}/surveys`} variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
                      {t('surveys.back_to_surveys')}
                    </Button>
                    <Button onClick={() => submit.reset()} sx={{ textTransform: 'none', fontWeight: 700 }}>
                      {t('surveys.answer_again')}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Box component="form" onSubmit={handleSubmit}>
                  {answeredBefore && (
                    <Alert severity="info" sx={{ mb: 2 }}>{t('surveys.already_answered')}</Alert>
                  )}
                  <TextField
                    label={t('surveys.your_answer')}
                    placeholder={t('surveys.placeholder')}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    multiline
                    minRows={5}
                    fullWidth
                    required
                    disabled={submit.isPending}
                  />
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
                    {t('surveys.anonymous_hint')}
                  </Typography>
                  {submit.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {apiErrorMessages(submit.error).join(' ') || t('surveys.submit_error')}
                    </Alert>
                  )}
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
                    <Button type="submit" variant="contained" disabled={!answer.trim() || submit.isPending} sx={{ textTransform: 'none', fontWeight: 700, minWidth: 120 }}>
                      {submit.isPending ? t('surveys.submitting') : t('surveys.submit')}
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}

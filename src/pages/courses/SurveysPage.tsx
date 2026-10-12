import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { ArrowForward as ArrowForwardIcon, AssignmentOutlined as SurveyIcon } from '@mui/icons-material';
import { useThemeMode } from '../../hooks/useTheme';
import { resolveSlug } from '../../hooks/useCourse';
import { useAllCourses } from '../../hooks/useCourses';
import { surveyService } from '../../services/surveyService';
import { getLocalizedText } from '../../utils/formatters';

const ACCENT = '#00685d';

export const surveysQueryKey = (slug: string) => ['surveys', slug] as const;

/** Enquestes obertes del curs, en l'ordre que les ha posat el professorat. */
export default function SurveysPage() {
  const { courseId = '' } = useParams();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const slug = resolveSlug(courseId);
  // El nom del curs surt de la llista de cursos propis (una sola petició, ja en cache), no del detall
  const courseTitle = useAllCourses().data?.find((c) => c.slug === slug)?.title;
  const surveys = useQuery({
    queryKey: surveysQueryKey(slug),
    queryFn: () => surveyService.list(slug),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });

  return (
    <Box sx={{
      position: 'relative', height: '100%', overflowY: 'auto',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
        <Button component={RouterLink} to={`/courses/${courseId}`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
          {getLocalizedText(courseTitle) || slug}
        </Button>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, mb: 3 }}>
          {t('surveys.title')}
        </Typography>

        {surveys.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : surveys.isError ? (
          <Typography color="error">{t('surveys.load_error')}</Typography>
        ) : !surveys.data?.length ? (
          <Box sx={{ border: '2px solid', borderColor: ACCENT, borderRadius: 3, p: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
            <Typography color="text.secondary">{t('surveys.empty')}</Typography>
          </Box>
        ) : (
          <Stack spacing={2} sx={{ pb: 4 }}>
            {surveys.data.map((survey) => {
              const open = () => navigate(`/courses/${courseId}/surveys/${encodeURIComponent(survey.slug)}`);
              return (
                <Stack
                  key={survey.slug}
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: 'center', border: '2px solid', borderColor: ACCENT, borderRadius: 3, p: { xs: 2, md: 2.5 }, bgcolor: 'background.paper' }}
                >
                  <SurveyIcon sx={{ color: ACCENT, fontSize: 28, display: { xs: 'none', sm: 'block' } }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{survey.name}</Typography>
                    {survey.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {survey.description}
                      </Typography>
                    )}
                  </Box>
                  <Button variant="contained" size="small" onClick={open} endIcon={<ArrowForwardIcon fontSize="small" />} sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}>
                    {t('surveys.answer')}
                  </Button>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

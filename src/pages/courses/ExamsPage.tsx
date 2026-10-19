import { useParams, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, GraduationCap } from 'lucide-react';
import { Box, Button, CircularProgress, Container, Stack, Typography, alpha, useTheme } from '@mui/material';
import { useThemeMode } from '../../hooks/useTheme';
import { resolveSlug } from '../../hooks/useCourse';
import { useAllCourses } from '../../hooks/useCourses';
import { getLocalizedText } from '../../utils/formatters';
import { examKeys, examPath, examService, type Exam } from '../../services/examService';
import { ACCENT } from '../../features/challenges/shared';
import { ExamChips, useExamBlockedReason, useExamContents, useExamScore } from '../../features/exams/shared';

/**
 * Exàmens del curs: primer els oberts i després els tancats. Cada examen s'obre a la seva
 * pàgina (els de repte, a la del repte), de manera que mai no es barregen entre ells.
 */
export default function ExamsPage() {
  const { courseId = '' } = useParams();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const slug = resolveSlug(courseId);
  const courseTitle = useAllCourses().data?.find((c) => c.slug === slug)?.title;

  const exams = useQuery({
    queryKey: examKeys.list(slug),
    queryFn: () => examService.list(slug),
    enabled: !!slug,
    staleTime: 30 * 1000,
  });

  const list = exams.data ?? [];
  const open = list.filter((e) => e.current);
  const closed = list.filter((e) => !e.current);

  return (
    <Box sx={{
      position: 'relative', height: '100%', overflowY: 'auto',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 4 } }}>
        <Button component={RouterLink} to={`/courses/${courseId}`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
          {getLocalizedText(courseTitle) || slug}
        </Button>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, mb: 0.5 }}>
          {t('exams.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 640 }}>{t('exams.subtitle')}</Typography>

        {exams.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : exams.isError ? (
          <Typography color="error">{t('exams.load_error')}</Typography>
        ) : list.length === 0 ? (
          <Box sx={{ border: '2px solid', borderColor: ACCENT, borderRadius: 3, py: 8, px: 3, bgcolor: 'background.paper', textAlign: 'center', color: 'text.secondary' }}>
            <GraduationCap size={44} style={{ opacity: 0.5 }} />
            <Typography sx={{ mt: 2, fontWeight: 700 }}>{t('exams.empty')}</Typography>
          </Box>
        ) : (
          <Stack spacing={5} sx={{ pb: 4 }}>
            {open.length > 0 && <Section title={t('exams.section_open')} items={open} courseId={courseId} />}
            {closed.length > 0 && <Section title={t('exams.section_closed')} items={closed} courseId={courseId} />}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

function Section({ title, items, courseId }: { title: string; items: Exam[]; courseId: string }) {
  return (
    <Box component="section">
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 1.2, textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
        {title} · {items.length}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {items.map((e) => <ExamCard key={`${e.kind}-${e.slug}`} exam={e} courseId={courseId} />)}
      </Box>
    </Box>
  );
}

function ExamCard({ exam, courseId }: { exam: Exam; courseId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const contents = useExamContents(exam);
  const score = useExamScore(exam);
  const blocked = useExamBlockedReason(exam);
  const highlight = exam.current && exam.available;
  // Un examen que no es pot obrir no és un enllaç: la targeta ja diu la nota i el perquè
  const link = blocked ? {} : { component: RouterLink, to: examPath(courseId, exam) };

  return (
    <Box
      {...link}
      sx={{
        display: 'flex', flexDirection: 'column', gap: 1.5, p: { xs: 2, md: 2.5 },
        textDecoration: 'none', color: 'text.primary', bgcolor: 'background.paper',
        border: '2px solid', borderColor: highlight ? ACCENT : 'divider', borderRadius: 3,
        transition: 'transform .15s, box-shadow .15s, border-color .15s',
        ...(!blocked && {
          '&:hover, &:focus-visible': {
            transform: 'translateY(-2px)', borderColor: 'primary.main', outline: 'none',
            boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
          '&:hover .exam-arrow': { transform: 'translateX(3px)' },
        }),
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5, flexShrink: 0, display: 'grid', placeItems: 'center',
          bgcolor: alpha(highlight ? ACCENT : theme.palette.text.secondary, 0.12),
          color: highlight ? ACCENT : 'text.secondary',
          ...(theme.palette.mode !== 'light' && highlight && { color: '#2dd4bf', bgcolor: alpha('#2dd4bf', 0.12) }),
        }}>
          <GraduationCap size={24} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h3" sx={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.3, overflowWrap: 'anywhere' }}>
            {exam.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{contents}</Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            <ExamChips exam={exam} />
          </Stack>
        </Box>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 'auto', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {score !== null && (
          <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('exams.score')}: </Box>{score}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {blocked ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>{blocked}</Typography>
        ) : (
          <Typography className="exam-arrow" component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, color: 'primary.main', fontSize: '0.9rem', transition: 'transform .15s', flexShrink: 0 }}>
            {exam.current ? t('exams.open_exam') : t('exams.view_exam')} <ArrowRight size={16} />
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

import { useParams, Link as RouterLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Info } from 'lucide-react';
import { Alert, Box, Button, CircularProgress, Container, Stack, Typography, alpha, useTheme } from '@mui/material';
import { useThemeMode } from '../../hooks/useTheme';
import { problemDetailQuery, resolveSlug } from '../../hooks/useCourse';
import { courseService, mapProblem } from '../../services/courseService';
import { examKeys, examPath, examService, type Exam } from '../../services/examService';
import { formatScore } from '../../features/challenges/shared';
import { ExamChips, useExamBlockedReason, useExamContents, useExamScore } from '../../features/exams/shared';

/** Problemes d'un examen de tema (`GET …/topics/{examen}/problems/`), en l'ordre de l'examen. */
const examProblemsKey = (course: string, exam: string) => ['topic-problems', course, exam] as const;

/**
 * Pàgina d'un examen: la seva capçalera (estat, nota) i els seus problemes. Cada problema
 * s'obre dins de l'examen (`/exams/{examen}/{problema}`), i "enrere" torna aquí.
 */
export default function ExamPage() {
  const { courseId = '', examSlug = '' } = useParams();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const slug = resolveSlug(courseId);

  const exams = useQuery({
    queryKey: examKeys.list(slug),
    queryFn: () => examService.list(slug),
    enabled: !!slug,
    staleTime: 30 * 1000,
  });
  const exam = exams.data?.find((e) => e.slug === examSlug);

  return (
    <Box sx={{
      position: 'relative', height: '100%', overflowY: 'auto',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
        <Button component={RouterLink} to={`/courses/${courseId}/exams`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
          {t('exams.title')}
        </Button>

        {exams.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : exams.isError ? (
          <Typography color="error">{t('exams.load_error')}</Typography>
        ) : !exam ? (
          <Typography color="text.secondary">{t('exams.not_found')}</Typography>
        ) : exam.kind === 'challenge' ? (
          // Els exàmens de repte tenen la seva pàgina (la del repte)
          <Navigate to={examPath(courseId, exam)} replace />
        ) : (
          <TopicExam exam={exam} courseId={courseId} slug={slug} />
        )}
      </Container>
    </Box>
  );
}

function TopicExam({ exam, courseId, slug }: { exam: Exam; courseId: string; slug: string }) {
  const { t } = useTranslation();
  const contents = useExamContents(exam);
  const score = useExamScore(exam);
  const blocked = useExamBlockedReason(exam);

  const problems = useQuery({
    queryKey: examProblemsKey(slug, exam.slug),
    queryFn: () => courseService.getTopicProblems(slug, exam.slug),
    enabled: exam.available,
    staleTime: 30 * 1000,
    retry: false,
  });
  const list = (problems.data ?? []).map((p: any) => ({ ...mapProblem(p), title: p.title }));
  const coding = list.filter((p) => p.type !== 'test');
  const tests = list.filter((p) => p.type === 'test');

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, overflowWrap: 'anywhere' }}>
          {exam.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>{contents}</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1.5, alignItems: 'center' }}>
          <ExamChips exam={exam} size="medium" />
          {score !== null && (
            <Typography sx={{ fontWeight: 800, ml: 1, fontVariantNumeric: 'tabular-nums' }}>
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('exams.score')}: </Box>{score}
            </Typography>
          )}
        </Stack>
      </Box>

      {blocked ? (
        <Alert severity="info">{blocked}</Alert>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', color: 'text.secondary' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 3 }} />
            <Typography variant="body2">{t('exams.rules')}</Typography>
          </Stack>
          {problems.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : problems.isError ? (
            <Typography color="error">{t('exams.load_error')}</Typography>
          ) : list.length === 0 ? (
            <Typography color="text.secondary">{t('exams.no_problems')}</Typography>
          ) : (
            <>
              {coding.length > 0 && (
                <ProblemList
                  title={t('exams.coding_section')} problems={coding} courseId={courseId} examSlug={exam.slug}
                  pathFor={(p) => `/courses/${courseId}/exams/${encodeURIComponent(exam.slug)}/${encodeURIComponent(p.problemSlug)}`}
                />
              )}
              {tests.length > 0 && (
                <ProblemList
                  title={t('exams.test_section')} problems={tests} courseId={courseId} examSlug={exam.slug}
                  pathFor={(p) => `/courses/${courseId}/test/${encodeURIComponent(p.problemSlug)}?exam=${encodeURIComponent(exam.slug)}`}
                />
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
}

function ProblemList({ title, problems, courseId, examSlug, pathFor }: {
  title: string; problems: any[]; courseId: string; examSlug: string; pathFor: (p: any) => string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  return (
    <Box component="section" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Typography component="h2" sx={{ px: 2.5, py: 1.5, fontWeight: 800, fontSize: '1.05rem', borderBottom: '1px solid', borderColor: 'divider' }}>
        {title}
      </Typography>
      {problems.map((p) => {
        // `my_solution`: el que l'alumne ha entregat (no n'hi ha per al professorat)
        const mine = p.mySolution;
        const done = p.type === 'test' ? !!mine : mine?.status === 'accepted';
        // Problema de codi: n'avança l'enunciat en passar-hi per sobre, perquè s'obri a l'instant
        const prefetch = p.type === 'test' ? undefined : () => {
          void queryClient.prefetchQuery(problemDetailQuery(courseId, examSlug, p.problemSlug));
        };
        return (
          <Box
            key={p.problemSlug}
            component={RouterLink}
            to={pathFor(p)}
            onMouseEnter={prefetch}
            onFocus={prefetch}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5,
              textDecoration: 'none', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider',
              '&:last-of-type': { borderBottom: 'none' },
              '&:hover, &:focus-visible': { bgcolor: alpha(theme.palette.primary.main, 0.06), outline: 'none' },
            }}
          >
            {done
              ? <CheckCircle2 size={18} color={theme.palette.success.main} style={{ flexShrink: 0 }} />
              : <Circle size={18} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />}
            <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '0.95rem', overflowWrap: 'anywhere' }}>
              {p.title}
            </Typography>
            {/* Només el valor: la nota de cada problema la posa el professorat */}
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {t('exams.problem_points', { max: formatScore(p.score, i18n.language) })}
            </Typography>
            <ChevronRight size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
          </Box>
        );
      })}
    </Box>
  );
}

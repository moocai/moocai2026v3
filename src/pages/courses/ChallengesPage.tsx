import { useParams, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BrainCircuit, ChevronLeft, Medal, Trophy } from 'lucide-react';
import { Box, Button, CircularProgress, Container, Stack, Typography, alpha, useTheme } from '@mui/material';
import { useThemeMode } from '../../hooks/useTheme';
import { resolveSlug } from '../../hooks/useCourse';
import { useAllCourses } from '../../hooks/useCourses';
import { getLocalizedText } from '../../utils/formatters';
import { challengeKeys, challengeService, type Challenge } from '../../services/challengeService';
import {
  ACCENT, MEDALS, MetricChip, StaffChips, StatusChip,
  challengeDescription, currentUserId, formatScore, markdownExcerpt,
} from '../../features/challenges/shared';

/**
 * Reptes de ML del curs: primer els oberts (accepten entregues) i després els tancats,
 * cadascun amb la mètrica i, per a qui hi participa, la seva posició i puntuació.
 */
export default function ChallengesPage() {
  const { courseId = '' } = useParams();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const slug = resolveSlug(courseId);
  const courseTitle = useAllCourses().data?.find((c) => c.slug === slug)?.title;

  const challenges = useQuery({
    queryKey: challengeKeys.list(slug),
    queryFn: () => challengeService.list(slug),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });

  const list = challenges.data ?? [];
  const open = list.filter((c) => c.current);
  const closed = list.filter((c) => !c.current);

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
          {t('challenges.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 640 }}>{t('challenges.subtitle')}</Typography>

        {challenges.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : challenges.isError ? (
          <Typography color="error">{t('challenges.load_error')}</Typography>
        ) : list.length === 0 ? (
          <Box sx={{ border: '2px solid', borderColor: ACCENT, borderRadius: 3, py: 8, px: 3, bgcolor: 'background.paper', textAlign: 'center', color: 'text.secondary' }}>
            <BrainCircuit size={44} style={{ opacity: 0.5 }} />
            <Typography sx={{ mt: 2, fontWeight: 700 }}>{t('challenges.empty')}</Typography>
          </Box>
        ) : (
          <Stack spacing={5} sx={{ pb: 4 }}>
            {open.length > 0 && <Section title={t('challenges.section_open')} items={open} courseId={courseId} slug={slug} />}
            {closed.length > 0 && <Section title={t('challenges.section_closed')} items={closed} courseId={courseId} slug={slug} />}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

function Section({ title, items, courseId, slug }: { title: string; items: Challenge[]; courseId: string; slug: string }) {
  return (
    <Box component="section">
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 1.2, textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
        {title} · {items.length}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {items.map((c) => <ChallengeCard key={c.slug} challenge={c} courseId={courseId} slug={slug} />)}
      </Box>
    </Box>
  );
}

function ChallengeCard({ challenge, courseId, slug }: { challenge: Challenge; courseId: string; slug: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const myId = currentUserId();
  const excerpt = markdownExcerpt(challengeDescription(challenge, i18n.language));
  const to = `/courses/${courseId}/challenges/${encodeURIComponent(challenge.slug)}`;

  // La pròpia posició surt de la classificació (top 5 + l'entrada pròpia): només per a qui ha iniciat sessió
  const board = useQuery({
    queryKey: challengeKeys.leaderboard(slug, challenge.slug),
    queryFn: () => challengeService.leaderboard(slug, challenge.slug),
    enabled: !!myId && !challenge.is_exam && !challenge.locked,
    staleTime: 60 * 1000,
    retry: false,
  });
  const boards = board.data;
  const leader = boards?.final?.[0] ?? boards?.public?.[0];
  const mine = (boards?.final ?? boards?.public)?.find((e) => e.user_id === myId);

  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        display: 'flex', flexDirection: 'column', gap: 1.5, p: { xs: 2, md: 2.5 },
        textDecoration: 'none', color: 'text.primary', bgcolor: 'background.paper',
        border: '2px solid', borderColor: challenge.current ? ACCENT : 'divider', borderRadius: 3,
        position: 'relative', overflow: 'hidden',
        transition: 'transform .15s, box-shadow .15s, border-color .15s',
        '&:hover, &:focus-visible': {
          transform: 'translateY(-2px)', borderColor: 'primary.main', outline: 'none',
          boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.18)}`,
        },
        '&:hover .challenge-arrow': { transform: 'translateX(3px)' },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5, flexShrink: 0, display: 'grid', placeItems: 'center',
          bgcolor: alpha(challenge.current ? ACCENT : theme.palette.text.secondary, 0.12),
          color: challenge.current ? ACCENT : 'text.secondary',
          ...(theme.palette.mode !== 'light' && challenge.current && { color: '#2dd4bf', bgcolor: alpha('#2dd4bf', 0.12) }),
        }}>
          <BrainCircuit size={24} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h3" sx={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.3, overflowWrap: 'anywhere' }}>
            {challenge.name}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            <StatusChip open={challenge.current} />
            <MetricChip metric={challenge.metric} />
            <StaffChips challenge={challenge} />
          </Stack>
        </Box>
      </Stack>

      {excerpt && (
        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {excerpt}
        </Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 'auto', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {mine ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Medal size={18} color={mine.pos <= 3 ? MEDALS[mine.pos - 1] : theme.palette.primary.main} />
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {t('challenges.your_rank', { pos: mine.pos })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              · {formatScore(mine.score, i18n.language)}
            </Typography>
          </Stack>
        ) : leader ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Trophy size={16} color={MEDALS[0]} />
            <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('challenges.leader', { name: leader.username, score: formatScore(leader.score, i18n.language) })}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {challenge.current ? t('challenges.join_cta') : t('challenges.see_results')}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography className="challenge-arrow" component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, color: 'primary.main', fontSize: '0.9rem', transition: 'transform .15s', flexShrink: 0 }}>
          {t('challenges.open_challenge')} <ArrowRight size={16} />
        </Typography>
      </Stack>
    </Box>
  );
}

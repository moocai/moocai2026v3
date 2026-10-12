import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Container, Typography, Stack, CircularProgress, Button, Tooltip } from '@mui/material';
import { ArrowDownward, ArrowUpward, InfoOutlined } from '@mui/icons-material';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../../hooks/useTheme';
import { courseService } from '../../services/courseService';
import { resolveSlug } from '../../hooks/useCourse';
import { useSeriesColors } from './chartColors';

interface TopicRow {
  topic: string;
  personal: number;
  avg: number;
  total: number;
  done: number;
}

// Colors de la diferència amb la mitjana (els del tema, llegibles en clar i en fosc): sempre
// amb icona (fletxa) i número, mai només color
const ABOVE_COLOR = 'success.main';
const BELOW_COLOR = 'error.main';

/* ─── BarRow ─── */
function BarRow({ row, active, accent, delayMs }: { row: TopicRow; active: boolean; accent: string; delayMs: number }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) { setShown(false); return; }
    const timeout = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timeout);
  }, [active, delayMs]);

  const diff = Math.round(row.personal - row.avg);
  const hasActivity = row.done > 0;
  const rowTip = t('dashboard.stats_row_tooltip', { topic: row.topic, you: row.personal, avg: row.avg, done: row.done, total: row.total });
  const diffTip = !hasActivity
    ? t('dashboard.stats_diff_none')
    : diff > 0 ? t('dashboard.stats_diff_above', { n: diff })
      : diff < 0 ? t('dashboard.stats_diff_below', { n: -diff })
        : t('dashboard.stats_diff_equal');
  const diffColor = !hasActivity || diff === 0 ? 'text.secondary' : diff > 0 ? ABOVE_COLOR : BELOW_COLOR;

  return (
    <Stack direction="row" spacing={2} sx={{ py: 1, alignItems: 'center' }}>
      <Typography
        variant="body2"
        sx={{ width: { xs: 110, md: 180 }, textAlign: 'left', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}
        title={row.topic}
      >
        {row.topic}
      </Typography>

      <Tooltip title={rowTip} arrow placement="top">
        <Box sx={{ flex: 1, position: 'relative', height: 18, borderRadius: 1, bgcolor: 'action.hover' }}>
          {[0, 20, 40, 60, 80, 100].map((g) => (
            <Box key={g} sx={{ position: 'absolute', top: 0, bottom: 0, left: `${g}%`, width: '1px', bgcolor: 'action.disabledBackground' }} />
          ))}
          <Box
            sx={{
              position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 1, bgcolor: accent,
              width: shown ? `${row.personal}%` : '0%',
              transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          {/* Mitjana de la classe: una marca sòlida del color del text, per sobre i per sota de la barra */}
          <Box
            sx={{
              position: 'absolute', top: -5, bottom: -5, left: `${row.avg}%`, width: 3, ml: '-1.5px',
              bgcolor: 'text.primary', borderRadius: 1, boxShadow: (theme) => `0 0 0 1px ${theme.palette.background.paper}`,
              transition: 'opacity 400ms', opacity: active ? 1 : 0,
            }}
          />
        </Box>
      </Tooltip>

      <Tooltip title={t('dashboard.stats_value_tooltip', { you: row.personal })} arrow placement="top">
        <Typography variant="body2" sx={{ width: 46, textAlign: 'right', fontWeight: 700, color: 'text.primary', flexShrink: 0 }}>
          {row.personal}%
        </Typography>
      </Tooltip>

      <Tooltip title={diffTip} arrow placement="top">
        <Stack direction="row" spacing={0.25} sx={{ width: 56, color: diffColor, alignItems: 'center', flexShrink: 0 }}>
          {hasActivity && diff > 0 && <ArrowUpward sx={{ fontSize: 14 }} />}
          {hasActivity && diff < 0 && <ArrowDownward sx={{ fontSize: 14 }} />}
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {!hasActivity ? '—' : diff === 0 ? '=' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`}
          </Typography>
        </Stack>
      </Tooltip>
    </Stack>
  );
}

/* ─── ChartCard ─── */
function ChartCard({ title, help, data, accent, delayStart = 0 }: { title: string; help: string; data: TopicRow[]; accent: string; delayStart?: number }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => setActive(true), delayStart); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delayStart]);

  return (
    <Box ref={ref} sx={{ border: '2px solid', borderColor: '#00685d', borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: accent, flexShrink: 0 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">({t('dashboard.stats_topics_count', { count: data.length })})</Typography>
          <Tooltip title={help} arrow placement="top">
            <InfoOutlined sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={2.5}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 14, height: 10, borderRadius: '3px', bgcolor: accent }} />
            <Typography variant="caption" color="text.secondary">{t('dashboard.stats_you')}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 3, height: 14, borderRadius: 1, bgcolor: 'text.primary' }} />
            <Typography variant="caption" color="text.secondary">{t('dashboard.stats_class_average')}</Typography>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: 2.5, py: 1.5 }}>
        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{t('dashboard.no_data')}</Typography>
        ) : (
          <>
            {/* Capçalera de la columna de la diferència, amb l'explicació */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ flex: 1 }} />
              <Tooltip title={t('dashboard.stats_vs_average_help')} arrow placement="top">
                <Typography variant="caption" color="text.secondary" sx={{ width: 56, flexShrink: 0, cursor: 'help', textDecoration: 'underline dotted' }}>
                  {t('dashboard.stats_vs_average')}
                </Typography>
              </Tooltip>
            </Stack>
            {data.map((row, i) => (
              <BarRow key={row.topic} row={row} active={active} accent={accent} delayMs={i * 55} />
            ))}
            <Stack direction="row" spacing={2} sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', alignItems: 'center' }}>
              <Box sx={{ width: { xs: 110, md: 180 }, flexShrink: 0 }} />
              <Box sx={{ flex: 1, position: 'relative', height: 14 }}>
                {[0, 20, 40, 60, 80, 100].map((g) => (
                  <Typography key={g} sx={{ position: 'absolute', left: `${g}%`, transform: 'translateX(-50%)', fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>
                    {g}%
                  </Typography>
                ))}
              </Box>
              <Box sx={{ width: 46, flexShrink: 0 }} />
              <Box sx={{ width: 56, flexShrink: 0 }} />
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}

/* ─── Component principal ─── */
export default function RendimentDashboard() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const colors = useSeriesColors();

  const [loading, setLoading] = useState(true);
  const [codeTopics, setCodeTopics] = useState<TopicRow[]>([]);
  const [testTopics, setTestTopics] = useState<TopicRow[]>([]);

  // 2 peticions, siguin quants siguin els temes:
  //  - `GET …/statistics/`: rendiment propi per tema i la mitjana REAL de la classe;
  //  - `GET …/topics/`: problemes per tema i progrés propi (per saber si hi ha activitat).
  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const slug = resolveSlug(courseId);
      const [stats, topics] = await Promise.all([
        courseService.getCourseStatistics(slug),
        courseService.getCourseTopics(slug).catch(() => [] as any[]),
      ]);
      const topicByName = new Map<string, any>(topics.map((topic: any) => [topic.name, topic]));
      const toRows = (rows: any[], kind: 'coding' | 'test'): TopicRow[] => (rows || []).map((r: any) => {
        const topic = topicByName.get(r.topic);
        const progress = topic?.my_progress;
        const personal = Math.round(Number(r.user_performance) || 0);
        return {
          topic: r.topic || '—',
          personal,
          avg: Math.round(Number(r.class_average) || 0),
          total: topic?.problem_counts?.[kind] ?? 0,
          // Sense el progrés del servidor (backend antic), el rendiment propi indica si n'hi ha
          done: progress ? (kind === 'coding' ? progress.coding_accepted : progress.tests_answered) : (personal > 0 ? 1 : 0),
        };
      });
      setCodeTopics(toRows(stats?.coding_data, 'coding'));
      setTestTopics(toRows(stats?.test_data, 'test'));
    } catch (err) {
      console.error('Error carregant dades de rendiment:', err);
      setCodeTopics([]);
      setTestTopics([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onProgress = () => fetchData();
    document.addEventListener('lessonProgressUpdated', onProgress);
    window.addEventListener('lessonProgressUpdated', onProgress);
    return () => {
      document.removeEventListener('lessonProgressUpdated', onProgress);
      window.removeEventListener('lessonProgressUpdated', onProgress);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'relative', minHeight: '100%',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#0a0e17' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, md: 8 } }}>
        {/* Tornar al tauler, com el "tornar al curs" de les pàgines de test i de problema */}
        <Button
          component={RouterLink}
          to={`/dashboards/student?course=${encodeURIComponent(courseId ? resolveSlug(courseId) : '')}`}
          startIcon={<ChevronLeft size={18} />}
          sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}
        >
          {t('dashboard.title')}
        </Button>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' }, mb: 3 }}>
          {t('dashboard.more_statistics')}
        </Typography>

        <Box sx={{ display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
          <ChartCard title={t('dashboard.stats_coding_title')} help={t('dashboard.stats_coding_help')} data={codeTopics} accent={colors.coding} delayStart={0} />
          <ChartCard title={t('dashboard.stats_test_title')} help={t('dashboard.stats_test_help')} data={testTopics} accent={colors.tests} delayStart={150} />
        </Box>
      </Container>
    </Box>
  );
}

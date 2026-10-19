import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Stack, CircularProgress, Tooltip, Button, useMediaQuery } from '@mui/material';
import { ArrowDownward, ArrowUpward, InfoOutlined, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { courseService } from '../../services/courseService';
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
    <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ py: 1, alignItems: 'center' }}>
      <Typography
        variant="body2"
        sx={{ width: { xs: 80, sm: 110, md: 180 }, textAlign: 'left', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}
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
        <Typography variant="body2" sx={{ width: { xs: 38, sm: 46 }, textAlign: 'right', fontWeight: 700, color: 'text.primary', flexShrink: 0 }}>
          {row.personal}%
        </Typography>
      </Tooltip>

      <Tooltip title={diffTip} arrow placement="top">
        <Stack direction="row" spacing={0.25} sx={{ width: { xs: 48, sm: 56 }, color: diffColor, alignItems: 'center', flexShrink: 0 }}>
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
const STATS_TOPICS_LIMIT = 4;

function ChartCard({ title, help, data, accent, delayStart = 0 }: { title: string; help: string; data: TopicRow[]; accent: string; delayStart?: number }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // En pantalles grans (p. ex. 2590×1440) hi caben més temes sense fer créixer la targeta
  const isLargeScreen = useMediaQuery('(min-width: 1920px)');
  const limit = isLargeScreen ? 10 : STATS_TOPICS_LIMIT;

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: accent, flexShrink: 0 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">({t('dashboard.stats_topics_count', { count: data.length })})</Typography>
            <Tooltip title={help} arrow placement="top">
              <InfoOutlined sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Stack>
          {/* Llegenda a la dreta del box, separada del títol */}
          <Stack direction="row" spacing={2.5} sx={{ ml: 'auto', alignItems: 'center' }}>
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
      </Box>

      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5 }}>
        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{t('dashboard.no_data')}</Typography>
        ) : (
          <>
            {/* Capçalera de la columna de la diferència, amb l'explicació */}
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
              <Box sx={{ flex: 1 }} />
              <Tooltip title={t('dashboard.stats_vs_average_help')} arrow placement="top">
                <Typography variant="caption" color="text.secondary" sx={{ width: { xs: 48, sm: 56 }, flexShrink: 0, cursor: 'help', textDecoration: 'underline dotted' }}>
                  {t('dashboard.stats_vs_average')}
                </Typography>
              </Tooltip>
            </Stack>
            {(expanded ? data : data.slice(0, limit)).map((row, i) => (
              <BarRow key={row.topic} row={row} active={active} accent={accent} delayMs={i * 55} />
            ))}
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', alignItems: 'center' }}>
              <Box sx={{ width: { xs: 80, sm: 110, md: 180 }, flexShrink: 0 }} />
              <Box sx={{ flex: 1, position: 'relative', height: 14 }}>
                {/* Al mòbil la barra és estreta: només 0, 50 i 100 % (si no, les etiquetes se sobreposen) */}
                {[0, 20, 40, 50, 60, 80, 100].map((g) => (
                  <Typography key={g} sx={{
                    position: 'absolute', left: `${g}%`, transform: 'translateX(-50%)', fontSize: 10, color: 'text.secondary', lineHeight: 1,
                    display: g === 50 ? { xs: 'block', sm: 'none' } : g === 0 || g === 100 ? 'block' : { xs: 'none', sm: 'block' },
                  }}>
                    {g}%
                  </Typography>
                ))}
              </Box>
              <Box sx={{ width: { xs: 38, sm: 46 }, flexShrink: 0 }} />
              <Box sx={{ width: { xs: 48, sm: 56 }, flexShrink: 0 }} />
            </Stack>
            {data.length > limit && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                <Button
                  size="small"
                  onClick={() => setExpanded((v) => !v)}
                  endIcon={expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {expanded
                    ? t('dashboard.stats_show_less')
                    : t('dashboard.stats_show_more', { count: data.length - limit })}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

/* ─── Gràfics de rendiment per tema (al tauler) ─── */
type StatsData = { coding: TopicRow[]; tests: TopicRow[] };

export const courseStatsKey = (slug: string) => ['course-stats', slug] as const;

// 2 peticions, siguin quants siguin els temes:
//  - `GET …/statistics/`: rendiment propi per tema i la mitjana REAL de la classe;
//  - `GET …/topics/`: problemes per tema i progrés propi (per saber si hi ha activitat).
async function fetchCourseStats(slug: string): Promise<StatsData> {
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
  return { coding: toRows(stats?.coding_data, 'coding'), tests: toRows(stats?.test_data, 'test') };
}

/**
 * Rendiment per tema (programació i tests), el propi i la mitjana de la classe. Abans era la
 * pàgina "Més estadístiques"; ara és una secció del tauler del curs.
 */
export function CourseStatsCharts({ courseSlug }: { courseSlug: string }) {
  const { t } = useTranslation();
  const colors = useSeriesColors();
  const queryClient = useQueryClient();
  const stats = useQuery({
    queryKey: courseStatsKey(courseSlug),
    queryFn: () => fetchCourseStats(courseSlug),
    enabled: !!courseSlug,
    staleTime: 60 * 1000,
  });

  // En resoldre un problema o un test, les xifres canvien
  useEffect(() => {
    const onProgress = () => { void queryClient.invalidateQueries({ queryKey: courseStatsKey(courseSlug) }); };
    document.addEventListener('lessonProgressUpdated', onProgress);
    window.addEventListener('lessonProgressUpdated', onProgress);
    return () => {
      document.removeEventListener('lessonProgressUpdated', onProgress);
      window.removeEventListener('lessonProgressUpdated', onProgress);
    };
  }, [courseSlug, queryClient]);

  return (
    <Box component="section">
      <Typography component="h2" variant="h6" sx={{ fontWeight: 900, mb: 2 }}>{t('dashboard.performance_title')}</Typography>
      {stats.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
          <ChartCard title={t('dashboard.stats_coding_title')} help={t('dashboard.stats_coding_help')} data={stats.data?.coding ?? []} accent={colors.coding} delayStart={0} />
          <ChartCard title={t('dashboard.stats_test_title')} help={t('dashboard.stats_test_help')} data={stats.data?.tests ?? []} accent={colors.tests} delayStart={150} />
        </Box>
      )}
    </Box>
  );
}

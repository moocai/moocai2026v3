import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** Un tema del gràfic: problemes visibles i resolts de cada tipus (del servidor). */
export type TopicProgressItem = {
  id: string;
  title: string;
  current?: boolean;
  coding: { total: number; done: number };
  tests: { total: number; done: number };
};

// Colors de les dues sèries, validats (separació per daltonisme i contrast) sobre el fons de
// les targetes en clar i en fosc: programació = el color principal del tema, tests = verd blavós.
const TESTS_COLOR = '#0d9488';

/** Temes que hi caben sense fer créixer la targeta (la mateixa alçada que el rànquing). */
const TOPIC_CHART_MAX = 5;

/**
 * Progrés per tema: una fila per tema (els més recents primer) amb dues barres, el % de
 * problemes de programació acceptats i el de tests contestats. Un tema sense problemes d'un
 * tipus no mostra 0% (semblaria feina pendent) sinó "—". Només hi surten els últims temes.
 */
export function TopicProgressChart({ topics, onOpen }: { topics: TopicProgressItem[]; onOpen: (topicId: string, kind: 'coding' | 'tests') => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const series = [
    { key: 'coding' as const, label: t('dashboard.chart_code'), color: theme.palette.primary.main, empty: t('dashboard.no_code_problems') },
    { key: 'tests' as const, label: t('dashboard.chart_tests'), color: TESTS_COLOR, empty: t('dashboard.no_test_problems') },
  ];
  const shown = [...topics].reverse().slice(0, TOPIC_CHART_MAX);
  const older = topics.length - shown.length;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Llegenda: sempre, perquè la sèrie no es distingeixi només pel color */}
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mb: 1.5, flexWrap: 'wrap' }}>
        {series.map((s) => (
          <Stack key={s.key} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: s.color }} />
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Stack>
        ))}
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>—</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.chart_none')}</Typography>
        </Stack>
      </Stack>

      <Stack spacing={1.75} sx={{ width: '100%' }}>
        {shown.map((topic) => (
          <Box key={topic.id} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 38%) 1fr', columnGap: 1.5, alignItems: 'center' }}>
            <Typography
              variant="body2"
              title={topic.title}
              sx={{ textAlign: 'left', fontSize: { xs: '0.78rem', md: '0.85rem' }, fontWeight: topic.current ? 800 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {topic.title}
            </Typography>
            <Stack spacing={0.25}>
              {series.map((s) => {
                const { total, done } = topic[s.key];
                const pct = total > 0 ? Math.round((done / total) * 100) : null;
                const tip = pct == null
                  ? `${topic.title} · ${s.empty}`
                  : t('dashboard.chart_bar_tooltip', { topic: topic.title, kind: s.label, done, total, pct });
                return (
                  <Tooltip key={s.key} title={tip} arrow placement="top">
                    <Box
                      role="button" tabIndex={0} aria-label={tip}
                      onClick={() => onOpen(topic.id, s.key)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(topic.id, s.key); }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover .bar-fill': { opacity: 0.8 } }}
                    >
                      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: pct == null ? 'transparent' : 'action.disabledBackground', border: pct == null ? '1px dashed' : 'none', borderColor: 'divider', overflow: 'hidden' }}>
                        {pct != null && <Box className="bar-fill" sx={{ width: `${pct}%`, height: '100%', bgcolor: s.color, borderRadius: 4 }} />}
                      </Box>
                      <Typography variant="caption" sx={{ width: 34, textAlign: 'right', fontWeight: 700, fontSize: '0.72rem', lineHeight: 1.2, color: pct == null ? 'text.secondary' : 'text.primary' }}>
                        {pct == null ? '—' : `${pct}%`}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
      {older > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'left' }}>
          {t('dashboard.chart_older_topics', { count: older })}
        </Typography>
      )}
    </Box>
  );
}

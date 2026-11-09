import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { useSeriesColors } from './chartColors';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../../hooks/useTheme';

/** Un tema del gràfic: problemes visibles i resolts de cada tipus (del servidor). */
export type TopicProgressItem = {
  id: string;
  title: string;
  current?: boolean;
  coding: { total: number; done: number };
  tests: { total: number; done: number };
};

/** Temes que hi caben sense fer créixer la targeta (la mateixa alçada que el rànquing). */
const TOPIC_CHART_MAX = 5;

/**
 * Progrés per tema: una fila per tema (els més recents primer) amb dues barres, el % de
 * problemes de programació acceptats i el de tests contestats. Un tema sense problemes d'un
 * tipus no mostra 0% (semblaria feina pendent) sinó "—". Només hi surten els últims temes.
 */
export function TopicProgressChart({ topics, onOpen }: { topics: TopicProgressItem[]; onOpen: (topicId: string, kind: 'coding' | 'tests') => void }) {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  // El border de cada barra: negre en tema clar i blanc en dark/fancy perquè es vegi bé
  const borderColor = mode === 'light' ? '#000' : '#fff';
  const colors = useSeriesColors();
  const series = [
    { key: 'coding' as const, label: t('dashboard.chart_code'), color: colors.coding, empty: t('dashboard.no_code_problems') },
    { key: 'tests' as const, label: t('dashboard.chart_tests'), color: colors.tests, empty: t('dashboard.no_test_problems') },
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
            <Stack direction="row" spacing={1}>
              {series.map((s) => {
                const { total, done } = topic[s.key];
                const pct = total > 0 ? Math.round((done / total) * 100) : null;
                const tip = pct == null
                  ? `${topic.title} · ${s.empty}`
                  : t('dashboard.chart_bar_tooltip', { topic: topic.title, kind: s.label, done, total, pct });
                return (
                  <Tooltip key={s.key} title={tip} arrow placement="top">
                    <Box component="span" sx={{ display: 'flex', flex: 1, minWidth: 0 }}>
                      <Box component="button" type="button" onClick={() => onOpen(topic.id, s.key)} sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', background: 'none', border: 'none', p: 0, font: 'inherit', textAlign: 'left', '&:hover .bar-fill': { opacity: 0.8 }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', borderRadius: 1 } }}>
                        <span style={visuallyHidden}>{tip}</span>
                        <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: pct == null ? 'transparent' : 'action.disabledBackground', border: pct == null ? '1px dashed' : '1px solid', borderColor, overflow: 'hidden' }}>
                          {pct != null && <Box className="bar-fill" sx={{ width: `${pct}%`, height: '100%', bgcolor: s.color, borderRadius: 3 }} />}
                        </Box>
                        <Typography variant="caption" sx={{ width: 28, textAlign: 'right', fontWeight: 700, fontSize: '0.65rem', lineHeight: 1.2, color: borderColor }}>
                          {pct == null ? '—' : `${pct}%`}
                        </Typography>
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
      {older > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          {t('dashboard.chart_older_topics', { count: older })}
        </Typography>
      )}
    </Box>
  );
}
import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const BAR_W = 14;
const GROUP_W = 72;
const PLOT_H = 130;

/**
 * Gràfic de barres verticals: per a cada tema, el % de problemes de programació resolts i de
 * tests contestats. Un tema sense problemes d'un tipus no mostra 0% (semblaria feina pendent)
 * sinó una marca "—". Hi caben tots els temes amb scroll horitzontal; d'entrada es veu el
 * tema en curs (o l'últim), que és on l'alumne està treballant.
 */
export function TopicProgressChart({ topics, onOpen }: { topics: TopicProgressItem[]; onOpen: (topicId: string, kind: 'coding' | 'tests') => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const codeColor = theme.palette.primary.main;
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasCurrent = topics.some((topic) => topic.current);
  // Fletxes per moure's pels temes quan no hi caben tots (si n'hi ha més a banda i banda)
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScroll({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  };
  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(GROUP_W, Math.floor(el.clientWidth / GROUP_W) * GROUP_W);
    el.scrollTo({ left: el.scrollLeft + dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = hasCurrent ? topics.findIndex((topic) => topic.current) : topics.length - 1;
    // El tema enfocat queda a la dreta de la zona visible, amb els anteriors a l'esquerra;
    // l'scroll s'ajusta a temes sencers perquè el primer no surti tallat.
    const target = Math.max(0, (index + 1) * GROUP_W - el.clientWidth);
    el.scrollLeft = Math.ceil(target / GROUP_W) * GROUP_W;
    updateArrows();
  }, [topics, hasCurrent]);

  const series = [
    { key: 'coding' as const, label: t('dashboard.chart_code'), color: codeColor, empty: t('dashboard.no_code_problems') },
    { key: 'tests' as const, label: t('dashboard.chart_tests'), color: TESTS_COLOR, empty: t('dashboard.no_test_problems') },
  ];

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Llegenda: sempre, perquè la sèrie no es distingeixi només pel color */}
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', mb: 1.5, position: 'relative' }}>
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
        {(canScroll.left || canScroll.right) && (
          <Stack direction="row" sx={{ position: { md: 'absolute' }, right: 0 }}>
            <IconButton size="small" disabled={!canScroll.left} onClick={() => scrollBy(-1)} aria-label={t('dashboard.chart_previous')}><ChevronLeft size={16} /></IconButton>
            <IconButton size="small" disabled={!canScroll.right} onClick={() => scrollBy(1)} aria-label={t('dashboard.chart_next')}><ChevronRight size={16} /></IconButton>
          </Stack>
        )}
      </Stack>

      <Box sx={{ display: 'flex', width: '100%' }}>
        {/* Eix Y: 0 / 50 / 100 % */}
        <Box sx={{ position: 'relative', width: 34, height: PLOT_H, flexShrink: 0 }}>
          {[100, 50, 0].map((v) => (
            <Typography key={v} variant="caption" color="text.secondary"
              sx={{ position: 'absolute', right: 6, top: PLOT_H * (1 - v / 100) - 8, fontSize: '0.65rem' }}>
              {v}%
            </Typography>
          ))}
        </Box>

        <Box ref={scrollRef} onScroll={updateArrows} sx={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', pb: 0.5 }}>
          <Box sx={{ position: 'relative', width: topics.length * GROUP_W, minWidth: '100%' }}>
            {/* Graella discreta */}
            {[100, 50, 0].map((v) => (
              <Box key={v} sx={{ position: 'absolute', left: 0, right: 0, top: PLOT_H * (1 - v / 100), borderTop: '1px solid', borderColor: v === 0 ? 'text.disabled' : 'divider' }} />
            ))}

            <Stack direction="row" sx={{ position: 'relative' }}>
              {topics.map((topic) => (
                <Box key={topic.id} sx={{ width: GROUP_W, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Stack direction="row" spacing="2px" sx={{ height: PLOT_H, alignItems: 'flex-end' }}>
                    {series.map((s) => {
                      const { total, done } = topic[s.key];
                      const pct = total > 0 ? Math.round((done / total) * 100) : null;
                      const tip = pct == null
                        ? `${topic.title} · ${s.empty}`
                        : t('dashboard.chart_bar_tooltip', { topic: topic.title, kind: s.label, done, total, pct });
                      return (
                        <Tooltip key={s.key} title={tip} arrow placement="top">
                          {/* Zona de hover/clic més ampla i alta que la barra */}
                          <Box
                            role="button" tabIndex={0} aria-label={tip}
                            onClick={() => onOpen(topic.id, s.key)}
                            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(topic.id, s.key); }}
                            sx={{ width: BAR_W + 6, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', cursor: 'pointer', '&:hover > *': { opacity: 0.8 } }}
                          >
                            {pct == null ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, lineHeight: 1, mb: 0.5 }}>—</Typography>
                            ) : (
                              // Mínim de 2px perquè un 0% es vegi (barra a tocar de la base)
                              <Box sx={{ width: BAR_W, height: `max(2px, ${pct}%)`, bgcolor: s.color, borderRadius: '4px 4px 0 0' }} />
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                  <Typography
                    variant="caption"
                    title={topic.title}
                    sx={{
                      mt: 0.75, px: 0.5, width: '100%', textAlign: 'center', fontSize: '0.68rem', lineHeight: 1.25, display: 'block',
                      color: topic.current ? 'text.primary' : 'text.secondary', fontWeight: topic.current ? 800 : 500,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {topic.title}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

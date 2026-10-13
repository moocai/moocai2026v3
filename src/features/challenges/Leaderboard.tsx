import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography, alpha, useTheme } from '@mui/material';
import { Crown, Trophy } from 'lucide-react';
import { ProtectedAvatar } from '../../components/ProtectedAvatar';
import { userAvatarUrl } from '../../utils/avatarCache';
import type { BoardName, LeaderboardEntry, Leaderboards } from '../../services/challengeService';
import { MEDALS, formatScore } from './shared';

const BOARD_ORDER: BoardName[] = ['public', 'private', 'final'];

/** Tauler per defecte: el final un cop el repte és tancat, si no el públic. */
export function defaultBoard(boards: Leaderboards): BoardName {
  return boards.final ? 'final' : 'public';
}

interface Props {
  courseSlug: string;
  boards: Leaderboards;
  myId: string | null;
  /** El repte ja no accepta entregues */
  closed: boolean;
}

/**
 * Classificació d'un repte: podi per als tres primers i, a sota, la resta de posicions.
 * L'alumnat només rep el top 5 i la seva posició: si queda més avall, se separa amb "⋯".
 */
export function Leaderboard({ courseSlug, boards, myId, closed }: Props) {
  const { t, i18n } = useTranslation();
  const available = BOARD_ORDER.filter((b) => boards[b]);
  const [board, setBoard] = useState<BoardName>(() => defaultBoard(boards));
  const current = boards[board] ? board : available[0] ?? 'public';
  const entries = boards[current] ?? [];

  const podium = entries.filter((e) => e.pos <= 3).slice(0, 3);
  const rest = entries.filter((e) => !podium.includes(e));

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {t(`challenges.board_hint_${current}`)}
        </Typography>
        {available.length > 1 && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={current}
            onChange={(_, v: BoardName | null) => v && setBoard(v)}
            aria-label={t('challenges.leaderboard')}
            sx={{ flexShrink: 0, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, px: 1.75 } }}
          >
            {available.map((b) => (
              <ToggleButton key={b} value={b}>{t(`challenges.board_${b}`)}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Stack>

      {!closed && available.length === 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -1.5, mb: 2 }}>
          {t('challenges.private_after_close')}
        </Typography>
      )}

      {entries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Trophy size={40} style={{ opacity: 0.45 }} />
          <Typography sx={{ mt: 1.5, fontWeight: 700 }}>{t('challenges.no_entries')}</Typography>
          {!closed && <Typography variant="body2">{t('challenges.be_first')}</Typography>}
        </Box>
      ) : (
        <>
          <Podium courseSlug={courseSlug} entries={podium} myId={myId} language={i18n.language} />
          {rest.length > 0 && (
            <Box component="ol" sx={{ listStyle: 'none', m: 0, mt: 2, p: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              {rest.map((entry, i) => {
                const prev = i === 0 ? podium[podium.length - 1] : rest[i - 1];
                const gap = prev ? entry.pos > prev.pos + 1 : entry.pos > 1;
                return (
                  <Fragment key={`${entry.user_id}-${entry.pos}`}>
                    {gap && (
                      <Box component="li" aria-hidden sx={{ textAlign: 'center', py: 0.5, color: 'text.disabled', fontWeight: 900, letterSpacing: 4, borderTop: i === 0 ? 0 : '1px solid', borderColor: 'divider' }}>
                        ⋯
                      </Box>
                    )}
                    <Row courseSlug={courseSlug} entry={entry} isMe={entry.user_id === myId} first={i === 0 && !gap} language={i18n.language} />
                  </Fragment>
                );
              })}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function Row({ courseSlug, entry, isMe, first, language }: { courseSlug: string; entry: LeaderboardEntry; isMe: boolean; first: boolean; language: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Stack
      component="li"
      direction="row"
      spacing={1.5}
      aria-current={isMe ? 'true' : undefined}
      sx={{
        alignItems: 'center', px: 2, py: 1.1,
        borderTop: first ? 0 : '1px solid', borderColor: 'divider',
        bgcolor: isMe ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
        boxShadow: isMe ? `inset 3px 0 0 ${theme.palette.primary.main}` : 'none',
      }}
    >
      <Typography sx={{ width: 32, fontWeight: 900, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>#{entry.pos}</Typography>
      <ProtectedAvatar src={userAvatarUrl(entry.user_id, courseSlug)} alt={entry.username} sx={{ width: 30, height: 30, fontSize: '0.85rem' }} />
      <Typography sx={{ flex: 1, minWidth: 0, fontWeight: isMe ? 900 : 600, color: isMe ? 'primary.main' : 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.username}{isMe && ` (${t('challenges.you')})`}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatScore(entry.score, language)}</Typography>
    </Stack>
  );
}

/** Els tres primers: el 1r al centre i més alt, el 2n a l'esquerra i el 3r a la dreta. */
function Podium({ courseSlug, entries, myId, language }: { courseSlug: string; entries: LeaderboardEntry[]; myId: string | null; language: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (entries.length === 0) return null;
  const order = [entries[1], entries[0], entries[2]];
  const heights = [72, 100, 56];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: { xs: 1, sm: 2 }, alignItems: 'end', pt: 2 }}>
      {order.map((entry, slot) => {
        if (!entry) return <Box key={`empty-${slot}`} />;
        const medal = MEDALS[Math.min(entry.pos, 3) - 1];
        const isMe = entry.user_id === myId;
        const winner = slot === 1;
        return (
          <Stack key={entry.user_id} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box sx={{ position: 'relative', mb: 1 }}>
              {winner && (
                <Box sx={{ position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)', color: medal }}>
                  <Crown size={22} fill="currentColor" />
                </Box>
              )}
              <ProtectedAvatar
                src={userAvatarUrl(entry.user_id, courseSlug)}
                alt={entry.username}
                sx={{ width: winner ? 64 : 52, height: winner ? 64 : 52, border: '3px solid', borderColor: medal, boxShadow: `0 0 0 4px ${alpha(medal, 0.2)}` }}
              />
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.8rem', sm: '0.95rem' }, color: isMe ? 'primary.main' : 'text.primary', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.username}{isMe && ` (${t('challenges.you')})`}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontVariantNumeric: 'tabular-nums', mb: 1 }}>
              {formatScore(entry.score, language)}
            </Typography>
            <Box sx={{
              width: '100%', height: heights[slot], borderRadius: '12px 12px 4px 4px',
              background: `linear-gradient(180deg, ${alpha(medal, 0.55)} 0%, ${alpha(medal, 0.12)} 100%)`,
              border: '1px solid', borderColor: alpha(medal, 0.5), borderBottom: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: 1,
              outline: isMe ? `2px solid ${theme.palette.primary.main}` : 'none', outlineOffset: 2,
            }}>
              <Typography sx={{ fontWeight: 900, fontSize: winner ? '1.6rem' : '1.25rem', color: theme.palette.mode === 'light' ? alpha('#000', 0.65) : '#fff' }}>
                {entry.pos}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Box>
  );
}

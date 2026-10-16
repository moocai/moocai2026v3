import { Box, Chip, alpha } from '@mui/material';
import { Archive, ArrowDownWideNarrow, ArrowUpWideNarrow, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getBaseLanguage } from '../../utils/formatters';
import { LOWER_IS_BETTER, type Challenge, type ChallengeMetric } from '../../services/challengeService';

/** Color d'accent de les pàgines de curs (Drive, Enquestes…) */
export const ACCENT = '#00685d';
export const OPEN_COLOR = '#16a34a';
export const MEDALS = ['#ffb700', '#a8b2c1', '#cd7f32'] as const;

/** Noms curts de les mètriques (són iguals en tots els idiomes) */
export const METRIC_LABELS: Record<ChallengeMetric, string> = {
  mae: 'MAE',
  mse: 'MSE',
  rmse: 'RMSE',
  accuracy: 'Accuracy',
  balanced_accuracy: 'Balanced accuracy',
  f1: 'F1',
  precision: 'Precision',
  recall: 'Recall',
};

/** Id de l'usuari de la sessió (el desa el login a `currentStudent`). */
export function currentUserId(): string | null {
  try {
    const id = JSON.parse(localStorage.getItem('currentStudent') || 'null')?.id;
    return id === undefined || id === null ? null : String(id);
  } catch {
    return null;
  }
}

/** Descripció del repte en l'idioma de l'usuari (Markdown), amb les altres com a reserva. */
export function challengeDescription(challenge: Challenge, language: string | undefined): string {
  const lang = getBaseLanguage(language, 'ca');
  return (
    challenge[`description_${lang}` as const]
    || challenge.description_ca || challenge.description_es || challenge.description_en || ''
  ).trim();
}

/** Text pla d'un Markdown, per als resums de les targetes. */
export function markdownExcerpt(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    // Fora títols i taules: al resum només hi ha d'anar el text
    .replace(/^\s{0,3}#{1,6}\s.*$/gm, ' ')
    .replace(/^\s*\|.*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Puntuació llegible: com a molt 4 decimals, amb el format de l'idioma. */
export function formatScore(score: number | null | undefined, language?: string): string {
  if (score === null || score === undefined || Number.isNaN(score)) return '—';
  return score.toLocaleString(language, { maximumFractionDigits: 4 });
}

export function formatDateTime(iso: string | null | undefined, language?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Pastilla "Obert" (amb un punt que batega) o "Tancat". */
export function StatusChip({ open, size = 'small' }: { open: boolean; size?: 'small' | 'medium' }) {
  const { t } = useTranslation();
  return (
    <Chip
      size={size}
      label={open ? t('challenges.status_open') : t('challenges.status_closed')}
      icon={
        <Box component="span" sx={{ position: 'relative', width: 8, height: 8, ml: '8px !important', display: 'inline-flex' }}>
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: open ? OPEN_COLOR : 'text.disabled' }} />
          {open && (
            <Box component="span" sx={{
              position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: OPEN_COLOR,
              animation: 'challengePulse 1.6s ease-out infinite',
              '@keyframes challengePulse': { '0%': { transform: 'scale(1)', opacity: 0.7 }, '100%': { transform: 'scale(2.6)', opacity: 0 } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }} />
          )}
        </Box>
      }
      sx={{
        fontWeight: 800,
        bgcolor: open ? alpha(OPEN_COLOR, 0.12) : 'action.hover',
        color: open ? OPEN_COLOR : 'text.secondary',
        border: '1px solid', borderColor: open ? alpha(OPEN_COLOR, 0.35) : 'divider',
      }}
    />
  );
}

/** Mètrica del repte amb el sentit en què millora ("com més baix, millor"). */
export function MetricChip({ metric, size = 'small' }: { metric: ChallengeMetric; size?: 'small' | 'medium' }) {
  const { t } = useTranslation();
  const lower = LOWER_IS_BETTER.has(metric);
  const Icon = lower ? ArrowDownWideNarrow : ArrowUpWideNarrow;
  return (
    <Chip
      size={size}
      variant="outlined"
      icon={<Icon size={14} />}
      label={`${METRIC_LABELS[metric] ?? metric} · ${lower ? t('challenges.lower_better') : t('challenges.higher_better')}`}
      sx={{ fontWeight: 700 }}
    />
  );
}

/** Estat que només veu el professorat: bloquejat (l'alumnat no el veu) i arxivat. */
export function StaffChips({ challenge }: { challenge: Challenge }) {
  const { t } = useTranslation();
  return (
    <>
      {challenge.locked && (
        <Chip size="small" color="error" variant="outlined" icon={<Lock size={13} />} label={t('challenges.locked')} sx={{ fontWeight: 700 }} />
      )}
      {challenge.is_archived && (
        <Chip size="small" variant="outlined" icon={<Archive size={13} />} label={t('challenges.archived')} sx={{ fontWeight: 700 }} />
      )}
    </>
  );
}

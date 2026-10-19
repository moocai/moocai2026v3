import { Chip } from '@mui/material';
import { Lock, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusChip, formatScore } from '../challenges/shared';
import type { Exam } from '../../services/examService';

/** Obert/tancat, Safe Exam Browser i (només professorat) bloquejat. */
export function ExamChips({ exam, size = 'small' }: { exam: Exam; size?: 'small' | 'medium' }) {
  const { t } = useTranslation();
  return (
    <>
      <StatusChip open={exam.current} size={size} />
      {exam.require_seb && (
        <Chip size={size} variant="outlined" icon={<ShieldCheck size={13} />} label={t('exams.seb')} sx={{ fontWeight: 700 }} />
      )}
      {exam.locked && (
        <Chip size={size} color="error" variant="outlined" icon={<Lock size={13} />} label={t('challenges.locked')} sx={{ fontWeight: 700 }} />
      )}
    </>
  );
}

/** Què té l'examen: "3 problemes de codi · 5 preguntes" o "Entrega de fitxer". */
export function useExamContents(exam: Exam): string {
  const { t } = useTranslation();
  if (exam.kind === 'challenge' || !exam.problem_counts) return t('exams.kind_challenge');
  const { coding, test } = exam.problem_counts;
  return [
    coding > 0 ? t('exams.coding_count', { count: coding }) : null,
    test > 0 ? t('exams.test_count', { count: test }) : null,
  ].filter(Boolean).join(' · ');
}

/**
 * Nota pròpia de l'examen, o `null` per al professorat (que no en té).
 * La nota la posa el professorat: mentre l'examen és obert només es diu si s'ha entregat.
 * Exàmens de tema: punts sobre el màxim. De repte: la nota del professorat, sobre 10.
 */
export function useExamScore(exam: Exam): string | null {
  const { t, i18n } = useTranslation();
  if (exam.submitted === null) return null;
  if (exam.kind === 'challenge') {
    if (!exam.submitted) return t('exams.not_submitted');
    if (exam.my_score === null) return t('exams.not_graded');
    return t('exams.score_value', { score: formatScore(exam.my_score, i18n.language), max: 10 });
  }
  if (!exam.submitted) return t('exams.not_submitted');
  if (exam.current) return t('exams.submitted');
  return t('exams.score_value', {
    score: formatScore(exam.my_score, i18n.language),
    max: formatScore(exam.max_score, i18n.language),
  });
}

/** Per què no es pot obrir un examen (o `null` si es pot). */
export function useExamBlockedReason(exam: Exam): string | null {
  const { t } = useTranslation();
  if (exam.available) return null;
  return exam.current && exam.require_seb ? t('exams.seb_required') : t('exams.closed');
}

import { useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress, alpha, useTheme, Collapse } from '@mui/material';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// import { api } from '../../services/api'; // revisió IA (desactivada)
import { MarkdownContent } from '../../components/MarkdownContent';
import { CodeBlock } from '../../components/CodeBlock';
import type { AiHint } from '../../hooks/useAiHints';

/** Una pista: el text (Markdown) i, plegat, el codi que l'alumne tenia quan la va demanar. */
function HintCard({ hint }: { hint: AiHint }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [showCode, setShowCode] = useState(false);
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.3), bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
      {hint.created_at && (
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5 }}>
          {new Date(hint.created_at).toLocaleString(i18n.language)}
        </Typography>
      )}
      <MarkdownContent fontSize="0.9rem">{hint.hint_text || ''}</MarkdownContent>
      {hint.user_code && (
        <Box sx={{ mt: 1 }}>
          <Button size="small" onClick={() => setShowCode((v) => !v)} startIcon={showCode ? <ChevronDown size={14} /> : <ChevronRight size={14} />} sx={{ textTransform: 'none', fontSize: '0.75rem', px: 0.5, minWidth: 0 }}>
            {t('lesson.hint_your_code', 'El teu codi en aquell moment')}
          </Button>
          <Collapse in={showCode} unmountOnExit>
            <Box sx={{ mt: 0.5 }}><CodeBlock code={hint.user_code} /></Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

/**
 * Pestanya IA: les pistes d'IA del problema (com a algorien, la més recent primer) i la
 * revisió del codi un cop resolt. Les pistes es demanen des d'aquí o des del botó de l'editor.
 */
export function AiHelpPanel({ courseId, topicSlug, lessonId, hints, loadingHints, generating, hintError, remaining, hintsAvailable, onLoadHints, onRequestHint }: {
  courseId: string; topicSlug: string; lessonId: string;
  hints: AiHint[]; loadingHints: boolean; generating: boolean; hintError: string | null; remaining: number | null;
  /** El curs permet pistes d'IA a l'usuari */
  hintsAvailable: boolean;
  onLoadHints: () => void; onRequestHint: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  useEffect(() => { onLoadHints(); }, [courseId, topicSlug, lessonId]);

  /* Revisió IA del codi (desactivada fins que estigui implementada al servidor):
  const [review, setReview] = useState<string | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const fetchAiReview = async () => {
    if (!courseId || !lessonId || !topicSlug) return;
    setLoadingReview(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/topics/${topicSlug}/problems/${lessonId}/submissions/review/`);
      setReview(data?.review_text || data?.detail || t('lesson.review_done', 'Revisió completada.'));
    } catch (err: any) {
      // L'API explica per què no hi ha revisió (`detail`)
      setReview(err?.response?.data?.detail || t('lesson.review_error', "No s'ha pogut obtenir la revisió. Comprova la connexió."));
    } finally {
      setLoadingReview(false);
    }
  };
  */

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!hintsAvailable ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {t('lesson.hints_unavailable', 'Les pistes d\'IA no estan disponibles en aquest curs.')}
        </Typography>
      ) : (<>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={onRequestHint} disabled={generating || remaining === 0} startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <Bot size={16} />} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {generating ? t('lesson.hint_generating', 'Generant la pista…') : t('lesson.hint_request', 'Demana una pista')}
        </Button>
        {remaining !== null && (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {t('lesson.hints_remaining', '{{count}} restants avui', { count: remaining })}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: -1 }}>
        {t('lesson.hint_explain', "La pista té en compte el codi que tens ara a l'editor.")}
      </Typography>
      </>)}

      {hintError && (
        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}` }}>
          <Typography sx={{ fontSize: '0.85rem' }}>{hintError}</Typography>
        </Box>
      )}

      {loadingHints && hints.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
      ) : hints.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontStyle: 'italic' }}>
          {t('lesson.no_hints', 'Encara no has demanat cap pista en aquest problema.')}
        </Typography>
      ) : (
        hints.map((h) => <HintCard key={h.id} hint={h} />)
      )}

      {/* Revisió IA del codi: desactivada fins que estigui implementada al servidor.
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 1, color: 'primary.main' }}>
          {t('lesson.review_title', 'Revisió del codi')}
        </Typography>
        {review ? (
          <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.08), border: `1px solid ${theme.palette.primary.main}` }}>
            <MarkdownContent fontSize="0.85rem">{review}</MarkdownContent>
            <Button variant="outlined" size="small" onClick={() => setReview(null)} sx={{ mt: 1.5 }}>{t('lesson.close', 'Tanca')}</Button>
          </Box>
        ) : (
          <Button variant="outlined" onClick={fetchAiReview} disabled={loadingReview} sx={{ textTransform: 'none' }}>
            {loadingReview ? <CircularProgress size={18} color="inherit" /> : t('lesson.review_request', 'Revisió IA de la teva solució acceptada')}
          </Button>
        )}
      </Box>
      */}
    </Box>
  );
}

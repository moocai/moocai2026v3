import { useState } from 'react';
import { Box, Button, Typography, CircularProgress, alpha, useTheme } from '@mui/material';
import { api } from '../../services/api';

export function AiHelpPanel({ courseId, topicSlug, lessonId }: { courseId: string; topicSlug: string; lessonId: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const fetchAiReview = async () => {
    if (!courseId || !lessonId || !topicSlug) {
      setFeedback("No s'ha trobat el tema d'aquest exercici, així que no es pot demanar la revisió.");
      return;
    }
    setLoading(true);
    try {
      // Client compartit (porta el token) i slug real del tema: abans era un
      // `fetch` sense autenticació i el tema estava fixat a "general".
      const { data } = await api.get(`/courses/${courseId}/topics/${topicSlug}/problems/${lessonId}/submissions/review/`);
      setFeedback(data?.review_text || data?.detail || 'Revisió completada.');
    } catch (err: any) {
      // L'API explica per què no hi ha revisió (`detail`): es mostra aquest text
      // en lloc d'un error genèric de connexió.
      setFeedback(err?.response?.data?.detail || "No s'ha pogut obtenir la revisió. Comprova la connexió.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      {!feedback && (
        <Button variant="contained" onClick={fetchAiReview} disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : '💡 Obtenir revisió IA'}
        </Button>
      )}

      {feedback && (
        <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.08), border: `1px solid ${theme.palette.primary.main}` }}>
          <Typography sx={{ fontSize: '0.85rem', mb: 2 }}>{feedback}</Typography>
          <Button variant="outlined" size="small" onClick={() => setFeedback(null)}>
            Tancar
          </Button>
        </Box>
      )}
    </Box>
  );
}

import { useState } from 'react';
import axios from 'axios';
import { Box, Button, Typography, CircularProgress, alpha, useTheme } from '@mui/material';
import { apiClient } from '../../services/httpClient';

export function AiHelpPanel({ courseId, topicSlug, lessonId }: { courseId: string, topicSlug?: string, lessonId: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const fetchAiReview = async () => {
    setLoading(true);
    try {
      if (!topicSlug) throw new Error('Topic not found');
      // Abans: `fetch` sense token (401) i el tema fixat a "general" (404).
      const { data } = await apiClient.get(
        `/courses/${courseId}/topics/${topicSlug}/problems/${lessonId}/submissions/review/`
      );
      setFeedback(data?.review_text || "Revisió completada.");
    } catch (err) {
      // El backend explica per què no hi ha revisió (p. ex. encara no hi ha cap
      // solució acceptada, o la revisió no està llesta): es mostra tal qual.
      const detail = axios.isAxiosError(err) ? (err.response?.data as { detail?: string } | undefined)?.detail : undefined;
      setFeedback(detail || "No s'ha pogut obtenir la revisió. Comprova la connexió.");
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
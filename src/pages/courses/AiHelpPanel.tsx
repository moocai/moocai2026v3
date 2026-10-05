import { useState } from 'react';
import { Box, Button, Typography, CircularProgress, alpha, useTheme } from '@mui/material';

export function AiHelpPanel({ courseId, lessonId }: { courseId: string, lessonId: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const fetchAiReview = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/courses/${courseId}/topics/general/problems/${lessonId}/submissions/review/`);
      
      if (!response.ok) throw new Error('Error al servidor');
      
      const data = await response.json();
      // Canvia 'data.review' pel nom de la propietat que et retorni el teu backend
      setFeedback(data.review || data.feedback || "Revisió completada.");
    } catch (err) {
      setFeedback("No s'ha pogut obtenir la revisió. Comprova la connexió.");
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
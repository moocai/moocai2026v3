import { useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { apiErrorMessages } from '../../services/httpClient';

export default function InviteStudents() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await api.inviteUser(email);
      setSuccess(`Invitación enviada a ${email}`);
      setEmail('');
    } catch (err: any) {
      const errorMessage = apiErrorMessages(err).join('. ') || err.message || 'Error al enviar la invitación';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>
        {t('teacher.invitarAlumnos')}
      </Typography>
      <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ maxWidth: 500 }}>
        <TextField 
          label="Email" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          fullWidth 
          disabled={loading}
        />
        <Button 
          type="submit" 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Enviando...' : t('teacher.invitarAlumnos')}
        </Button>
        {success && <Alert severity="success">{success}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Box>
  );
}
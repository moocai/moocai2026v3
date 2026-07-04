import { useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function InviteStudents() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSuccess(true);
    setEmail('');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>{t('teacher.invitarAlumnos')}</Typography>
      <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ maxWidth: 500 }}>
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
        <Button type="submit" variant="contained">{t('teacher.invitarAlumnos')}</Button>
        {success && <Alert severity="success">Invitación enviada a {email}</Alert>}
      </Stack>
    </Box>
  );
}
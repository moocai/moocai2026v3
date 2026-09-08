import {motion} from 'framer-motion';
import {Typography, Card, TextField, Button, Stack, CircularProgress, useTheme} from '@mui/material';
import {Lock, User} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {type FormEvent} from 'react';

interface LoginProps {
  username: string;
  onUsernameChange: (username: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: FormEvent) => void;
  error?: boolean;
  loading?: boolean;
}

export function Login({
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  onSubmit,
  error,
  loading,
}: LoginProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{t('dashboard.title')}</Typography>
      </Stack>

      <Card
        component="form"
        onSubmit={onSubmit}
        sx={{
          width: { xs: '100%', sm: 380 },
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '2px solid',
          borderColor: error ? 'error.main' : (theme.palette.mode === 'dark' ? '#fff' : '#000'),
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant="h6" sx={{ fontWeight: 800, textAlign: 'center' }}>
            {t('auth.login')}
          </Typography>

          <TextField
            fullWidth
            label="Username"
            variant="filled"
            value={username}
            onChange={e => onUsernameChange(e.target.value)}
            required
            autoComplete="username"
            slotProps={{ input: { startAdornment: <User size={18} style={{ marginRight: 8 }} /> } }}
            sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover', borderRadius: '12px' } }}
          />

          <TextField
            fullWidth
            label="Password"
            variant="filled"
            type="password"
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
            required
            autoComplete="current-password"
            slotProps={{ input: { startAdornment: <Lock size={18} style={{ marginRight: 8 }} /> } }}
            sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover', borderRadius: '12px' } }}
          />

          {error && (
            <Typography variant="body2" color="error" sx={{ textAlign: 'center', fontWeight: 600 }}>
              {t('notifications.incorrect_pin')}
            </Typography>
          )}

          <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
            {loading && <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />}
            {t('auth.login')}
          </Button>
        </Stack>
      </Card>
    </motion.div>
  );
}

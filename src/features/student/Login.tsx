import {motion} from 'framer-motion';
import {Typography, Card, TextField, Button, Stack, CircularProgress, useTheme, Avatar, Box, Grid, FormControl, InputLabel, Select, MenuItem} from '@mui/material';
import {Lock, User, Mail, UserRound, Camera, ArrowLeft, Upload, Check} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {type ChangeEvent, type FormEvent, useState} from 'react';
import {authService} from '../../services/authService';

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
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [nom, setNom] = useState('');
  const [cognoms, setCognoms] = useState('');
  const [email, setEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [org, setOrg] = useState('CIFO BCN La Violeta');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const fieldSx = { '& .MuiInputBase-root': { bgcolor: 'action.hover', borderRadius: '12px' } };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setAvatar(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    if (regPassword !== regConfirm) {
      setRegisterError('Les contrasenyes no coincideixen');
      return;
    }
    setRegisterLoading(true);
    try {
      await authService.login(regUsername, regPassword);
      setRegistered(true);
    } catch {
      setRegisterError('No s\'ha pogut crear el compte. Revisa les dades.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const goBackToLogin = () => {
    setView('login');
    setRegistered(false);
    setRegisterError(null);
    setForgotSent(false);
    setForgotEmail('');
  };

  const handleForgot = (e: FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
  };

  const cardSx = {
    width: { xs: '100%', sm: 380 },
    p: { xs: 3, md: 4 },
    borderRadius: 3,
    bgcolor: 'background.paper',
    border: '2px solid',
    borderColor: error ? 'error.main' : (theme.palette.mode === 'dark' ? '#fff' : '#000'),
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >

      {registered ? (
        <Card sx={cardSx}>
          <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'success.main', width: 64, height: 64 }}>
              <Check size={32} />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Compte creat correctament
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Benvingut/da, {nom} {cognoms}! Ja pots iniciar sessió amb el teu usuari.
            </Typography>
            <Button variant="contained" fullWidth onClick={goBackToLogin} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
              Tornar a iniciar sessió
            </Button>
          </Stack>
        </Card>
      ) : view === 'login' ? (
        <Card
          component="form"
          onSubmit={onSubmit}
          sx={cardSx}
        >
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 800, textAlign: 'center' }}>
              {t('auth.login')}
            </Typography>

            <TextField
              fullWidth
              label="Username or email"
              variant="filled"
              value={username}
              onChange={e => onUsernameChange(e.target.value)}
              required
              autoComplete="username"
              slotProps={{ input: { startAdornment: <User size={18} style={{ marginRight: 8 }} /> } }}
              sx={fieldSx}
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
              sx={fieldSx}
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

          <Stack spacing={0.5} sx={{ mt: 2.5 }}>
            <Button
              color="primary"
              onClick={() => setView('forgot')}
              sx={{ fontWeight: 600 }}
            >
              Has oblidat la contrasenya?
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => setView('register')}
              sx={{ borderRadius: '12px', py: 1.2, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
            >
              Crear un Compte
            </Button>
          </Stack>
        </Card>
      ) : view === 'forgot' ? (
        <Card component="form" onSubmit={handleForgot} sx={cardSx}>
          <Stack spacing={2.5}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Button
                size="small"
                startIcon={<ArrowLeft size={18} />}
                onClick={goBackToLogin}
                sx={{ fontWeight: 700, color: '#ffffff' }}
              >
              </Button>
              <Typography variant="h6" sx={{ fontWeight: 800, textAlign: 'center' }}>
                Has oblidat la contrasenya?
              </Typography>
            </Stack>

            {forgotSent ? (
              <>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  Si existeix un compte amb aquesta adreça, rebràs un correu amb instruccions per establir-ne una de nova.
                </Typography>
                <Button variant="contained" fullWidth onClick={goBackToLogin} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                  Tornar a iniciar sessió
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Introdueix la teva adreça de correu electrònic i t'enviarem instruccions per establir-ne una de nova.
                </Typography>

                <TextField
                  fullWidth
                  label="Adreça de correu electrònic"
                  variant="filled"
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  slotProps={{ input: { startAdornment: <Mail size={18} style={{ marginRight: 8 }} /> } }}
                  sx={fieldSx}
                />

                <Button type="submit" variant="contained" fullWidth sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                  Envia l'enllaç de restabliment
                </Button>
              </>
            )}
          </Stack>
        </Card>
      ) : (
        <Card
          component="form"
          onSubmit={handleRegister}
          sx={{ ...cardSx, width: { xs: '100%', sm: 640 }, maxHeight: { xs: 'calc(100vh - 170px)', md: '78vh' }, overflowY: 'auto' }}
        >
          <Stack spacing={2.5}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Button
                size="small"
                startIcon={<ArrowLeft size={18} />}
                onClick={goBackToLogin}
                sx={{ fontWeight: 700, color: '#ffffff' }}
              >
                Iniciar sessió
              </Button>
              <Typography variant="h6" sx={{ fontWeight: 800, textAlign: 'center' }}>
                Crear un Compte
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={avatarPreview ?? undefined} sx={{ width: 64, height: 64, border: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    {!avatarPreview && <Camera size={24} />}
                  </Avatar>
                  <Stack spacing={0.5}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Upload size={18} />}
                      sx={{ borderRadius: '12px', fontWeight: 700 }}
                    >
                      Tria fitxer
                      <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {avatar ? avatar.name : 'Penja la foto del teu avatar'}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Nom"
                  variant="filled"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  required
                  slotProps={{ input: { startAdornment: <UserRound size={18} style={{ marginRight: 8 }} /> } }}
                  sx={fieldSx}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Cognoms"
                  variant="filled"
                  value={cognoms}
                  onChange={e => setCognoms(e.target.value)}
                  required
                  slotProps={{ input: { startAdornment: <UserRound size={18} style={{ marginRight: 8 }} /> } }}
                  sx={fieldSx}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  variant="filled"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  slotProps={{ input: { startAdornment: <Mail size={18} style={{ marginRight: 8 }} /> } }}
                  sx={fieldSx}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Nom d'usuari"
                  variant="filled"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  required
                  autoComplete="username"
                  slotProps={{ input: { startAdornment: <User size={18} style={{ marginRight: 8 }} /> } }}
                  sx={fieldSx}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth variant="filled" required sx={fieldSx}>
                  <InputLabel>Organització</InputLabel>
                  <Select
                    value={org}
                    onChange={e => setOrg(e.target.value)}
                    label="Organització"
                  >
                    <MenuItem value="CIFO BCN La Violeta">CIFO BCN La Violeta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Contrasenya"
                  variant="filled"
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  slotProps={{ input: { startAdornment: <Lock size={18} style={{ marginRight: 8 }} /> } }}
                  sx={fieldSx}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Confirma Contrasenya"
                  variant="filled"
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  slotProps={{ input: { startAdornment: <Lock size={18} style={{ marginRight: 8 }} /> } }}
                  sx={fieldSx}
                />
              </Grid>

              {registerError && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="error" sx={{ textAlign: 'center', fontWeight: 600 }}>
                    {registerError}
                  </Typography>
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Button type="submit" variant="contained" color="success" fullWidth disabled={registerLoading} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                  {registerLoading && <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />}
                  Crear
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </Card>
      )}
    </motion.div>
  );
}
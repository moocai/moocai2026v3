import {motion} from 'framer-motion';
import {Typography, Card, TextField, Button, Stack, CircularProgress, useTheme, Avatar, Box, Grid, FormControl, InputLabel, Select, MenuItem} from '@mui/material';
import {Lock, User, Mail, UserRound, Camera, ArrowLeft, Upload, Check} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {type ChangeEvent, type FormEvent, useEffect, useState} from 'react';
import {type Organization, extractRegisterErrors, loadRegistrationData, registerUser} from '../../services/register';

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
  const [org, setOrg] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [defaultAvatar, setDefaultAvatar] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Les dades del registre (organitzacions, avatar per defecte) només es demanen
  // quan s'obre el formulari de registre, no en carregar la pantalla de login.
  const [registrationLoaded, setRegistrationLoaded] = useState(false);
  useEffect(() => {
    if (view !== 'register' || registrationLoaded) return;
    let cancelled = false;
    loadRegistrationData()
      .then(data => {
        if (cancelled) return;
        setRegistrationLoaded(true);
        setOrgs(data.organizations ?? []);
        setDefaultAvatar(data.default_avatar ?? '');
        if (data.default_organization_id) {
          setOrg(String(data.default_organization_id));
        }
      })
      .catch(() => {
        if (!cancelled) setOrgs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [view, registrationLoaded]);

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
      setRegisterError(t('auth.passwords_mismatch'));
      return;
    }
    setRegisterLoading(true);
    try {
      await registerUser({
        first_name: nom,
        last_name: cognoms,
        email,
        username: regUsername,
        password1: regPassword,
        password2: regConfirm,
        organization: org !== '' ? Number(org) : undefined,
        default_avatar: avatar ? undefined : defaultAvatar || undefined,
        avatar,
      });
      setRegistered(true);
    } catch (err) {
      setRegisterError(extractRegisterErrors(err));
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
              {t('auth.register_success_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth.register_success_text', { name: `${nom} ${cognoms}`.trim() })}
            </Typography>
            <Button variant="contained" fullWidth onClick={goBackToLogin} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
              {t('auth.back_to_login')}
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
              label={t('auth.username_or_email')}
              variant="filled"
              value={username}
              onChange={e => onUsernameChange(e.target.value)}
              required
              autoComplete="username"
              slotProps={{ input: { startAdornment: <User size={18} style={{ marginRight: 8,marginTop:15}} /> } }}
              sx={{
                ...fieldSx,
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: 'white !important',
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              }}
            />

            <TextField
              fullWidth
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={e => onPasswordChange(e.target.value)}
              required
              autoComplete="current-password"
              slotProps={{ input: { startAdornment: <Lock size={18} style={{ marginRight: 8}} /> } }}
             sx={{
                ...fieldSx,
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: 'white !important',
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              }}
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
              {t('auth.forgot_password')}
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => setView('register')}
              sx={{ borderRadius: '12px', py: 1.2, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
            >
              {t('auth.create_account')}
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
                {t('auth.forgot_password')}
              </Typography>
            </Stack>

            {forgotSent ? (
              <>
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  {t('auth.forgot_sent')}
                </Typography>
                <Button variant="contained" fullWidth onClick={goBackToLogin} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                  {t('auth.back_to_login')}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('auth.forgot_intro')}
                </Typography>

                <TextField
                  fullWidth
                  label={t('auth.email_address')}
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
                  {t('auth.send_reset_link')}
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
                {t('auth.login_link')}
              </Button>
              <Typography variant="h6" sx={{ fontWeight: 800, textAlign: 'center' }}>
                {t('auth.create_account')}
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
                      {t('auth.choose_file')}
                      <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {avatar ? avatar.name : t('auth.avatar_hint')}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('auth.first_name')}
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
                  label={t('auth.last_name')}
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
                  label={t('auth.email')}
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
                  label={t('auth.username')}
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
                <FormControl fullWidth variant="filled" sx={fieldSx}>
                  <InputLabel>{t('auth.organization')}</InputLabel>
                  <Select
                    value={org}
                    onChange={e => setOrg(e.target.value as string)}
                    label={t('auth.organization')}
                  >
                    <MenuItem value="">{t('auth.no_organization')}</MenuItem>
                    {orgs.map(o => (
                      <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('auth.password')}
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
                  label={t('auth.confirm_password')}
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
                  {t('auth.register_submit')}
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </Card>
      )}
    </motion.div>
  );
}
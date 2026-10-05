import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, Stack, Typography, Button, TextField, Divider, Avatar, MenuItem,
  CircularProgress, useTheme, alpha,
} from '@mui/material';
import { ArrowLeft, Lock, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '../hooks/useI18n';
import { useThemeMode } from '../hooks/useTheme';
import { useNotifications } from '../contexts/NotificationContext';
import ParticlesBackground from '../components/ParticlesBackground';
import {
  updateProfile, extractProfileErrors, fetchOrganizations, updateMyAvatar, fetchProfile,
  type Organization, type ProfileUser,
} from '../services/profileService';
import { invalidateImage, myAvatarUrl, preloadImage } from '../utils/avatarCache';

const languages = [
  { code: 'en', labelKey: 'profile.lang_english' },
  { code: 'ca', labelKey: 'profile.lang_catalan' },
  { code: 'es', labelKey: 'profile.lang_spanish' },
];

const fieldBase = { bgcolor: 'action.hover', borderRadius: '10px' };

const BORDER = '#000';

const sectionSx = {
  fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' as const,
  letterSpacing: '0.12em', color: 'text.primary', mb: 2,
};

const labelSx = { fontSize: '0.82rem', fontWeight: 600, color: 'text.secondary', mb: 1.25 };

const cardBase = { p: { xs: 2, md: 2.5 }, borderRadius: '12px', border: '1px solid', boxShadow: 'none' };

const LAYOUT = {
  preferences:   { col: '1 / span 13', row: 1 },
  organizations: { col: '14 / span 10', row: 1 },
  account:       { col: '1 / span 16', row: 2, align: 'start' as const },
  avatar:        { col: '17 / span 8', row: 2, max: 367, align: 'start' as const },
} as const;

function FlagIcon({ code, size = 20 }: { code: string; size?: number }) {
  const sx = {
    width: size, height: Math.round((size * 16) / 24), borderRadius: '3px',
    flexShrink: 0, display: 'block', overflow: 'hidden',
  };

  if (code === 'ca') {
    return (
      <Box component="svg" viewBox="0 0 24 16" sx={sx} aria-hidden>
        <rect width="24" height="16" fill="#FCDD09" />
        <rect x="0" y="0" width="4" height="16" fill="#DA121A" />
        <rect x="6.67" y="0" width="4" height="16" fill="#DA121A" />
        <rect x="13.33" y="0" width="4" height="16" fill="#DA121A" />
        <rect x="20" y="0" width="4" height="16" fill="#DA121A" />
      </Box>
    );
  }

  if (code === 'es') {
    return (
      <Box component="svg" viewBox="0 0 24 16" sx={sx} aria-hidden>
        <rect width="24" height="16" fill="#AA151B" />
        <rect y="4" width="24" height="8" fill="#F1BF00" />
      </Box>
    );
  }

  return (
    <Box component="svg" viewBox="0 0 24 16" sx={sx} aria-hidden>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0 V16 M0 8 H24" stroke="#fff" strokeWidth="5.3" />
      <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="3.1" />
    </Box>
  );
}

const DEFAULT_ORG: Organization = { id: -1, name: 'CIFO BCN La Violeta', type: 'Centre de formació' };
/** Subtítol de l'organització: el tipus si l'endpoint el retorna, sinó el de la demo. */
function orgSubtitle(org: Organization) {
  return org.type ?? org.subtitle ?? null;
}

function readStoredProfile() {
  try {
    const raw = localStorage.getItem('currentStudent');
    if (!raw) return { firstName: '', lastName: '', name: '', email: '', username: '' };
    const student = JSON.parse(raw) as {
      name?: string; email?: string; username?: string; first_name?: string; last_name?: string;
    };
    const parts = (student.name || '').trim().split(/\s+/);
    const email = student.email ?? '';
    return {
      firstName: student.first_name ?? parts[0] ?? '',
      lastName: student.last_name ?? parts.slice(1).join(' '),
      name: student.name ?? '',
      email,
      username: student.username ?? email.split('@')[0] ?? '',
    };
  } catch {
    return { firstName: '', lastName: '', name: '', email: '', username: '' };
  }
}

/**
 * Copia els camps que retorna `GET /users/me/settings/` dins de
 * `currentStudent` perquè el Header i el dashboard no es quedin amb la
 * informació parcial del login.
 */
function mirrorProfileToStorage(data: ProfileUser) {
  try {
    const raw = localStorage.getItem('currentStudent');
    if (!raw) return;
    const student = JSON.parse(raw);
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
    localStorage.setItem('currentStudent', JSON.stringify({
      ...student,
      first_name: data.first_name ?? student.first_name,
      last_name: data.last_name ?? student.last_name,
      username: data.username ?? student.username,
      email: data.email ?? student.email,
      name: student.name || name,
    }));
    window.dispatchEvent(new Event('auth-state-change'));
  } catch { /* mode privat */ }
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isFancy = mode === 'fancy';
  const isLight = mode === 'light';
  const cardSx = {
    ...cardBase,
    bgcolor: isFancy ? 'rgba(20,20,20,0.72)' : 'background.paper',
    borderColor: isFancy ? alpha(theme.palette.primary.main, 0.28) : isLight ? BORDER : 'divider',
    ...(isFancy && { backdropFilter: 'blur(10px)' }),
  };
  const labelColor = isLight ? '#000' : '#fff';
  const fieldSx = {
    // El <label> és germà de l'InputBase al DOM, per això va a nivell del TextField.
    '& .MuiInputLabel-root': { color: labelColor, fontSize: '1rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: labelColor, fontSize: '1rem' },
    // `&&` puja l'especificitat per sobre de les regles de FilledInput
    // (`:hover:not(.Mui-disabled,.Mui-error)::before` = 0,4,1), que si no guanyen.
    '&& .MuiInputBase-root': {
      ...fieldBase,
      // En light tornem el contorn negre (laterals i superior) però sense traç inferior.
      ...(isLight && { border: `1px solid ${BORDER}`, borderBottom: 'none' }),
      '&:hover': { bgcolor: 'action.selected' },
      // Elimina la línia del notched outline en TOTS els estats (normal, hover i focus).
      // Els efectes propis del TextField (fons, color del label, animació) es mantenen.
      '&.MuiInputBase-root::before, &.MuiInputBase-root::after': { borderBottom: 'none' },
      '&.MuiInputBase-root:hover::before, &.MuiInputBase-root:hover::after': { borderBottom: 'none' },
      '&.MuiInputBase-root.Mui-focused::before, &.MuiInputBase-root.Mui-focused::after': { borderBottom: 'none' },
    },
  };
  const dividerSx = isLight ? { borderColor: BORDER } : undefined;
  /** Variant per a camps de només lectura: sense gris ni opacitat de `disabled`. */
  const readonlyFieldSx = {
    ...fieldSx,
    '&& .MuiInputBase-root': {
      ...fieldSx['&& .MuiInputBase-root'],
      '&.Mui-disabled': {
        bgcolor: fieldBase.bgcolor,
        color: 'text.primary',
        WebkitTextFillColor: 'currentColor',
        opacity: 1,
      },
      '&.Mui-disabled:hover': { bgcolor: fieldBase.bgcolor },
    },
  };
  /** Converteix una entrada de LAYOUT en el `sx` d'una Card. */
  const cardAt = (entry: { col: string; row: number; max?: number; align?: 'start' | 'center' | 'end' | 'stretch' }) => ({
    ...cardSx,
    gridColumn: { md: entry.col },
    gridRow: { md: entry.row },
    alignSelf: { md: entry.align ?? 'stretch' },
    ...(entry.max ? { maxWidth: { md: entry.max } } : {}),
  });
  const { addNotification } = useNotifications();
  const { language, setLanguage } = useI18n();
  const currentLang = (language?.split('-')[0] || 'ca') as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stored = readStoredProfile();
  const [firstName, setFirstName] = useState(stored.firstName);
  const [lastName, setLastName] = useState(stored.lastName);
  const [email, setEmail] = useState(stored.email);
  /** Només de lectura: el backend el torna al GET, no s'accepta al PATCH. */
  const [username, setUsername] = useState(stored.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<number | string>(DEFAULT_ORG.id);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarName, setAvatarName] = useState('');

  useEffect(() => {
    let active = true;
    fetchOrganizations()
      .then((orgs) => {
        if (!active) return;
        setOrganizations(orgs);
        // Per defecte: CIFO BCN La Violeta si l'endpoint la retorna, sinó la primera.
        if (orgs.length) {
          const preferred = orgs.find((o) => /violeta/i.test(o.name)) ?? orgs[0];
          setOrgId(preferred.id);
        }
      })
      .catch(() => { /* el backend pot no exposar orgs, es manté la demo */ });

    // L'`avatar_url` del perfil no es pot carregar des d'aquesta app (la imatge
    // sortia trencada). `GET /users/me/avatar/` retorna la imatge (binària, no
    // JSON), així que es carrega com a blob amb la memòria cau compartida amb el header.
    const loadAvatar = async () => {
      const url = await preloadImage(myAvatarUrl());
      if (active && url) setAvatarUrl(url);
    };

    // El backend és la font de veritat dels camps; `localStorage` queda de
    // fallback perquè el formuli no quedi bui si el GET falla.
    fetchProfile()
      .then((data) => {
        if (!active) return;
        if (data.first_name) setFirstName(data.first_name);
        if (data.last_name) setLastName(data.last_name);
        if (data.email) setEmail(data.email);
        if (data.username) setUsername(data.username);
        mirrorProfileToStorage(data);
        return loadAvatar();
      })
      .catch(() => { if (active) return loadAvatar(); });

    return () => { active = false; };
  }, []);

  const orgList = organizations.length ? organizations : [DEFAULT_ORG];
  const selectedOrg = orgList.find((o) => String(o.id) === String(orgId)) ?? orgList[0];

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarName(file.name);
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (newPassword1 || newPassword2) {
      if (!currentPassword) {
        setFormError(t('profile.current_password_required'));
        return;
      }
      if (newPassword1 !== newPassword2) {
        setFormError(t('profile.passwords_mismatch'));
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        current_password: currentPassword || null,
        new_password1: newPassword1 || null,
        new_password2: newPassword2 || null,
      });

      if (avatarFile) {
        try {
          // La previsualització ja mostra el fitxer triat; el backend respon 204.
          await updateMyAvatar(avatarFile);
          // La memòria cau d'avatars ja té la imatge antiga: la netegem.
          invalidateImage();
          window.dispatchEvent(new Event('avatarUpdated'));
        } catch (err) {
          addNotification(extractProfileErrors(err), 'error');
        }
      }

      try {
        const raw = localStorage.getItem('currentStudent');
        const student = raw ? JSON.parse(raw) : {};
        const nextFirst = updated.first_name ?? firstName.trim();
        const nextLast = updated.last_name ?? lastName.trim();
        localStorage.setItem('currentStudent', JSON.stringify({
          ...student,
          first_name: nextFirst,
          last_name: nextLast,
          name: updated.name ?? (`${nextFirst} ${nextLast}`.trim() || student.name),
          email: updated.email ?? email.trim(),
        }));
        window.dispatchEvent(new Event('auth-state-change'));
      } catch { /* el backend ja ha desat el canvi, ignorem el mirror local */ }

      setCurrentPassword('');
      setNewPassword1('');
      setNewPassword2('');
      setAvatarFile(null);
      setAvatarName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      addNotification(t('profile.saved'), 'success');
    } catch (err) {
      setFormError(extractProfileErrors(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', overflowY: { xs: 'auto', md: 'hidden' }, display: 'flex', flexDirection: 'column', bgcolor: isFancy ? 'transparent' : 'background.default', color: 'text.primary', px: { xs: 2, md: 4 }, py: { xs: 2, md: 2.5 } }}>
      {isFancy && <ParticlesBackground opacityMultiplier={0.4} />}
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 1300, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2, flex: { xs: '0 0 auto', md: '1 1 auto' }, minHeight: 0, marginTop:5}}>
        {/* Capçalera */}
        <Box sx={{ flexShrink: 0 }}>
          <Button
            onClick={() => navigate(-1)}
            startIcon={<ArrowLeft size={16} />}
            sx={{ p: 0, minWidth: 0, color: 'text.secondary', fontWeight: 600, fontSize: '0.85rem', '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
          >
            {t('profile.back', 'Torna al curs')}
          </Button>
          <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 900, letterSpacing: '-0.02em' }}>
            {t('profile.settings_title', "Configuració d'usuari")}
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(24, 1fr)' }, gridTemplateRows: { md: 'auto 1fr auto' }, gap: 2, flex: { xs: '0 0 auto', md: '1 1 auto' }, minHeight: 0 }}
        >
          {/* 1. Preferències */}
          <Card sx={cardAt(LAYOUT.preferences)}>
            <Typography sx={sectionSx}>{t('profile.preferences', 'Preferències')}</Typography>
            <Typography sx={labelSx}>{t('profile.language', 'Idioma')}</Typography>
            <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              {languages.map((lang) => {
                const active = currentLang === lang.code;
                return (
                  <Button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    aria-pressed={active}
                    startIcon={<FlagIcon code={lang.code} />}
                    sx={{
                      border: '1px solid',
                      borderColor: isLight ? BORDER : active ? 'primary.main' : 'divider',
                      bgcolor: active ? 'primary.main' : 'transparent',
                      color: active ? '#fff' : 'text.primary',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      px: 5.5, py: 0.75,
                      borderRadius: '999px',
                      '&:hover': { bgcolor: active ? 'primary.main' : 'action.hover', borderColor: 'primary.main' },
                    }}
                  >
                    {t(lang.labelKey)}
                  </Button>
                );
              })}
            </Stack>
          </Card>

          {/* 2. Organitzacions */}
          <Card sx={cardAt(LAYOUT.organizations)}>
            <Typography sx={sectionSx}>{t('profile.organizations', 'Organitzacions')}</Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <TextField
                select
                fullWidth
                size="small"
                variant="filled"
                value={String(orgId)}
                onChange={(e) => setOrgId(e.target.value)}
                sx={fieldSx}
                slotProps={{
                  select: {
                    renderValue: () => {
                      const sub = orgSubtitle(selectedOrg);
                      return (
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight:1.5, marginTop: -2}} noWrap>{selectedOrg.name}</Typography>
                          {sub && <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 }} noWrap>{sub}</Typography>}
                        </Box>
                      );
                    },
                  },
                }}
              >
                {orgList.map((org) => {
                  const sub = orgSubtitle(org);
                  return (
                    <MenuItem key={org.id} value={String(org.id)} sx={{ py: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }} noWrap>{org.name}</Typography>
                        {sub && <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }} noWrap>{sub}</Typography>}
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
              <Box sx={{ flexShrink: 0, px: 1.4, borderRadius: '999px', bgcolor: 'primary.main' }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.68rem', lineHeight: 2 }}>
                  {t('profile.member', 'Membre')}
                </Typography>
              </Box>
            </Stack>
          </Card>

          {/* 3. Detalls del compte */}
          <Card sx={cardAt(LAYOUT.account)}>
            <Typography sx={{ ...sectionSx, mb: 2}}>{t('profile.account_details', "Detalls del compte")}</Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                label={t('profile.username', "Nom d'usuari")}
                variant="filled"
                value={username}
                disabled
                slotProps={{
                  input: {
                    readOnly: true,
                    startAdornment: <UserRound size={16} style={{ marginRight: 10, marginTop: 15 }} />,
                    endAdornment: <Lock size={16} style={{ marginRight: 10, marginTop: 5 }} />,
                  },
                }}
                sx={readonlyFieldSx}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('profile.first_name', 'Nom')}
                  variant="filled"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  sx={fieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label={t('profile.last_name', 'Cognoms')}
                  variant="filled"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  sx={fieldSx}
                />
              </Stack>
              <TextField
                fullWidth
                size="small"
                label={t('profile.email', 'Correu electrònic')}
                variant="filled"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                sx={fieldSx}
              />

              <Divider sx={{ ...dividerSx, my: 0.5 }} />

              <Box>
                <Typography sx={{ ...sectionSx, mb: 3,mt: 1}}>{t('profile.change_password', 'Canvia la contrasenya')}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('profile.current_password', 'Contrasenya actual')}
                    variant="filled"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    slotProps={{ input: { startAdornment: <Lock size={16} style={{ marginRight: 8, marginTop: 15 }} /> } }}
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label={t('profile.new_password1', 'Contrasenya nova')}
                    variant="filled"
                    type="password"
                    value={newPassword1}
                    onChange={(e) => setNewPassword1(e.target.value)}
                    autoComplete="new-password"
                    slotProps={{ input: { startAdornment: <KeyRound size={16} style={{ marginRight: 8, marginTop: 15 }} /> } }}
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label={t('profile.new_password2', 'Confirma la nova contrasenya')}
                    variant="filled"
                    type="password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    autoComplete="new-password"
                    slotProps={{ input: { startAdornment: <ShieldCheck size={16} style={{ marginRight: 8, marginTop: 15 }} /> } }}
                    sx={fieldSx}
                  />
                </Stack>

                {formError && (
                  <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 600 }}>
                    {formError}
                  </Typography>
                )}

                {/* Desa els canvis */}
                <Box sx={{ mt: 3}}>
                  <Button
                    type="submit"
                    disabled={saving}
                    variant="contained"
                    sx={{ borderRadius: '10px', px: 3.5, py: 1.25, fontWeight: 800, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
                  >
                    {saving && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
                    {t('profile.save', 'Desa els canvis')}
                  </Button>
                </Box>
              </Box>
            </Stack>
          </Card>

          {/* 4. Avatar */}
          <Card sx={cardAt(LAYOUT.avatar)}>
            <Typography sx={sectionSx}>{t('profile.avatar', 'Avatar')}</Typography>
            <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
              <Avatar src={avatarUrl ?? undefined} sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontWeight: 900, fontSize: '2rem' }}>
                {(firstName || stored.name || '?').charAt(0)}
              </Avatar>
              <Box sx={{ minWidth: 0, width: '100%' }}>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ borderColor: 'primary.main', color: 'primary.main', fontWeight: 900, borderRadius: '10px', '&:hover': { borderColor: 'primary.main' }, fontSize: '0.85rem' }}
                >
                  {t('profile.choose_file', 'Tria un fitxer')}
                </Button>
                <Typography sx={{ mt: 1, fontSize: '0.8rem', color: 'text.secondary' }} noWrap>
                  {avatarName || t('profile.no_file_selected', 'Cap fitxer triat')}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

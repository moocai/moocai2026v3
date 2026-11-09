import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, IconButton, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { preloadImage, myAvatarUrl } from '../utils/avatarCache';

interface Props {
  studentName: string;
}

export function UserAvatarMenu({ studentName }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  // Comparteix la memòria cau amb el dashboard: si allà ja s'ha carregat
  // la mateixa imatge, aquí surt a l'instant sense cap petició.
  const loadAvatar = useCallback(async () => {
    const url = await preloadImage(myAvatarUrl() ?? undefined);
    setAvatarSrc(url);
  }, []);

  useEffect(() => {
    loadAvatar();

    const onCourseChange = () => loadAvatar();
    window.addEventListener('auth-state-change', loadAvatar);
    window.addEventListener('avatarUpdated', onCourseChange);
    window.addEventListener('storage', onCourseChange);
    const onVisibility = () => { if (document.visibilityState === 'visible') loadAvatar(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('auth-state-change', loadAvatar);
      window.removeEventListener('avatarUpdated', onCourseChange);
      window.removeEventListener('storage', onCourseChange);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadAvatar]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <IconButton
        onClick={() => navigate('/profile')}
        aria-label={`${t('profile.title')}: ${studentName}`}
        title={t('profile.title')}
        sx={{ p: 0, '&:hover': { bgcolor: 'transparent' } }}
      >
        <Avatar
          src={avatarSrc || undefined}
          alt={studentName}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 900,
            fontSize: '1rem',
            width: 40,
            height: 40,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'divider',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          {!avatarSrc && studentName.charAt(0)}
        </Avatar>
      </IconButton>
    </Box>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, useTheme } from '@mui/material';
import { preloadImage, userAvatarUrl } from '../utils/avatarCache';

interface Props {
  studentName: string;
}

/** Mateixa clau que fa servir StudentDashboard per recordar l'últim curs. */
const LAST_COURSE_KEY = 'mooc_dashboard_last_course';

function readCurrentCourseSlug(): string | undefined {
  try {
    const raw = localStorage.getItem(LAST_COURSE_KEY);
    const slug = raw ? JSON.parse(raw)?.slug : undefined;
    return slug ? String(slug) : undefined;
  } catch {
    return undefined;
  }
}

function readUsername(): string | undefined {
  const saved = localStorage.getItem('currentStudent');
  if (!saved) return undefined;
  try {
    const parsed = JSON.parse(saved);
    const username = parsed.username || parsed.id;
    return username ? String(username) : undefined;
  } catch {
    return undefined;
  }
}

export function UserAvatarMenu({ studentName }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  // Comparteix la memòria cau amb el dashboard: si allà ja s'ha carregat
  // la mateixa imatge, aquí surt a l'instant sense cap petició.
  const loadAvatar = useCallback(async () => {
    const username = readUsername();
    if (!username) {
      setAvatarSrc(null);
      return;
    }
    const url = await preloadImage(userAvatarUrl(username, readCurrentCourseSlug()));
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
      <Avatar
        src={avatarSrc || undefined}
        alt={studentName}
        onClick={() => navigate('/profile')}
        sx={{
          bgcolor: 'primary.main',
          fontWeight: 900,
          fontSize: '1rem',
          width: 40,
          height: 40,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'divider',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        {!avatarSrc && studentName.charAt(0)}
      </Avatar>
    </Box>
  );
}
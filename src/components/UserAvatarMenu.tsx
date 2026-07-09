import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Menu, Box, Typography, Button, Stack,IconButton, useTheme, alpha } from '@mui/material';
import { ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  studentName: string;
}

const languages = [{code: 'ca', label: 'CA'},{code: 'es', label: 'ES'},{code: 'en', label: 'EN'}];

export function UserAvatarMenu({ studentName }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const currentLang = (i18n.language?.split('-')[0] || 'ca') as string;
  const role = (localStorage.getItem('mooc_role') as 'student' | 'teacher') || 'student';

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleRoleChange = (newRole: 'student' | 'teacher') => {
    localStorage.setItem('mooc_role', newRole);
    window.dispatchEvent(new Event('auth-state-change'));
    if (newRole === 'teacher') {
      navigate('/teacher');
    } else {
      navigate('/dashboards/student');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentStudent');
    window.dispatchEvent(new Event('auth-state-change'));
    handleClose();
    navigate('/');
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <Avatar
          sx={{ bgcolor: 'primary.main', fontWeight: 900, fontSize: '1rem', width: 40, height: 40, cursor: 'default', mt:2}}
        >
          {studentName.charAt(0)}
        </Avatar>
        <IconButton onClick={handleOpen} size="small" sx={{ color: 'text.secondary', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: '6px', width: 24, height: 20, mt: -0.5, p: 0, '&:hover': { bgcolor: 'action.selected', color: 'primary.main', borderColor: 'primary.main' } }}>
          <ChevronDown size={16} />
        </IconButton>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        disableScrollLock
        slotProps={{
          paper: {
            sx: {
              mt: 2,
              ml:-2,
              minWidth: 150,
              bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : 'white',
              height: 230,
            },
          },
        }}
      >
        {/* Close button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pt: 0.5 }}>
          <IconButton size="small" onClick={handleClose} sx={{ color: 'error.main' }}>
            <X size={16} />
          </IconButton>
        </Box>

        {/* Language */}
        <Box sx={{ px: 2, mt:-2}}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', mb: 1 }}>
            {t('header.language', 'Idioma:')}
          </Typography>
          <Stack direction="row" sx={{ bgcolor: 'action.hover', borderRadius: '10px', p: 0.2, border: '2px solid #8400ff', justifyContent: 'center', gap: 0.5 }}>
            {languages.map((lang) => (
              <Button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                sx={{
                  minWidth: '36px',
                  px: 1,
                  py: 0.8,
                  lineHeight: 1,
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  borderRadius: '8px',
                  color: currentLang === lang.code ? '#fff' : 'text.secondary',
                  bgcolor: currentLang === lang.code ? 'primary.main' : 'transparent',
                  justifyContent: 'center',
                }}
              >
                {lang.label}
              </Button>
            ))}
          </Stack>
        </Box>

        {/* Role */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', mb: 1 }}>
            {t('header.role', 'Rol:')}
          </Typography>
          <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: '10px', p: 0.2, position: 'relative', width: '100%', height: '32px' }}>
            <Box sx={{ position: 'absolute', top: 2, bottom: 2, left: role === 'student' ? 2 : 'calc(50% + 1px)', width: 'calc(50% - 3px)', bgcolor: 'primary.main', borderRadius: '8px', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
            <Button disableRipple onClick={() => handleRoleChange('student')} sx={{ flex: 1, zIndex: 1, borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'none', color: role === 'student' ? '#fff' : 'text.secondary', minWidth: 0, '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_student')}</Button>
            <Button disableRipple onClick={() => handleRoleChange('teacher')} sx={{ flex: 1, zIndex: 1, borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'none', color: role === 'teacher' ? '#fff' : 'text.secondary', minWidth: 0, '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_teacher')}</Button>
          </Box>
        </Box>

        {/* Logout */}
        <Box sx={{ px: 2, py: 1 }}>
          <Button
            fullWidth
            onClick={handleLogout}
            sx={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'none', color: 'error.main', borderRadius: 1, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}
          >
            {t('auth.logout', 'Tancar sessió')}
          </Button>
        </Box>
      </Menu>
    </>
  );
}

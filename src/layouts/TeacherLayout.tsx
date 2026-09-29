import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, IconButton, Button, Typography, Stack, Avatar, Popover, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
const logo = '/img/logo.webp';
import { Sidebar } from '../features/teacher/Sidebar';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { ChatWidget } from '../features/teacher/ChatWidget';
import { useThemeMode } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';

export function TeacherLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>('teacher');
  const { mode } = useThemeMode();
  const isFancy = mode === 'fancy';
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  const handleRoleChange = (newRole: 'student' | 'teacher') => {
    setRole(newRole);
    localStorage.setItem('mooc_role', newRole);
    window.dispatchEvent(new Event('auth-state-change'));
    if (newRole === 'teacher') {
      navigate('/teacher');
    } else {
      navigate('/dashboards/student');
    }
  };

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 900) setMobileOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isFancy ? 'transparent' : 'background.default' }}>
      {mobileOpen && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 20, display: { md: 'none' } }} onClick={() => setMobileOpen(false)} />
      )}
      <Box sx={{
        width: isCollapsed ? 64 : 256,
        position: { xs: mobileOpen ? 'fixed' : 'static', md: 'static' },
        left: 0, top: 0,
        height: { xs: mobileOpen ? '100vh' : 'auto', md: 'auto' },
        zIndex: 30,
        display: { xs: mobileOpen ? 'block' : isCollapsed ? 'none' : 'block', md: 'block' },
        transition: 'width 0.3s', flexShrink: 0,
      }}>
        <Sidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} onNavigate={() => setMobileOpen(false)} />
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box component="header" sx={{
          height: 64, borderBottom: 1, borderColor: 'divider',
          display: 'flex', alignItems: 'center', px: { xs: 2, md: 3 }, bgcolor: isFancy ? 'rgba(0,0,0,0.8)' : 'background.paper',
          boxShadow: isFancy ? 'none' : '0 1px 40px #8400ff',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 'auto' }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}><MenuIcon /></IconButton>
            <Box component="img" src={logo} alt="" width={438} height={190} sx={{ height: { xs: 22, md: 32 }, width: 'auto' }} />
            <Stack direction="row" sx={{ alignItems: 'baseline' }}>
              <Typography variant="h6" component="span" sx={{ fontWeight: 900, color: 'text.primary' }}>MOOC</Typography>
              <Typography variant="h6" component="span" sx={{ fontWeight: 900, color: 'primary.main', ml: 0.3 }}>2026</Typography>
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeToggleButton />
            <IconButton
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              sx={{
                width: 40, height: 40,
                bgcolor: 'action.hover',
                border: 2,
                borderColor: profileAnchor ? 'primary.main' : 'divider',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            </IconButton>
          </Box>
        </Box>

        <Popover
          open={Boolean(profileAnchor)}
          anchorEl={profileAnchor}
          onClose={() => setProfileAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { borderRadius: 3, p: 2, minWidth: 220, boxShadow: 4 } } }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
                {t('teacher.idioma')}
              </Typography>
              <LanguageSwitcher />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
                {t('teacher.rol')}
              </Typography>
              <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: '8px', p: 0.3, position: 'relative', width: '100%', height: '32px' }}>
                <Box sx={{ position: 'absolute', top: 3, bottom: 3, left: role === 'student' ? 3 : 'calc(50% + 1px)', width: 'calc(50% - 4px)', bgcolor: 'primary.main', borderRadius: '6px', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
                <Button disableRipple onClick={() => handleRoleChange('student')} sx={{ flex: 1, zIndex: 1, borderRadius: '6px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'none', color: role === 'student' ? '#fff' : 'text.secondary', minWidth: 0, '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_student')}</Button>
                <Button disableRipple onClick={() => handleRoleChange('teacher')} sx={{ flex: 1, zIndex: 1, borderRadius: '6px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'none', color: role === 'teacher' ? '#fff' : 'text.secondary', minWidth: 0, '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_teacher')}</Button>
              </Box>
            </Box>
            <Divider />
            <Button
              fullWidth
              startIcon={<LogoutIcon />}
              onClick={() => {
                setProfileAnchor(null);
                localStorage.removeItem('currentStudent');
                localStorage.removeItem('mooc_role');
                navigate('/dashboards/student');
              }}
              sx={{ justifyContent: 'flex-start', fontWeight: 700, color: 'error.main', textTransform: 'none', borderRadius: 2 }}
            >
              {t('teacher.cerrarSesion')}
            </Button>
          </Stack>
        </Popover>

        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
      <ChatWidget />
    </Box>
  );
}
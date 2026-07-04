import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, IconButton, Button, Typography, Stack } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>(() => (localStorage.getItem('mooc_role') as 'student' | 'teacher') || 'student');
  const { mode } = useThemeMode();
  const isFancy = mode === 'fancy';

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
            <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: '8px', p: 0.3, position: 'relative', width: '130px', height: '32px' }}>
              <Box sx={{ position: 'absolute', top: 3, bottom: 3, left: role === 'student' ? 3 : 'calc(50% + 1px)', width: 'calc(50% - 4px)', bgcolor: 'primary.main', borderRadius: '6px', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
              <Button disableRipple onClick={() => handleRoleChange('student')} sx={{ flex: 1, zIndex: 1, borderRadius: '6px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'none', color: role === 'student' ? '#fff' : 'text.secondary', minWidth: 0, '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_student')}</Button>
              <Button disableRipple onClick={() => handleRoleChange('teacher')} sx={{ flex: 1, zIndex: 1, borderRadius: '6px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'none', color: role === 'teacher' ? '#fff' : 'text.secondary', minWidth: 0, '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_teacher')}</Button>
            </Box>
            <LanguageSwitcher />
            <ThemeToggleButton />
          </Box>
        </Box>
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
      <ChatWidget />
    </Box>
  );
}
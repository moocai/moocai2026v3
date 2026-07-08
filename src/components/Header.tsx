import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { AppBar, Toolbar, Box, Typography, Button, IconButton, Stack, Divider, Avatar} from '@mui/material';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';
import { ThemeToggleButton } from './ThemeToggleButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserAvatarMenu } from './UserAvatarMenu';
import { useThemeMode } from '../hooks/useTheme';
const logo = '/img/logo.webp';

export function Header() {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>(() => (localStorage.getItem('mooc_role') as 'student' | 'teacher') || 'student');
  const [studentName, setStudentName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const scrollToDynamic = (desktopPx: number, mobilePx: number) => {
    setMobileOpen(false); 
    const performScroll = () => {
      const isMobile = window.innerWidth < 900;
      const finalPosition = isMobile ? mobilePx : desktopPx;
      window.scrollTo({ top: finalPosition, behavior: 'smooth' });
    };

    if (location.pathname !== '/') {
      navigate('/', { state: { fromNav: true } });
      setTimeout(performScroll, 100);
    } else {
      performScroll();
    }
  };

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

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const currentStudent = localStorage.getItem('currentStudent');
    const savedRole = localStorage.getItem('mooc_role') as 'student' | 'teacher' | null;
    setIsLoggedIn(!!token || !!currentStudent);
    if (currentStudent) {
      try { setStudentName(JSON.parse(currentStudent).name); } catch { setStudentName(''); }
    } else {
      setStudentName('');
    }
    if (savedRole === 'teacher' || savedRole === 'student') {
      setRole(savedRole);
    }
  };

  useEffect(() => {
    checkAuth();

    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    window.addEventListener('storage', checkAuth);
    window.addEventListener('auth-state-change', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-state-change', checkAuth);
      document.body.style.overflow = 'unset';
    };
  }, [location, mobileOpen]);

  const handleLogout = async () => {
    try { await authService.logout(); } 
    catch (e) { console.warn("Logout error", e); } 
    finally {
      localStorage.removeItem('token');
      localStorage.removeItem('currentStudent');
      setIsLoggedIn(false);
      setMobileOpen(false);
      navigate('/');
    }
  };

  const commonButtonStyle = {
    color: 'text.primary',
    fontWeight: 800,
    textTransform: 'none',
    fontSize: '1rem',
    height: 40,
    '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
  };

  return (
    <>
      <AppBar position="sticky" sx={{width: '100%', bgcolor: mode === 'fancy' ? '#000000' : mode === 'dark' ? '#1f2937' : 'white', zIndex: 1400, boxShadow: mode === 'fancy' ? 'none' : '0 1px 40px #8400ff'}}>
        <Toolbar sx={{ px: { xs: 2, md: 8 }, height: '80px', display: 'flex', justifyContent: 'space-between' }}>
          
          {/* LOGO */}
        <Box component={RouterLink} to="/" state={{ fromNav: true }} sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'row' }, alignItems: 'center', gap: { xs: 0.5, md: 1.5 }, textDecoration: 'none' }}>
          <Box component="img" src={logo} alt="Rocket" width={438} height={190} sx={{ height: { xs: 22, md: 50 }, width: 'auto', transform: { xs: 'rotate(-90deg)', md: 'none' }, transition: 'transform 0.5s' }} />
            <Stack direction="row" sx={{ alignItems: 'baseline' }}>
              <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'text.primary'}}>MOOC</Typography>
              <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'primary.main', ml:0.5}}>2026</Typography>
            </Stack>
          </Box>

          {/* DESKTOP NAV (Cursos > Accedir > Language > Theme > Avatar) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
            <Button onClick={() => scrollToDynamic(1000, 1800)} sx={commonButtonStyle}>
              {t('footer.courses')}
            </Button>

            {!isLoggedIn && (
              <Button onClick={() => navigate('/dashboards/student')} sx={commonButtonStyle}>{t('auth.access')}</Button>
            )}

            <ThemeToggleButton />
            {!studentName && <LanguageSwitcher />}
            {studentName && role === 'student' && <UserAvatarMenu studentName={studentName} />}
          </Box>

          {/* MOBILE CONTROLS (Theme + Menu al costat) */}
          <Stack direction="row" spacing={1} sx={{ display: { md: 'none' }, alignItems: 'center' }}>
            <ThemeToggleButton />
            <IconButton sx={{ color: 'text.primary' }} onClick={handleDrawerToggle} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
              {mobileOpen ? <CloseIcon fontSize="large" /> : <MenuIcon fontSize="large" />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {mobileOpen && (
          <Box component={motion.div} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}  sx={{position: 'fixed', top: '80px',left: 0,right: 0,bottom: 0,width: '100vw',height: 'calc(100vh - 80px)',bgcolor: 'background.default', zIndex: 1300, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', pt: 4, pb: 6}}>
            <Stack spacing={4} sx={{ width: '85%', alignItems: 'center' }}>
              
              {/* 1. Usuari loguejat + Rol */}
              <Stack spacing={2} sx={{ width: '100%' }}>
                {isLoggedIn ? (
                  <>
                    <Box onClick={() => { navigate('/dashboards/student'); setMobileOpen(false); }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 900, width: 48, height: 48, fontSize: '1.2rem' }}>{studentName?.charAt(0) || '?'}</Avatar>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>{studentName || t('auth.user')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: '12px', p: 0.5, position: 'relative', width: '100%', height: '44px' }}>
                      <Box sx={{ position: 'absolute', top: 4, bottom: 4, left: role === 'student' ? 4 : 'calc(50% + 2px)', width: 'calc(50% - 6px)', bgcolor: 'primary.main', borderRadius: '10px', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
                      <Button disableRipple onClick={() => { handleRoleChange('student'); setMobileOpen(false); }} sx={{ flex: 1, zIndex: 1, borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', textTransform: 'none', color: role === 'student' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_student')}</Button>
                      <Button disableRipple onClick={() => { handleRoleChange('teacher'); setMobileOpen(false); }} sx={{ flex: 1, zIndex: 1, borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', textTransform: 'none', color: role === 'teacher' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_teacher')}</Button>
                    </Box>
                  </>
                ) : (
                  <Button fullWidth onClick={() => { navigate('/dashboards/student'); setMobileOpen(false); }} sx={{ ...commonButtonStyle, py: 2, fontSize: '1.1rem' }}>{t('auth.access').toUpperCase()}</Button>
                )}
              </Stack>

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 2. Cursos */}
              <Button fullWidth onClick={() => scrollToDynamic(1000, 700)} sx={{ color: 'text.primary', fontWeight: 900, py: 2, fontSize: '1.4rem' }}>
                {t('footer.courses').toUpperCase()}
              </Button>

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 3. Language */}
              <Box sx={{ textAlign: 'center' }}>
                <LanguageSwitcher />
              </Box>

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 4. Sortir */}
              {isLoggedIn && (
                <Button fullWidth color="error" onClick={handleLogout} sx={{ fontWeight: 900, py: 1.5 }}>{t('auth.logout')}</Button>
              )}

            </Stack>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}
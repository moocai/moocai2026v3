import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { GraduationCap } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';
import { AppBar, Toolbar, Box, Typography, Button, IconButton, Stack, useTheme, Divider, alpha} from '@mui/material';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';
import { ThemeToggleButton } from './ThemeToggleButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useThemeMode } from '../hooks/useTheme';
import { CourseViewToggle } from './CourseViewToggle';
const logo = '/img/logo.webp';

export function Header() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
      navigate('/');
      setTimeout(performScroll, 100);
    } else {
      performScroll();
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const currentStudent = localStorage.getItem('currentStudent');
    setIsLoggedIn(!!token || !!currentStudent);
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
      <AppBar position="sticky" sx={{width: '100%', bgcolor: mode === 'fancy' ? 'rgba(0,0,0,0.8)' : mode === 'dark' ? '#1f2937' : 'white', zIndex: 1400, boxShadow: mode === 'fancy' ? 'none' : '0 1px 40px #8400ff'}}>
        <Toolbar sx={{ px: { xs: 2, md: 8 }, height: '80px', display: 'flex', justifyContent: 'space-between' }}>
          
          {/* LOGO */}
        <Box component={RouterLink} to="/" sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'row' }, alignItems: 'center', gap: { xs: 0.5, md: 1.5 }, textDecoration: 'none' }}>
          <Box component="img" src={logo} alt="Rocket" width={438} height={190} sx={{ height: { xs: 22, md: 50 }, width: 'auto', transform: { xs: 'rotate(-90deg)', md: 'none' }, transition: 'transform 0.5s' }} />
            <Stack direction="row" sx={{ alignItems: 'baseline' }}>
              <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'text.primary'}}>MOOC</Typography>
              <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'primary.main', ml:0.5}}>2026</Typography>
            </Stack>
          </Box>

          {/* DESKTOP NAV (Cursos > Accedir > Language > Theme) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
            <Button onClick={() => scrollToDynamic(1000, 1800)} sx={commonButtonStyle}>
              {t('footer.courses')}
            </Button>

            <CourseViewToggle />

            {isLoggedIn ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button component={RouterLink} to="/dashboards/student" startIcon={<GraduationCap size={18} />} sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'none', px: 2, height: 40, bgcolor: theme.palette.mode === 'light' ? alpha(theme.palette.primary.main, 0.15) : 'action.hover', borderRadius: '12px' }}>
                  {t('dashboard.my_progress')}
                </Button>
              </Stack>
            ) : (
              <Button onClick={() => navigate('/dashboards/student')} sx={commonButtonStyle}>{t('auth.access')}</Button>
            )}

            <LanguageSwitcher />
            <ThemeToggleButton />
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

      {/* MOBILE MENU OVERLAY (Language > Accedir > Cursos) */}
      <AnimatePresence>
        {mobileOpen && (
          <Box component={motion.div} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}  sx={{position: 'fixed', top: '80px',left: 0,right: 0,bottom: 0,width: '100vw',height: 'calc(100vh - 80px)',bgcolor: 'background.default', zIndex: 1300, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', pt: 4, pb: 6}}>
            <Stack spacing={4} sx={{ width: '85%', alignItems: 'center' }}>
              
              {/* 1. Language */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontWeight: 700, color: 'text.secondary', letterSpacing: '1px' }}>{t('')?.toUpperCase()}</Typography>
                <LanguageSwitcher />
              </Box>

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 2. Accedir / Progress */}
              <Stack spacing={2} sx={{ width: '100%' }}>
                <CourseViewToggle size="large" onChange={() => setMobileOpen(false)} />
                {isLoggedIn ? (
                  <>
                    <Button fullWidth component={RouterLink} to="/dashboards/student" startIcon={<GraduationCap />} onClick={() => setMobileOpen(false)} sx={{ fontWeight: 800, borderRadius: '12px', py: 2, color: 'text.primary', bgcolor: theme.palette.mode === 'light' ? alpha(theme.palette.primary.main, 0.08) : 'action.hover', fontSize: '1.1rem' }}>
                      {t('dashboard.my_progress')}
                    </Button>
                    <Button fullWidth color="error" onClick={handleLogout} sx={{ fontWeight: 900, py: 1.5 }}>{t('auth.logout')}</Button>
                  </>
                ) : (<Button fullWidth onClick={() => { navigate('/dashboards/student'); setMobileOpen(false); }} sx={{ ...commonButtonStyle, py: 2, fontSize: '1.1rem' }}>{t('auth.access').toUpperCase()}</Button>)}
              </Stack>

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 3. Cursos */}
              <Button fullWidth onClick={() => scrollToDynamic(1000, 700)} sx={{ color: 'text.primary', fontWeight: 900, py: 2, fontSize: '1.4rem' }}>
                {t('footer.courses').toUpperCase()}
              </Button>

            </Stack>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}
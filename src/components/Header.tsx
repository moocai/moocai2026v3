import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, Close as CloseIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { AppBar, Toolbar, Box, Typography, Button, IconButton, Stack, Divider, alpha} from '@mui/material';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';
import { ThemeToggleButton } from './ThemeToggleButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserAvatarMenu } from './UserAvatarMenu';
import { useThemeMode } from '../hooks/useTheme';
import { NotificationBell } from './NotificationBell';
import { StarScore } from './StarScore';
import { headerHeightFor, isCodingRoute } from '../layouts/headerHeight';
// Punts del servidor (els mateixos que el leaderboard i la pàgina d'activitat)
import { usePoints } from '../utils/pointsSync';
import { useAllCourses } from '../hooks/useCourses';
const logo = '/img/logo.webp';

/** Pastilla d'estrelles (la puntuació), pensada per anar al costat de l'àvia. */
function PointsBadge({ points }: { points: number }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1, height: 32, borderRadius: 999, flexShrink: 0,
        bgcolor: alpha('#8400ff', 0.15), border: '1px solid', borderColor: alpha('#8400ff', 0.4),
      }}
    >
      <StarScore value={points} sx={{ fontSize: '0.85rem', fontWeight: 900, color: 'text.primary', lineHeight: 1 }} />
    </Box>
  );
}

export function Header() {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>(() => (localStorage.getItem('mooc_role') as 'student' | 'teacher') || 'student');
  const [studentName, setStudentName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const points = usePoints();
  const navigate = useNavigate();
  const location = useLocation();
  // Problema de codi: capçalera més baixa perquè l'alumne tingui més espai per al codi
  const compact = isCodingRoute(location.pathname);
  const headerHeight = headerHeightFor(location.pathname);
  // "Tauler" només dins d'un curs (i al mateix tauler): obre el tauler d'aquell curs.
  // El curs surt de l'adreça: /courses/<curs>/... o, al tauler d'un curs, ?course=<curs>.
  const onDashboard = location.pathname === '/dashboards/student';
  const dashboardCourse = onDashboard ? new URLSearchParams(location.search).get('course') : null;
  const courseInPath = /^\/courses\/([^/]+)/.exec(location.pathname)?.[1]
    ?? (dashboardCourse ? encodeURIComponent(dashboardCourse) : undefined);
  const dashboardTarget = onDashboard ? `${location.pathname}${location.search}`
    : courseInPath ? `/dashboards/student?course=${encodeURIComponent(decodeURIComponent(courseInPath))}` : null;
  // "Enquestes", com a algorien, només dins d'un curs: són de cada curs
  const surveysTarget = courseInPath ? `/courses/${courseInPath}/surveys` : null;
  // "Drive": fitxers generals del curs (els de cada tema són a la pestanya Fitxers del curs)
  const driveTarget = courseInPath ? `/courses/${courseInPath}/drive` : null;
  // "Reptes" (de ML): només als cursos que en tenen
  const courses = useAllCourses(isLoggedIn && !!courseInPath);
  const courseAllowsChallenges = !!courseInPath
    && courses.data?.find((c) => c.slug === decodeURIComponent(courseInPath))?.allowsChallenges === true;
  const challengesTarget = courseAllowsChallenges ? `/courses/${courseInPath}/challenges` : null;
  // "Exàmens": només si l'alumnat del curs en té algun
  const courseHasExams = !!courseInPath
    && courses.data?.find((c) => c.slug === decodeURIComponent(courseInPath))?.hasExams === true;
  const examsTarget = courseHasExams ? `/courses/${courseInPath}/exams` : null;

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const scrollToCourses = () => {
    setMobileOpen(false); 
    const performScroll = () => {
      const element = document.getElementById('courses');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: 'courses' } });
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

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setMobileOpen(false);
    window.dispatchEvent(new Event('authChange'));
    navigate('/');
  };

  const commonButtonStyle = {
    color: 'text.primary',
    fontWeight: 800,
    textTransform: 'none',
    fontSize: compact ? '0.9rem' : '1rem',
    height: compact ? 32 : 40,
    '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
  };

  return (
    <>
      <AppBar position="sticky" sx={{width: '100%', bgcolor: mode === 'fancy' ? '#000000' : mode === 'dark' ? '#1f2937' : 'white', zIndex: 1400, boxShadow: mode === 'fancy' ? 'none' : compact ? '0 1px 16px #8400ff' : '0 1px 40px #8400ff'}}>
        <Toolbar sx={{ px: { xs: 2, md: compact ? 3 : 8 }, height: headerHeight, minHeight: { xs: headerHeight, sm: headerHeight }, display: 'flex', justifyContent: 'space-between' }}>
          
          {/* LOGO */}
        <Box component={RouterLink} to="/" state={{ fromNav: true }} sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'row' }, alignItems: 'center', gap: { xs: 0.5, md: 1.5 }, textDecoration: 'none' }}>
          <Box component="img" src={logo} alt="Rocket" width={438} height={190} sx={{ height: { xs: compact ? 17 : 22, md: compact ? 28 : 50 }, width: 'auto', transform: { xs: 'rotate(-90deg)', md: 'none' }, transition: 'transform 0.5s' }} />
            <Stack direction="row" sx={{ alignItems: 'baseline' }}>
              <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'text.primary', ...(compact && { fontSize: '1.15rem' })}}>MOOC</Typography>
              <Typography variant="h5" component="span" sx={{ fontWeight: 900, color: 'primary.main', ml:0.5, ...(compact && { fontSize: '1.15rem' })}}>2026</Typography>
            </Stack>
          </Box>

          {/* DESKTOP NAV */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: compact ? 2 : 3, mr: compact ? 0 : -5}}>
            <Button onClick={scrollToCourses} sx={commonButtonStyle}>
              {t('footer.courses')}
            </Button>

            {isLoggedIn && dashboardTarget && (
              <Button onClick={() => navigate(dashboardTarget)} sx={commonButtonStyle}>
                {t('dashboard.title')}
              </Button>
            )}

            {isLoggedIn && surveysTarget && (
              <Button onClick={() => navigate(surveysTarget)} sx={commonButtonStyle}>
                {t('surveys.title')}
              </Button>
            )}

            {isLoggedIn && driveTarget && (
              <Button onClick={() => navigate(driveTarget)} sx={commonButtonStyle}>
                {t('drive.title')}
              </Button>
            )}

            {isLoggedIn && challengesTarget && (
              <Button onClick={() => navigate(challengesTarget)} sx={commonButtonStyle}>
                {t('challenges.title')}
              </Button>
            )}

            {isLoggedIn && examsTarget && (
              <Button onClick={() => navigate(examsTarget)} sx={commonButtonStyle}>
                {t('exams.title')}
              </Button>
            )}

            {!isLoggedIn && (
              <Button onClick={() => navigate('/dashboards/student')} sx={commonButtonStyle}>{t('auth.access')}</Button>
            )}

            <ThemeToggleButton />
            {!studentName && <LanguageSwitcher />}
            {studentName && <PointsBadge points={points} />}
            {isLoggedIn && <NotificationBell />}
            {/* Aquí s'integra el menú d'avatar de l'usuari amb la imatge del header */}
            {studentName && <UserAvatarMenu studentName={studentName} />}

            {isLoggedIn && (
              <IconButton
                onClick={handleLogout}
                aria-label={t('auth.logout')}
                sx={{ color: 'error.main', width: 40, height: 40, borderRadius: '10px', '&:hover': { color: 'error.dark', bgcolor: 'action.hover' } }}
              >
                <LogoutIcon />
              </IconButton>
            )}
          </Box>

          {/* MOBILE CONTROLS */}
          <Stack direction="row" spacing={1} sx={{ display: { md: 'none' }, alignItems: 'center' }}>
            <ThemeToggleButton />
            {isLoggedIn && <NotificationBell />}
            {/* Si vols que l'avatar també surti a mòbil abans d'obrir el menú */}
            {studentName && <UserAvatarMenu studentName={studentName} />}
            <IconButton sx={{ color: 'text.primary' }} onClick={handleDrawerToggle} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
              {mobileOpen ? <CloseIcon fontSize="large" /> : <MenuIcon fontSize="large" />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {mobileOpen && (
          <Box component={motion.div} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}  sx={{position: 'fixed', top: headerHeight,left: 0,right: 0,bottom: 0,width: '100vw',height: `calc(100vh - ${headerHeight}px)`,bgcolor: 'background.default', zIndex: 1300, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', pt: 4, pb: 6}}>
            <Stack spacing={4} sx={{ width: '85%', alignItems: 'center' }}>

              {/* 1. Cursos + Dashboard + nom usuari */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, width: '100%', flexWrap: 'wrap' }}>
                <Button onClick={scrollToCourses} sx={{ color: 'text.primary', fontWeight: 900, py: 2, fontSize: '1.4rem' }}>
                  {t('footer.courses').toUpperCase()}
                </Button>
                {isLoggedIn && dashboardTarget && (
                  <Button onClick={() => { navigate(dashboardTarget); setMobileOpen(false); }} sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1rem', textTransform: 'none' }}>
                    {t('dashboard.title')}
                  </Button>
                )}
                {isLoggedIn && surveysTarget && (
                  <Button onClick={() => { navigate(surveysTarget); setMobileOpen(false); }} sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1rem', textTransform: 'none' }}>
                    {t('surveys.title')}
                  </Button>
                )}
                {isLoggedIn && driveTarget && (
                  <Button onClick={() => { navigate(driveTarget); setMobileOpen(false); }} sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1rem', textTransform: 'none' }}>
                    {t('drive.title')}
                  </Button>
                )}
                {isLoggedIn && challengesTarget && (
                  <Button onClick={() => { navigate(challengesTarget); setMobileOpen(false); }} sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1rem', textTransform: 'none' }}>
                    {t('challenges.title')}
                  </Button>
                )}
                {isLoggedIn && examsTarget && (
                  <Button onClick={() => { navigate(examsTarget); setMobileOpen(false); }} sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1rem', textTransform: 'none' }}>
                    {t('exams.title')}
                  </Button>
                )}
                {isLoggedIn && (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <PointsBadge points={points} />
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.secondary' }}>
                      {studentName}
                    </Typography>
                  </Stack>
                )}
              </Box>

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 2. Accedir o Rol */}
              {!isLoggedIn ? (
                <Button fullWidth onClick={() => { navigate('/dashboards/student'); setMobileOpen(false); }} sx={{ ...commonButtonStyle, py: 2, fontSize: '1.1rem' }}>{t('auth.access').toUpperCase()}</Button>
              ) : (
                <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: '12px', p: 0.5, position: 'relative', width: '100%', height: '44px' }}>
                  <Box sx={{ position: 'absolute', top: 4, bottom: 4, left: role === 'student' ? 4 : 'calc(50% + 2px)', width: 'calc(50% - 6px)', bgcolor: 'primary.main', borderRadius: '10px', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
                  <Button disableRipple onClick={() => { handleRoleChange('student'); setMobileOpen(false); }} sx={{ flex: 1, zIndex: 1, borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', textTransform: 'none', color: role === 'student' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_student')}</Button>
                  <Button disableRipple onClick={() => { handleRoleChange('teacher'); setMobileOpen(false); }} sx={{ flex: 1, zIndex: 1, borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', textTransform: 'none', color: role === 'teacher' ? '#fff' : 'text.secondary', '&:hover': { bgcolor: 'transparent' } }}>{t('dashboard.role_teacher')}</Button>
                </Box>
              )}

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 3. Language */}
              <Box sx={{ textAlign: 'center' }}>
                <LanguageSwitcher />
              </Box>

              <Divider sx={{ width: '100%', opacity: 0.1 }} />

              {/* 4. Sortir */}
              {isLoggedIn && (
                <Button fullWidth color="error" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ fontWeight: 800, textTransform: 'none' }}>
                  {t('auth.logout')}
                </Button>
              )}

            </Stack>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}
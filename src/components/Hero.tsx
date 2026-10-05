import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from './ParticlesBackground';
import { Box, Container, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { courseService } from '../services/courseService';
// TODO(stats): pendent de parlar-ho. Veure el comentari de `updateStudents` més avall.
// import { statsService } from '../services/statsService';
import { useThemeMode } from '../hooks/useTheme';

interface TypewriterProps { words: string[]; }

const Typewriter = ({ words }: TypewriterProps) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const WAIT_TIME = 4000; const TYPING_SPEED = 150; const DELETING_SPEED = 60;

  useEffect(() => {
    if (subIndex === words[index].length && !reverse) {
      const timeout = setTimeout(() => setReverse(true), WAIT_TIME);
      return () => clearTimeout(timeout);
    }
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? DELETING_SPEED : TYPING_SPEED);
    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);

  return (
    <Box
      component="span"
      sx={{
        color: 'text.primary',
        borderRight: { xs: '3px solid', md: '5px solid' },
        borderColor: 'primary.main',
        paddingRight: '4px',
        display: 'inline-block',
        lineHeight: 1,
        animation: 'blink 1s step-end infinite',
        '@keyframes blink': {
          '0%, 100%': { borderColor: 'primary.main' },
          '50%': { borderColor: 'transparent' },
        },
      }}
    >
      {words[index].substring(0, subIndex)}
    </Box>
  );
};

export default function Hero() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // TODO(stats): pendent de parlar-ho.
  // `GET /api/v1/public/stats/` no existeix a algorien: la petició donava 404 a
  // cada visita i el valor sempre era "—". Abans de crear cap endpoint cal decidir
  // què ha de comptar (tots els alumnes d'algorien? només els dels cursos públics
  // de moocai?) i si aquesta dada ha de ser pública. Mentrestant, desactivat.
  // const [studentCount, setStudentCount] = useState<number | null>(null);
  const [courseCount, setCourseCount] = useState(0);

  // TODO(stats): pendent de parlar-ho (veure més amunt).
  // // Alumnes: comptador real del servidor (endpoint públic, no depèn del login)
  // const updateStudents = useCallback(() => {
  //   statsService
  //     .getStudentCount()
  //     .then(setStudentCount)
  //     .catch(() => {
  //       // Si falla, es manté l'últim valor conegut (o "—" si no n'hi ha)
  //     });
  // }, []);

  // Cursos: només si hi ha sessió; en fer logout es posa a 0 a l'instant
  const updateCourses = useCallback(() => {
    const isLoggedIn = Boolean(localStorage.getItem('currentStudent'));
    if (!isLoggedIn) {
      setCourseCount(0);
    } else {
      courseService
        .getAllCourses()
        .then((c) => setCourseCount(c.length))
        .catch(() => setCourseCount(0));
    }
  }, []);

  // TODO(stats): pendent de parlar-ho (veure més amunt).
  // useEffect(() => {
  //   updateStudents();
  //   // Es torna a demanar si algú dispara 'studentsUpdated' (p. ex. després d'un registre)
  //   // o quan canvia la sessió (login/logout)
  //   window.addEventListener('studentsUpdated', updateStudents);
  //   window.addEventListener('authChange', updateStudents);
  //   return () => {
  //     window.removeEventListener('studentsUpdated', updateStudents);
  //     window.removeEventListener('authChange', updateStudents);
  //   };
  // }, [updateStudents]);

  useEffect(() => {
    updateCourses();
    window.addEventListener('authChange', updateCourses);
    window.addEventListener('storage', updateCourses);
    return () => {
      window.removeEventListener('authChange', updateCourses);
      window.removeEventListener('storage', updateCourses);
    };
  }, [updateCourses]);

  const stats = [
    // TODO(stats): pendent de parlar-ho (veure més amunt).
    // { label: t('hero.stats.students'), value: studentCount ?? '—', delay: 0 },
    { label: t('hero.stats.courses'), value: courseCount, delay: 0.2 },
    { label: t('hero.stats.support'), value: '24/7', delay: 0.4 },
  ];

  const techStack: string[] = ['React', 'Python', 'SpringBoot', isMobile ? 'ML' : 'Machine Learning'];

  return (
    <Box component="section" sx={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, overflow: 'hidden', bgcolor: 'background.default', px: 2 }}>

      {mode === 'fancy' && <Box sx={{ position: 'absolute', inset: 0, zIndex: -1 }}><ParticlesBackground /></Box>}

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', py: { xs: 8, md: 15 } }}>
        <Box component={motion.div} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>

          <Box component={motion.div} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '1.8rem', sm: '3rem', md: '4rem' }, fontWeight: 900, color: 'text.primary', mt: { xs: -8, md: -15 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>Mooc</Box>
              <Box sx={{ flex: 1, textAlign: 'center', display: 'block' }}>
                <Typewriter words={techStack} />
              </Box>
            </Typography>

            <Typography variant="h2" sx={{ fontSize: { xs: '1.3rem', sm: '2rem', md: '2.8rem' }, fontWeight: 800, background: 'linear-gradient(135deg, #10b981 20%, #a855f7 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mt: { xs: 2, md: 5 }, mb: { xs: 2, md: 5 } }}>
              {t('hero.build_apps')}
            </Typography>
          </Box>

          <Typography component={motion.p} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} sx={{ fontSize: { xs: '1rem', md: '1.5rem' }, color: 'text.primary', mb: { xs: 6, md: 10 }, maxWidth: '750px', mx: 'auto', fontWeight: 500, lineHeight: 1.6 }}>
            {t('hero.subtitle')}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: `repeat(${stats.length}, 1fr)`, sm: `repeat(${stats.length}, 1fr)` }, gap: { xs: 2, md: 5 }, width: '100%', maxWidth: '1100px', mx: 'auto', mt: -3 }}>
            {stats.map((stat, i) => {
              const statColors = [theme.palette.primary.main, '#10b981', '#f59e0b'];
              return (
                <Box key={i} component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + stat.delay }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: { xs: '2rem', md: '3.5rem' }, fontWeight: 900, color: statColors[i], fontFamily: 'monospace' }}>
                    <AnimatePresence mode="wait"><motion.span key={stat.value} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{stat.value}</motion.span></AnimatePresence>
                  </Typography>
                  <Typography variant="caption" component="p" sx={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800 }}>{stat.label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Container>

      <Box sx={{ position: 'absolute', bottom: { xs: 140, md: 100 }, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: { xs: 2, md: 1 }, zIndex: 11, width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '20px', justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => (
            <Box key={`left-${i}`} component={motion.div} animate={{ opacity: [0, 1, 0], y: [0, 5, 10] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }} sx={{ mt: i === 0 ? -2 : -3, display: 'flex', filter: theme.palette.mode === 'dark' ? 'black' : 'white' }}>
              <KeyboardArrowDownIcon sx={{ fontSize: { xs: '1.2rem', md: '2rem' } }} />
            </Box>
          ))}
        </Box>

        <Typography sx={{ fontSize: { xs: '0.6rem', md: '0.75rem' }, fontWeight: 900, letterSpacing: '0.25em', color: 'text.primary', textTransform: 'uppercase', mx: 1 }}>{t('hero.scroll_down')}</Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '20px', justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => (
            <Box key={`right-${i}`} component={motion.div} animate={{ opacity: [0, 1, 0], y: [0, 5, 10] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }} sx={{ mt: i === 0 ? -2 : -3, display: 'flex', filter: theme.palette.mode === 'dark' ? 'black' : 'white' }}>
              <KeyboardArrowDownIcon sx={{ fontSize: { xs: '1.2rem', md: '2rem' } }} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
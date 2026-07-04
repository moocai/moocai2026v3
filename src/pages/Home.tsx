import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Container, Box, Typography, Grid, CircularProgress, useTheme } from '@mui/material';
import { Header } from '../components/Header';
import Hero from '../components/Hero';
import { Footer } from '../components/Footer';
import { CourseCard } from '../components/CourseCard';
import { courseService } from '../services/courseService';
import { Course } from '../types';

const flipVariants = {
  hidden: { rotateY: -90 },
  visible: (i: number) => ({
    rotateY: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 5,
      delay: i * 0.5,
    },
  }),
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: (index: number) => ({
    opacity: 0,
    x: index % 3 === 0 ? -100 : index % 3 === 2 ? 100 : 0,
    y: index % 3 === 1 ? 50 : 0,
  }),
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 10,
      delay: i * 0.5,
    },
  }),
};

export default function Home() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await courseService.getAllCourses();
        setCoursesList(data);
      } catch (error) {
        console.error("Error carregant cursos des de l'API:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCourses(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const features = [
    {icon: '⚡', title: t('home.features.code_title'), desc: t('home.features.code_desc') },
    {icon: '💻', title: t('home.features.portfolio_title'), desc: t('home.features.portfolio_desc') },
    {icon: '🔄', title: t('home.features.stack_title'), desc: t('home.features.stack_desc') },
    {icon: '👥', title: t('home.features.networking_title'), desc: t('home.features.networking_desc') },
    {icon: '📱', title: t('home.features.mobile_title'), desc: t('home.features.mobile_desc') },
    {icon: '🎓', title: t('home.features.cert_title'), desc: t('home.features.cert_desc')}
  ];

  return (
    <Box sx={{Height: '100vh', bgcolor: 'background.default', color: 'text.primary', overflowX: 'hidden' }}>
      <Header />
      <Hero />
      
      {/* SECCIÓ 2: CURSOS */}
      <Box component="section" id="courses" sx={{position: 'relative', zIndex: 2, py: { xs: 1, md: 10 }}}>
        <Container maxWidth="lg">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Box sx={{ textAlign: 'center', mb: 10 }}>
              <Typography component="h2" variant="h5" sx={{ fontSize: { xs: '1.7rem', md: '3.5rem' }, fontWeight: 900, background: 'linear-gradient(to bottom, ' + theme.palette.text.primary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', mb: 3 }}>
                {t('home.featured_title')}
              </Typography>
              <Typography component="p" variant="body1" sx={{ color: 'text.primary', maxWidth: '80rem', mx: 'auto', fontWeight: 400, fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.8rem' }, lineHeight: { xs: 1.5, md: 1.6 }, px: { xs: 2, md: 0 }, mt: { xs: 2 }, mb: { xs: -5 } }}>
                {t('home.featured_subtitle')}
              </Typography>
            </Box>
          </motion.div>

          <Box sx={{ perspective: '1000px' }}>
            <Grid container spacing={3}>
              {loading ? (
                <Grid size={12} sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                  <CircularProgress sx={{ color: 'primary.main' }} />
                </Grid>
              ) : coursesList.length > 0 ? (
                coursesList.map((course: Course, index: number) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={course.id || index}>
                    <motion.div
                      variants={flipVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      custom={index}
                      style={{ height: '100%' }}
                    >
                      <CourseCard course={course} index={index} />
                    </motion.div>
                  </Grid>
                ))
              ) : (
                <Grid size={12}>
                  <Box sx={{ textAlign: 'center', py: 10, border: '1px dashed', borderColor: 'divider', borderRadius: 8 }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                      {t('home.no_courses')}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* SECCIÓ 3: FEATURES */}
      <Box component="section" id="features" sx={{ py: { xs: 20, md: 10 }, position: 'relative', zIndex: 2 }}>
        <Container maxWidth="lg">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
              <Typography component="h2" variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 900, mb: 3, px: { xs: 2, md: 0 } }}>
                {t('home.why_choose_title')}
              </Typography>
            </Box>
            
            <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
              {features.map((feature, index) => (
                <Grid size={{ xs: 10.5, sm: 6, md: 4 }} key={index} component={motion.div} variants={cardVariants} custom={index}> 
                  <Box sx={{ p: { xs: 2.5, md: 3 }, height: '100%', borderRadius: 2, mx: 'auto', bgcolor: 'background.paper', border: '2px solid', borderColor: theme.palette.mode === 'dark' ? '#8400ff' : 'black', transition: 'all 0.3s', '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#ffffff2d' : '#ffffffb6', borderColor: 'primary.main', transform: { md: 'translateY(-10px)' } } }}>
                    <Box sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h3" component="h3" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                      {feature.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen} from 'lucide-react';
import { motion } from 'framer-motion';
import { Box, Typography, Button, IconButton, CircularProgress, useTheme, useMediaQuery, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { courseService } from '../../../../services/courseService';

// Tipus per a suportar multiidioma (ca, es, en)
type I18nField = { ca: string; es: string; en: string };

interface Lesson {
  id: string;
  title: I18nField | string;
  description: I18nField | string;
  theoryInstructions: I18nField | string;
  challenge: I18nField | string;
  initialCode: string;
  solution: string;
}

interface Course { 
  id: string; 
  title: I18nField | string; 
  content: Lesson[]; 
}

interface DataStructure { courses: Course[]; }

export default function LessonTopic() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { i18n, t } = useTranslation();
  const [apiData, setApiData] = useState<DataStructure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    courseService.getFullCourseDetail(courseId)
      .then(c => setApiData({ courses: [c] }))
      .catch(() => setApiData(null))
      .finally(() => setLoading(false));
  }, [courseId]);
  const lang = (i18n.language?.split('-')[0] as keyof I18nField) || 'ca';
  const getText = (field: I18nField | string | Record<string, string> | undefined): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return (field as any)[lang] || (field as any)['ca'] || '';
  };

  const course = useMemo(() => apiData?.courses?.find((c) => c.id === courseId), [apiData, courseId]);
  const lesson = useMemo(() => course?.content?.find((l) => l.id === lessonId), [course, lessonId]);
  const currentIndex = useMemo(() => course?.content?.findIndex((l) => l.id === lessonId) ?? -1, [course, lessonId]);
  const goToLesson = (index: number) => {if (!course?.content?.[index]) return; navigate(`/courses/${courseId}/${course.content[index].id}/topic`);};
  if (loading) return (<Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}><CircularProgress color="secondary" /></Box>);
  if (!course || !lesson) return null;

  return (
     <Box sx={{ position: 'fixed', inset: 0, height: isMobile ? '87.2vh' : '92vh', mt: isMobile ? 4 : 10, width: '100vw', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden', pb: '70px' }}>

      {/* Header */}
      <Box sx={{ height: 50, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', px: 3, justifyContent: 'space-between', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate(`/courses/${courseId}`)} sx={{ color: 'text.secondary' }}>
            <ChevronLeft />
          </IconButton>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'primary.main', letterSpacing: 1 }}>
            {getText(course.title).toUpperCase()}
          </Typography>
        </Box>
      </Box>

      {/* Contingut - 2 columnes desktop */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>

        {/* COLUMNA 1: Índex de lliçons (Sidebar) */}
        <Box sx={{ width: isMobile ? '100%' : '50%', borderRight: isMobile ? 'none' : '1px solid', borderBottom: isMobile ? '1px solid' : 'none', borderColor: 'divider', bgcolor: 'background.paper', overflowY: 'auto', flexShrink: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BookOpen size={14} color={theme.palette.primary.main} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                {t('lesson.lessons')}
              </Typography>
            </Box>
          </Box>

          {course.content
            /* 1. Filtrem: Només deixem passar la lliçó que coincideix amb la URL */
            .filter((l) => l.id === lessonId) 
            .map((l) => {
              /* 2. Busquem la posició real al JSON (01, 02...) per no perdre el número */
              const realIndex = course.content.findIndex((item) => item.id === l.id);

              return (
                <Box key={l.id} sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.1), borderLeft: '3px solid', borderLeftColor: 'primary.main', transition: 'all 0.2s ease' }}>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mb: 0.25 }}>
                    {String(realIndex + 1).padStart(2, '0')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'primary.main' }}>
                    {getText(l.title)}
                  </Typography>
                </Box>
              );
            })
          }
        </Box>

        {/* COLUMNA 2: Contingut teòric (NOMÉS LA LLIÇÓ SELECCIONADA) */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 3, md: 6 }, bgcolor: 'background.default' }}>
          <motion.div 
            key={lessonId} // Això reinicia l'animació quan cambies de lliçó
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
          >
            {/* Títol i Descripció de la lliçó actual */}
            <Typography variant="h3" component="h1" sx={{ fontWeight: 900, mb: 1, fontSize: { xs: '1.8rem', md: '2.5rem' }, letterSpacing: '-0.02em' }}>
              {getText(lesson.title)}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '1.1rem', mb: 5, lineHeight: 1.5 }}>
              {getText(lesson.description)}
            </Typography>

            {/* Explicació Teòrica */}
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 6, height: 24, bgcolor: 'primary.main', borderRadius: 2 }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.primary' }}>
                  {t('lesson.explanation')}
                </Typography>
              </Box>
              <Typography sx={{ 
                color: 'text.primary', 
                fontSize: '1.05rem', 
                lineHeight: 1.5, 
                maxWidth: '800px' 
              }}>
                 {getText(lesson.theoryInstructions)}
              </Typography>
            </Box>

            {/* Objectiu / Repte */}
            <Box sx={{p: 2, borderRadius: 3, border: '2px solid', borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.03),maxWidth: '300px'}}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'primary.main', mb: 1.5 }}>
                {t('lesson.your_challenge')}
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'monospace', color: 'text.primary' }}>
                {getText(lesson.challenge)}
              </Typography>
            </Box>
            {lesson.challenge && (
              <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.15), maxWidth: '500px' }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, color: 'text.secondary' }}>
                  {t('lesson.objective')}
                </Typography>
              </Box>
            )}
          </motion.div>
        </Box>
      </Box>

       {/* Footer navegació */}
       <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, height: 70, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1, md: 2 }, bgcolor: 'background.paper', px: 2 }}>
        <Button onClick={() => goToLesson(currentIndex - 1)} disabled={currentIndex <= 0} variant="outlined" sx={{ minWidth: { xs: 40, md: 120 }, fontWeight: 700 }}>
          <ChevronLeft size={18} /> {!isMobile && t('lesson.previous')}
        </Button>

        <Button onClick={() => navigate(`/courses/${courseId}/${lessonId}`)} variant="contained" color="secondary" sx={{ px: 4, fontWeight: 800, borderRadius: 2, fontSize: 11 }}>{t('lesson.go_to_activity')}</Button>
        <Button onClick={() => goToLesson(currentIndex + 1)} disabled={currentIndex >= (course?.content.length ?? 0) - 1} variant="outlined" sx={{ minWidth: { xs: 40, md: 120 }, fontWeight: 700 }}>
          {!isMobile && t('lesson.next')} <ChevronRight size={18} />
        </Button>
      </Box>

    </Box>
  );
}
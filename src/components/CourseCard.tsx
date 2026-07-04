import {Box, Typography, useTheme} from '@mui/material';
import {Card, CardContent, CardTitle, CardDescription} from './ui/Card'; 
import {motion} from 'framer-motion';
import {useNavigate} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import { type MouseEvent } from 'react';
import {useTranslation} from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchCourse } from '../hooks/useCourse';
import { courseImages } from '../data/courses';

interface Course {id: string;slug?: string;title: string | { ca: string; es: string; en: string }; description: string | { ca: string; es: string; en: string }; image: string; level: string; duration: string; instructor: string; logoSize?: number; logoWidth?: number; logoHeight?: number; disabled?: boolean;}

function getLocalizedText(text: string | { ca: string; es: string; en: string }, lang: string): string {
  if (typeof text === 'string') return text;
  return text[lang as keyof typeof text] || text.en || text.ca || text.es || '';
}

interface CourseCardProps {course: Course;index: number;}

export function CourseCard({ course, index }: CourseCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lang = i18n.language.split('-')[0] || 'en';

  const handleEnroll = (e: MouseEvent) => {
    if (course.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    navigate(`/courses/${course.id}`);
  };
  const logoW = course.logoWidth || course.logoSize || 100;
  const logoH = course.logoHeight || course.logoSize || 100;

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }} viewport={{ once: true }} style={{ height: '100%' }}>
      <Card onMouseEnter={() => prefetchCourse(queryClient, course.id)} sx={{height: '100%', width: {xs: '85%', md: '100%'}, mx: {xs: 'auto', md: 'unset'},display: 'flex',borderColor: theme.palette.mode === 'dark' ? '#8400ff' : 'black', flexDirection: 'column', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', opacity: course.disabled ? 0.7 : 1, filter: course.disabled ? 'grayscale(0)' : 'none', '&:hover': course.disabled ? {} : {transform: { xs: 'none', md: 'translateY(-15px)' }, boxShadow: '0 0 10px 10px ' + theme.palette.primary.main + '40', borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#8400ff',bgcolor: theme.palette.mode === 'dark' ? '#fffff' : 'rgba(0,0,0,0.02)',},}}>

          <Box sx={{ p: { xs: 1.5, md: 2 }, pb: 0 }}>
            <Box sx={{position: 'relative', height: {xs: '120px', md: '180px'}, width: '100%',borderRadius: 1, overflow: 'hidden',background: 'linear-gradient(135deg, ' + theme.palette.primary.main + '26 0%, ' + theme.palette.secondary?.main + '33 100%)', display: 'flex',alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#8400ff' : 'black'}}>         
              <motion.div whileHover={{ scale: 1.05, rotate: 2 }} transition={{ type: "spring", stiffness: 300 }}>
                <Box
                  component="img" src={course.image || courseImages[course.slug || course.id] || ''} alt={getLocalizedText(course.title, lang)}
                  sx={{width: { xs: logoW * 0.65, md: logoW },height: { xs: logoH * 0.65, md: logoH }, objectFit: 'contain'}}/>
              </motion.div>
            </Box>
          </Box>

          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',pt: { xs: 1.5, md: 4 }, px: { xs: 1.5, md: 3 },pb: { xs: 1.5, md: 3 }}}>
            <Box>            
               <CardTitle sx={{mb: 1, fontSize: { xs: '1.05rem', md: '1.4rem' },lineHeight: 1.3,transition: 'color 0.3s','.MuiCard-root:hover &': { color: 'primary.main' } }}>{getLocalizedText(course.title, lang)}</CardTitle>
               <CardDescription sx={{mb: { xs: 2, md: 3 }, fontSize: { xs: '0.8rem', md: '1rem' }}}>{getLocalizedText(course.description, lang)}</CardDescription>
            </Box>

            <Box>
              <Box onClick={handleEnroll} sx={{display: 'flex', alignItems: 'center',justifyContent: 'space-between', pt: { xs: 1.5, md: 2.5 },borderTop: '1px solid', borderColor: 'divider', cursor: course.disabled ? 'default' : 'pointer'}}>
                <Typography sx={{fontSize: { xs: '0.6rem', md: '0.8rem' }, fontWeight: 900, letterSpacing: '0.15em', color: 'primary.main' }}>{t('course.enroll')}</Typography>
                <Box component={motion.div} animate={{ x: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                  <ArrowRight size={18} color={theme.palette.primary.main} strokeWidth={2.5} />
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
    </motion.div>
  );
}
import {Box, Typography, useTheme} from '@mui/material';
import {Card, CardContent, CardTitle, CardDescription} from './ui/Card'; 
import {motion} from 'framer-motion';
import {useNavigate} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import { type MouseEvent } from 'react';
import {useTranslation} from 'react-i18next';
import { courseImages } from '../data/courses';
import { ProgressBar } from './ui/ProgressBar';
import { useImageUrl } from '../utils/avatarCache';
import { getLocalizedText } from '../utils/formatters';

interface Course {id: string;slug?: string;title: string | { ca: string; es: string; en: string }; description: string | { ca: string; es: string; en: string }; image: string; level: string; duration: string; instructor: string; logoSize?: number; logoWidth?: number; logoHeight?: number; disabled?: boolean;}

// `progress`: % completat del curs (cursos on l'usuari és alumne). Sense, el peu diu "Anar al curs".
interface CourseCardProps {course: Course;index: number;progress?: number | null;}

export function CourseCard({ course, index, progress }: CourseCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const lang = i18n.language;

  const handleCardClick = (e: MouseEvent) => {
    if (course.disabled) return;
    e.preventDefault();
    navigate(`/courses/${course.id}`);
  };

  // Imatge del curs: la local (si n'hi ha) o l'avatar del servidor, que necessita el token
  // (per això passa per la memòria cau d'imatges i no per un <img src> directe).
  const slug = course.slug || course.id;
  const localImage = course.image || courseImages[slug];
  const avatar = useImageUrl(localImage ? undefined : `/api/v1/courses/${encodeURIComponent(slug)}/avatar/`);
  const imageSrc = localImage || avatar;
  const title = getLocalizedText(course.title, lang);

  const logoW = course.logoWidth || course.logoSize || 100;
  const logoH = course.logoHeight || course.logoSize || 100;

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }} viewport={{ once: true }} style={{ height: '100%' }}>
      <Card 
        onClick={handleCardClick}
        sx={{
          height: '100%', 
          width: {xs: '85%', md: '100%'}, 
          mx: {xs: 'auto', md: 'unset'},
          display: 'flex',
          borderColor: theme.palette.mode === 'dark' ? '#8400ff' : 'black', 
          flexDirection: 'column', 
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
          overflow: 'hidden', 
          opacity: course.disabled ? 0.7 : 1, 
          filter: course.disabled ? 'grayscale(0)' : 'none', 
          cursor: course.disabled ? 'default' : 'pointer',
          '&:hover': course.disabled ? {} : {
            transform: { xs: 'none', md: 'translateY(-15px)' }, 
            boxShadow: '0 0 10px 10px ' + theme.palette.primary.main + '40', 
            borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#8400ff',
            bgcolor: theme.palette.mode === 'dark' ? '#fffff' : 'rgba(0,0,0,0.02)',
          }
        }}
      >

          <Box sx={{ p: { xs: 1.5, md: 2 }, pb: 0 }}>
            <Box sx={{position: 'relative', height: {xs: '120px', md: '180px'}, width: '100%',borderRadius: 1, overflow: 'hidden',background: 'linear-gradient(135deg, ' + theme.palette.primary.main + '26 0%, ' + theme.palette.secondary?.main + '33 100%)', display: 'flex',alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#8400ff' : 'black'}}>    
              <motion.div whileHover={{ scale: 1.05, rotate: 2 }} transition={{ type: "spring", stiffness: 300 }}>
                {imageSrc ? (
                  <Box
                    component="img" src={imageSrc} alt={title}
                    sx={{width: { xs: logoW * 0.65, md: logoW },height: { xs: logoH * 0.65, md: logoH }, objectFit: 'contain'}}/>
                ) : (
                  // Sense imatge (el curs no té avatar): la inicial del curs, no una imatge trencada
                  <Typography aria-hidden sx={{ fontSize: { xs: '3rem', md: '4.5rem' }, fontWeight: 900, color: 'primary.main', lineHeight: 1 }}>{title.charAt(0).toUpperCase()}</Typography>
                )}
              </motion.div>
            </Box>
          </Box>

          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',pt: { xs: 1.5, md: 4 }, px: { xs: 1.5, md: 3 },pb: { xs: 1.5, md: 3 }}}>
            <Box>            
               <CardTitle sx={{mb: 1, fontSize: { xs: '1.05rem', md: '1.4rem' },lineHeight: 1.3,transition: 'color 0.3s','.MuiCard-root:hover &': { color: 'primary.main' } }}>{getLocalizedText(course.title, lang)}</CardTitle>
               <CardDescription sx={{mb: { xs: 2, md: 3 }, fontSize: { xs: '0.8rem', md: '1rem' }}}>{getLocalizedText(course.description, lang)}</CardDescription>
            </Box>

            <Box>
              {progress != null ? (
                <Box sx={{ pt: { xs: 1.5, md: 2.5 }, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: { xs: '0.7rem', md: '0.85rem' }, fontWeight: 900, color: 'text.primary', mb: 1 }}>{t('course.percent_completed', { percent: progress })}</Typography>
                  <ProgressBar value={progress} />
                </Box>
              ) : (
              <Box sx={{display: 'flex', alignItems: 'center',justifyContent: 'space-between', pt: { xs: 1.5, md: 2.5 },borderTop: '1px solid', borderColor: 'divider'}}>
                <Typography sx={{fontSize: { xs: '0.6rem', md: '0.8rem' }, fontWeight: 900, letterSpacing: '0.15em', color: 'primary.main' }}>{t('course.go_to_course')}</Typography>
                <Box component={motion.div} animate={{ x: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                  <ArrowRight size={18} color={theme.palette.primary.main} strokeWidth={2.5} />
                </Box>
              </Box>
              )}
            </Box>
          </CardContent>
        </Card>
    </motion.div>
  );
}
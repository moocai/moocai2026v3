import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  Button, CircularProgress, Stack, useTheme, alpha, Drawer, Tabs, Tab
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, ChevronDown, ChevronRight, Code2, CheckCircle2,ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCourse } from '../../hooks/useCourse';
import {useThemeMode} from '../../hooks/useTheme';
import ParticlesBackground from '../../components/ParticlesBackground';
import { courseService } from '../../services/courseService';


type I18nField = { ca: string; es: string; en: string };

export default function CourseLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { data: course, isLoading: loading } = useCourse(courseId);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(searchParams.get('lessonId') || null);
  const [mobileSyllabusOpen, setMobileSyllabusOpen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [contentTab, setContentTab] = useState(0);
  const getProgressKey = () => {
    const saved = localStorage.getItem('currentStudent');
    const id = saved ? JSON.parse(saved).id : 'temp';
    return `mooc_global_progress_${id}`;
  };
  const [progress, setProgress] = useState<Record<string, boolean>>(() =>
    JSON.parse(localStorage.getItem(getProgressKey()) || '{}')
  );
  const reSyncProgress = useCallback(() => {
    setProgress(JSON.parse(localStorage.getItem(getProgressKey()) || '{}'));
  }, []);
  useEffect(() => {
    window.addEventListener('lessonProgressUpdated', reSyncProgress);
    return () => window.removeEventListener('lessonProgressUpdated', reSyncProgress);
  }, [reSyncProgress]);

  const defaultLessonId = course?.content?.[0]?.id ?? null;
  const activeId = activeLessonId ?? defaultLessonId;

  const [theoryMap, setTheoryMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!course || !activeId) return;
    if (theoryMap[activeId] !== undefined) return;
    courseService.getTopicBySlug(course.id, activeId)
      .then(data => setTheoryMap(prev => ({ ...prev, [activeId]: data.theory_md || '' })))
      .catch(() => setTheoryMap(prev => ({ ...prev, [activeId]: '' })));
  }, [course, activeId]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll_${courseId}`);
    if (saved && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo(0, parseInt(saved));
      });
    }
  }, [courseId, course]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const save = () => sessionStorage.setItem(`scroll_${courseId}`, el.scrollTop.toString());
    el.addEventListener('scroll', save);
    return () => el.removeEventListener('scroll', save);
  }, [courseId, course]);

  const isLessonCompleted = (lesson: any): boolean => {
    if (!lesson.subTopics || lesson.subTopics.length === 0)
      return !!progress[`${courseId}_${lesson.id}`];
    return lesson.subTopics.some((sub: any) =>
      !!progress[`${courseId}_${(sub as any).problemSlug || sub.slug || lesson.id}`]
    );
  };

  const getLessonProgress = (lesson: any): number => {
    const completable = lesson.subTopics?.filter((s: any) => s.type === 'coding' || s.type === 'test') || [];
    if (completable.length === 0) return 0;
    const done = completable.filter((s: any) => {
      const key = `${courseId}_${s.problemSlug || s.slug || lesson.id}`;
      return !!progress[key];
    });
    return Math.round((done.length / completable.length) * 100);
  };

  const lang = (i18n.language?.split('-')[0] as keyof I18nField) || 'ca';
  const getText = (field: I18nField | string | undefined): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['ca'] || '';
  };

  if (loading) return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999 }}>
      <CircularProgress color="primary" />
    </Box>
  );

  if (!course) return <Typography>{t('lesson.course_not_found')}</Typography>;

  const renderSidebarTabs = () => (
    <>
      <Box sx={{borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs value={contentTab} onChange={(_, v) => setContentTab(v)} sx={{ minHeight: 0, '& .MuiTabs-flexContainer': { justifyContent: 'center' }, '& .MuiTab-root': { minHeight: 0, py: 1, fontWeight: 800, fontSize: { xs: '0.75rem', md: '1rem' }, textTransform: 'none', color: 'white', ml: { xs: 0, md: 1 }, px: { xs: 1, md: 2 } }, '& .Mui-selected': { color: 'white !important' }, '& .MuiTabs-indicator': { bgcolor: '#8400ff' } }}>
          <Tab label={t('lesson.tab_statement', 'Temari')} />
        </Tabs>
      </Box>
      {contentTab === 0 && course.content?.map((lesson, index) => (
        <motion.div
          key={lesson.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.2, type: 'spring', stiffness: 80, damping: 5 }}
        >
        <Accordion disableGutters elevation={0} sx={{
          '&:before': { display: 'none' },
          borderColor: 'divider',
          bgcolor: 'transparent',
        }}>
          <AccordionSummary expandIcon={<ChevronDown size={30} />} onClick={() => setActiveLessonId(lesson.id)} sx={{
            px: 2, minHeight: 48,
            '& .MuiAccordionSummary-content': { my: 0 },
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.5) },
            ...(lesson.id === activeId ? { bgcolor: alpha('#8400ff', 0.3) } : {})
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography sx={{ fontSize: { xs: '0.85rem', md: '1rem' }, fontWeight: 600, lineHeight: 1.3, flex: 1, letterSpacing: '0.15em', color: lesson.id === activeId ? (mode === 'light' ? '#000' : '#fff') : undefined}}>
                {getText(lesson.title)}
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
                {getLessonProgress(lesson)}%
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pb: 2, pt: 1 }}>
            {theoryMap[lesson.id] && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Button
                  onClick={() => {
                    setActiveLessonId(lesson.id);
                    const el = document.getElementById(`theory-${lesson.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  disableRipple sx={{ justifyContent: 'flex-start', fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.05rem' }, color: lesson.id === activeId ? '#ffffff' : 'text.secondary', bgcolor: lesson.id === activeId ? alpha('#8400ff', 0.1) : 'transparent', textTransform: 'none', minWidth: 0, borderRadius: 1, '&:hover': { color: '#ffffff', bgcolor: alpha('#8400ff', 0.4) }, flex: 1 }}>
                  📖 Teoria
                </Button>
              </Box>
            )}
            <Stack spacing={0.5}>
              {lesson.subTopics?.filter((s: any) => s.type !== 'coding' && s.type !== 'test').map((sub, i) => {
                const subKey = `${courseId}_${sub.problemSlug || lesson.id}`;
                const isSubDone = !!progress[subKey];
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      onClick={() => {
                        setActiveLessonId(lesson.id);
                        const el = document.getElementById(`sub-${lesson.id}-${i}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      disableRipple sx={{justifyContent: 'flex-start', fontWeight: 600, fontSize: { xs: '0.9rem', md: '1.05rem' }, color: lesson.id === activeId ? (mode === 'light' ? '#000' : '#ffffff') : 'text.secondary', textTransform: 'none', minWidth: 0, borderRadius: 1, '&:hover': { color: '#ffffff', bgcolor: alpha('#8400ff', 0.4) }, flex: 1}}>
                      {getText(sub.subtitle)}
                    </Button>
                    {isSubDone && <CheckCircle2 size={14} color={theme.palette.success.main} />}
                  </Box>
                );
              })}
              {lesson.subTopics?.filter((s: any) => s.type === 'coding').map((sub: any) => {
                const subKey = `${courseId}_${sub.problemSlug || sub.slug}`;
                const isDone = !!progress[subKey];
                return (
                  <Button
                    key={sub.problemSlug || sub.slug}
                    component={RouterLink}
                    to={`/courses/${courseId}/${sub.problemSlug || sub.slug || lesson.id}`}
                    size="small"
                    sx={{ justifyContent: 'flex-start', fontSize: { xs: '0.9rem', md: '1.05rem' }, fontWeight: 600, textTransform: 'none', color: isDone ? 'success.main' : 'text.secondary', borderRadius: 1, '&:hover': { bgcolor: alpha('#8400ff', 0.1) } }}
                  >
                    {isDone ? '✅' : '💻'} {getText(sub.subtitle)}
                  </Button>
                );
              })}
              {lesson.subTopics?.filter((s: any) => s.type === 'test').map((sub: any) => {
                const subKey = `${courseId}_${sub.problemSlug || sub.slug}`;
                const isDone = !!progress[subKey];
                return (
                  <Button
                    key={sub.problemSlug || sub.slug}
                    component={RouterLink}
                    to={`/courses/${courseId}/exam/${sub.problemSlug || sub.slug || lesson.id}`}
                    size="small"
                    sx={{ justifyContent: 'flex-start', fontSize: { xs: '0.9rem', md: '1.05rem' }, fontWeight: 600, textTransform: 'none', color: isDone ? 'success.main' : 'text.secondary', borderRadius: 1, '&:hover': { bgcolor: alpha('#8400ff', 0.1) } }}
                  >
                    {isDone ? '✅' : '📝'} {getText(sub.subtitle)}
                  </Button>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
        </motion.div>
      )      )}
    </>
  );

  return (
    <Box sx={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, bgcolor: 'background.default', overflow: 'hidden' }}>
      {mode === 'fancy' && <ParticlesBackground opacityMultiplier={0.4} />}
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* LEFT SIDEBAR - Accordion Syllabus */}
        <Box sx={{
          width: { md: '24%', lg: '22%', xl: '18.5%'},
          minWidth: { md: 240, lg: 280 },
          maxWidth: { md: 340, lg: 380, xl: 400},
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
          bgcolor: 'background.paper',
          mt:2,
          pt:1,
          overflowY: 'auto',
          overflowX: 'hidden',
          maxHeight: 'calc(100vh - 64px)',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
        }}>
          {renderSidebarTabs()}
        </Box>

        {/* CENTRAL COLUMN - Reading Content */}
        <Box ref={scrollRef} sx={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: { md: 'none' },
          px: { xs: 3, md: 8 },
          py: 6,
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
        }}>
          {/* Mobile syllabus toggle */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
            <Button
              onClick={() => setMobileSyllabusOpen(true)}
              variant="outlined"
              size="small"
              startIcon={<BookOpen size={16}/>}
              sx={{fontWeight: 700, borderRadius: 2, textTransform: 'none'}}>
              {t('lesson.tab_statement', 'Temari')}
            </Button>
          </Box>

          {/* Mobile syllabus drawer */}
          <Drawer
            open={mobileSyllabusOpen}
            onClose={() => setMobileSyllabusOpen(false)}
            anchor="left"
            slotProps={{ paper: { sx: { width: 280, bgcolor: 'background.paper', top: 80, height: 'calc(100vh - 64px)' } } }}
          >
            <Box component="aside">
              {renderSidebarTabs()}
            </Box>
          </Drawer>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ paddingRight: showRightPanel ? '310px' : '0px', transition: 'padding-right 0.2s ease' }}>
            {/* Breadcrumb */}
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 3, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <RouterLink to="/" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{t('lesson.academy')}</RouterLink>
              <ChevronRight size={12} />
              <span style={{ fontWeight: 800 }}>{getText(course.title)}</span>
            </Typography>

            {/* Course Title */}
            <Typography variant="h2" sx={{
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: '0.03em',
              mb: 2,
              lineHeight: 1.1
            }}>
              {getText(course.title)}
            </Typography>

            {/* Course Description */}
            <Typography sx={{
              color: 'text.secondary',
              fontSize: '1.4rem',
              lineHeight: 1.7,
              mb: 6,
              maxWidth: '900px'
            }}>
              {getText(course.description)}
            </Typography>

            {/* Contingut del temari seleccionat (sempre visible) */}
            {course.content?.filter(l => l.id === activeId).map((lesson, index) => (
              <motion.div
                key={lesson.id}
                id={`lesson-${lesson.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
              >
                <Box sx={{ mb: 8 }}>
                  {/* Lesson Title */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ width: 6, height: 28, bgcolor: 'primary.main', borderRadius: 2, flexShrink: 0 }} />
                    <Typography variant="h4" sx={{
                      fontWeight: 800,
                      fontSize: { xs: '1.3rem', md: '1.5rem' },
                      letterSpacing: '0.02em'
                    }}>
                      {getText(lesson.title)}
                    </Typography>
                  </Box>

                  {/* Theory */}
                  {theoryMap[lesson.id] && (
                    <Box id={`theory-${lesson.id}`} sx={{ mb: 5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 1.5, color: '#149eca' }}>
                        Teoria
                      </Typography>
                      <Box sx={{ '& p': { color: 'text.secondary', fontSize: '1rem', lineHeight: 1.8, mb: 2.5 }, '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem' }, '& pre': { bgcolor: '#1a1d23', p: 2.5, borderRadius: 2, overflow: 'auto', '& code': { bgcolor: 'transparent', px: 0, py: 0, fontSize: '0.85rem', color: '#7ee787' } }, '& ul, & ol': { color: 'text.secondary', lineHeight: 1.8, mb: 2.5 }, '& li': { mb: 0.5 }, '& h1, & h2, & h3, & h4, & h5, & h6': { color: 'text.primary', fontWeight: 700, mb: 1.5 }, '& table': { width: '100%', borderCollapse: 'collapse', mb: 2.5 }, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 2, py: 1, textAlign: 'left', color: 'text.secondary' }, '& th': { bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 700, color: 'text.primary' }, '& a': { color: 'primary.main' }, '& blockquote': { borderLeft: '4px solid', borderColor: 'primary.main', pl: 2, py: 0.5, mb: 2.5, color: 'text.secondary', fontStyle: 'italic' }, '& img': { maxWidth: '100%', borderRadius: 2 } }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{theoryMap[lesson.id]}</ReactMarkdown>
                      </Box>
                    </Box>
                  )}


                </Box>
              </motion.div>
            ))}
          </motion.div>
        </Box>

        {/* RIGHT COLUMN - Anchor Links & Challenge (fixed overlay) */}
        <Box
          component={motion.div}
          animate={{
            x: showRightPanel ? 0 : '100%',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'fixed',
            right: 0,
            top: 64,
            bottom: 0,
            width: 300,
            zIndex: 50,
            borderLeft: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            pt: 4,
            px: 2,
            pb: 2,
            overflowY: 'auto',
          }}
        >
          <Typography sx={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.4em',
            color: 'text.secondary',
            mb: 2
          }}>
            On this page
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 5 }}>
            {course.content?.filter(l => l.id === activeId).map((lesson) => (
                <Box key={lesson.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'text.primary',
                    flex: 1,
                  }}>
                    {getText(lesson.title)}
                  </Typography>
                  {isLessonCompleted(lesson) ? (
                    <CheckCircle2 size={14} color={theme.palette.success.main} />
                  ) : (
                    <Code2 size={14} color={theme.palette.primary.main} />
                  )}
                </Box>
                <Stack spacing={0.25} sx={{ ml: 1.5, mt: 0.25 }}>
                  {lesson.subTopics?.filter((s: any) => s.type !== 'test').map((sub, i) => (
                    <Button
                      key={i}
                      onClick={() => {
                        setActiveLessonId(lesson.id);
                        const el = document.getElementById(`sub-${lesson.id}-${i}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      disableRipple
                      sx={{
                        justifyContent: 'flex-start',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        color: 'text.secondary',
                        textTransform: 'none',
                        py: 0.2,
                        px: 0,
                        minWidth: 0,
                        '&:hover': { color: '#149eca', bgcolor: 'transparent' }
                      }}
                    >
                      {getText(sub.subtitle)}
                    </Button>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Toggle button for right panel */}
        <Box sx={{ position: 'fixed', right: 0, top: 'calc(50% + 32px)', zIndex: 100, display: { xs: 'none', md: 'block' } }}>
          <motion.div
            animate={{ x: showRightPanel ? -300 : 0, y: '-50%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Button
              onClick={() => setShowRightPanel(prev => !prev)}
              sx={{
                minWidth: 0,
                width: 32,
                height: 64,
                borderRadius: '8px 0 0 8px',
                border: '1px solid',
                borderRight: 'none',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'text.secondary',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', borderColor: 'primary.main' },
              }}
            >
              {showRightPanel ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </Button>
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
}

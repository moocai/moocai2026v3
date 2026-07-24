import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress, useTheme, alpha, Tabs, Tab
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCourse } from '../../hooks/useCourse';
import {useThemeMode} from '../../hooks/useTheme';
import ParticlesBackground from '../../components/ParticlesBackground';
import { courseService } from '../../services/courseService';


type I18nField = { ca: string; es: string; en: string };

export default function CourseLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { data: course, isLoading: loading } = useCourse(courseId);
  const [mainTab, setMainTab] = useState<number>(() => {
    const saved = localStorage.getItem(`mooc_tab_${courseId}`);
    return saved !== null ? JSON.parse(saved) : 0;
  });
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`mooc_expanded_${courseId}`);
    return saved !== null ? new Set(JSON.parse(saved)) : new Set();
  });
  const toggleLessonExpand = (id: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem(`mooc_tab_${courseId}`, JSON.stringify(mainTab));
  }, [mainTab, courseId]);

  useEffect(() => {
    localStorage.setItem(`mooc_expanded_${courseId}`, JSON.stringify([...expandedLessons]));
  }, [expandedLessons, courseId]);
  const getProgressKey = () => {
    const saved = localStorage.getItem('currentStudent');
    const id = saved ? JSON.parse(saved).id : 'temp';
    return `mooc_global_progress_${id}`;
  };
  const [progress, setProgress] = useState<Record<string, boolean | string>>(() =>
    JSON.parse(localStorage.getItem(getProgressKey()) || '{}')
  );
  const reSyncProgress = useCallback(() => {
    setProgress(JSON.parse(localStorage.getItem(getProgressKey()) || '{}'));
  }, []);
  useEffect(() => {
    window.addEventListener('lessonProgressUpdated', reSyncProgress);
    return () => window.removeEventListener('lessonProgressUpdated', reSyncProgress);
  }, [reSyncProgress]);

  const [theoryMap, setTheoryMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!course) return;
    (course.content || []).forEach(lesson => {
      if (theoryMap[lesson.id] !== undefined) return;
      courseService.getTopicBySlug(course.id, lesson.id)
        .then(data => setTheoryMap(prev => ({ ...prev, [lesson.id]: data.theory_md || '' })))
        .catch(() => setTheoryMap(prev => ({ ...prev, [lesson.id]: '' })));
    });
  }, [course]);

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

  const getLessonProgress = (lesson: any): number => {
    const completable = lesson.subTopics?.filter((s: any) => s.type === 'coding' || s.type === 'test') || [];
    if (completable.length === 0) return 0;
    const done = completable.filter((s: any) => {
      const key = `${courseId}_${s.problemSlug || s.slug || lesson.id}`;
      return progress[key] === true;
    });
    return Math.round((done.length / completable.length) * 100);
  };

  const lang = (i18n.language?.split('-')[0] as keyof I18nField) || 'ca';
  const getText = (field: I18nField | string | undefined): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['ca'] || '';
  };

  // Group every lesson's subtopics of a given type, keeping the parent lesson title
  const getLessonsWithType = (type: 'coding' | 'test') =>
    (course?.content || [])
      .map(lesson => ({
        lesson,
        items: (lesson.subTopics || []).filter((s: any) => s.type === type),
      }))
      .filter(({ items }) => items.length > 0);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'hard': return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: '#ef4444' };
      case 'very_hard': return { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: '#dc2626' };
      case 'medium': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: '#f59e0b' };
      case 'easy': return { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: '#22c55e' };
      default: return { color: 'text.secondary', bg: 'transparent', border: 'divider' };
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return t('difficulty.easy', 'Fàcil');
      case 'medium': return t('difficulty.medium', 'Mitjà');
      case 'hard': return t('difficulty.hard', 'Difícil');
      case 'very_hard': return t('difficulty.very_hard', 'Molt difícil');
      default: return '';
    }
  };

  const renderDifficultyChip = (difficulty?: string) => {
    if (!difficulty) return null;
    const { color, bg, border } = getDifficultyColor(difficulty);
    return (
      <Box sx={{
        fontSize: '0.65rem', fontWeight: 700, color,
        border: `1px solid ${border}`, borderRadius: 5,
        px: 1, py: 0.2, textTransform: 'uppercase', letterSpacing: '0.05em',
        bgcolor: bg,
      }}>
        {getDifficultyLabel(difficulty)}
      </Box>
    );
  };

  const renderStatusChip = (status: boolean | string) =>
    status === true ? (
      <CheckCircle2 size={16} color={theme.palette.success.main} />
    ) : status === 'attempted' ? (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b',
        border: '1px solid #f59e0b', borderRadius: 5,
        px: 1, py: 0.2,
      }}>
        <AlertTriangle size={12} />
        {t('lesson.pending_send', 'Pendent per enviar')}
      </Box>
    ) : (
      <Box sx={{
        fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary',
        border: '1px solid', borderColor: 'divider', borderRadius: 5,
        px: 1, py: 0.2, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {t('lesson.pending', 'Pendent')}
      </Box>
    );

  const renderStatusIcon = (status: boolean | string, defaultIcon: string) =>
    status === true ? '✅' : status === 'attempted' ? '⚠️' : defaultIcon;

  const renderStatusWithDifficulty = (status: boolean | string, difficulty?: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {renderDifficultyChip(difficulty)}
      {renderStatusChip(status)}
    </Box>
  );

  const renderOverviewRow = (opts: {
    key: string;
    icon: ReactNode;
    label: string;
    to?: string;
    onClick?: () => void;
    right?: ReactNode;
  }) => {
    const content = (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1, py: 1.25,
        borderBottom: '1px solid', borderColor: 'divider',
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'primary.main' }}>
          {opts.icon}
        </Box>
        <Typography sx={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: 'text.primary' }}>
          {opts.label}
        </Typography>
        {opts.right}
      </Box>
    );
    if (opts.to) {
      return (
        <Box key={opts.key} component={RouterLink} to={opts.to} sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          {content}
        </Box>
      );
    }
    return (
      <Box key={opts.key} onClick={opts.onClick} sx={{ cursor: 'pointer' }}>
        {content}
      </Box>
    );
  };

  if (loading) return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999 }}>
      <CircularProgress color="primary" />
    </Box>
  );

  if (!course) return <Typography>{t('lesson.course_not_found')}</Typography>;

  return (
    <Box sx={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, bgcolor: 'background.default', overflow: 'hidden' }}>
      {mode === 'fancy' && <ParticlesBackground opacityMultiplier={0.4} />}
      <Box sx={{ display: 'flex', height: '100%' }}>
        <Box ref={scrollRef} sx={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: { md: 'none' },
          px: { xs: 3, md: 8 },
          py: 6,
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Course Title */}
            <Typography variant="h2" sx={{
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '2.5rem' },
              letterSpacing: '0.03em',
              mt:3,
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

            {/* Central tabs: Teoria / Programació / Tests / Fitxers */}
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Tabs
              value={mainTab}
              onChange={(_, v) => setMainTab(v)}
              sx={{
                mb: 4,
                minHeight: 0,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTabs-flexContainer': { justifyContent: 'center' },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  minHeight: 0,
                  py: 1.5,
                  px: { xs: 3, md: 5 },
                  color: mode === 'light' ? '#000' : '#fff',
                },
                '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : '#fff !important' },
                '& .MuiTabs-indicator': { bgcolor: '#149eca', height: 3 },
              }}
            >
              <Tab label={t('lesson.tab_theory', 'Teoria')} />
              <Tab label={t('lesson.tab_exercises', 'Programació')} />
              <Tab label={t('lesson.tab_tests', 'Tests')} />
              <Tab label={t('lesson.tab_files', 'Fitxers')} />
            </Tabs>
            </Box>

            {/* TAB 0: Teoria */}
            {mainTab === 0 && (
              <Box sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    disableRipple
                    onClick={() => setExpandedLessons(prev =>
                      prev.size === (course.content?.length || 0)
                        ? new Set()
                        : new Set((course.content || []).map(l => l.id))
                    )}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#149eca' }}
                  >
                    {expandedLessons.size === (course.content?.length || 0)
                      ? t('lesson.collapse_all', 'Col·lapsa-ho tot')
                      : t('lesson.expand_all', 'Expandeix-ho tot')}
                  </Button>
                </Box>

                {(course.content || []).map((lesson: any) => {
                  const isOpen = expandedLessons.has(lesson.id);
                  return (
                    <Box key={lesson.id} sx={{
                      border: '1px solid', borderColor: mode === 'light' ? '#8400ff' : 'divider', borderRadius: 2,
                      mb: 2.5, overflow: 'hidden', bgcolor: 'background.paper',
                    }}>
                      <Box
                        onClick={() => toggleLessonExpand(lesson.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          px: 2.5, py: 2, cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
                            <ChevronDown size={20} />
                          </Box>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                            {getText(lesson.title)}
                          </Typography>
                        </Box>
                      </Box>

                      {isOpen && theoryMap[lesson.id] && (
                        <Box id={`theory-${lesson.id}`} sx={{ px: 2.5, pb: 2.5 }}>
                          <Box sx={{ '& p': { color: 'text.secondary', fontSize: '1rem', lineHeight: 1.8, mb: 2.5 }, '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem' }, '& pre': { bgcolor: '#1a1d23', p: 2.5, borderRadius: 2, overflow: 'auto', '& code': { bgcolor: 'transparent', px: 0, py: 0, fontSize: '0.85rem', color: '#7ee787' } }, '& ul, & ol': { color: 'text.secondary', lineHeight: 1.8, mb: 2.5 }, '& li': { mb: 0.5 }, '& h1, & h2, & h3, & h4, & h5, & h6': { color: 'text.primary', fontWeight: 700, mb: 1.5 }, '& table': { width: '100%', borderCollapse: 'collapse', mb: 2.5 }, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 2, py: 1, textAlign: 'left', color: 'text.secondary' }, '& th': { bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 700, color: 'text.primary' }, '& a': { color: 'primary.main' }, '& blockquote': { borderLeft: '4px solid', borderColor: 'primary.main', pl: 2, py: 0.5, mb: 2.5, color: 'text.secondary', fontStyle: 'italic' }, '& img': { maxWidth: '100%', borderRadius: 2 } }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{theoryMap[lesson.id]}</ReactMarkdown>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* TAB 1: Programació */}
            {mainTab === 1 && (
              <Box sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    disableRipple
                    onClick={() => setExpandedLessons(prev =>
                      prev.size === (course.content?.length || 0) ? new Set() : new Set((course.content || []).map(l => l.id)))}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#149eca' }}
                  >
                    {expandedLessons.size === (course.content?.length || 0)
                      ? t('lesson.collapse_all', 'Col·lapsa-ho tot')
                      : t('lesson.expand_all', 'Expandeix-ho tot')}
                  </Button>
                </Box>

                {getLessonsWithType('coding').length === 0 && (
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    {t('lesson.no_exercises', 'Encara no hi ha exercicis per aquest curs.')}
                  </Typography>
                )}
                {getLessonsWithType('coding').map(({ lesson, items }) => {
                  const isOpen = expandedLessons.has(lesson.id);
                  return (
                    <Box key={lesson.id} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#8400ff' : 'divider', borderRadius: 2, mb: 2.5, overflow: 'hidden', bgcolor: 'background.paper' }}>
                      <Box
                        onClick={() => toggleLessonExpand(lesson.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          px: 2.5, py: 2, cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
                            <ChevronDown size={20} />
                          </Box>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                            {getText(lesson.title)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.secondary' }}>
                          {getLessonProgress(lesson)}%
                        </Typography>
                      </Box>
                      {isOpen && (
                        <Box sx={{ px: 2.5, pb: 1 }}>
                          {items.map((sub: any) => {
                            const key = `${courseId}_${sub.problemSlug || sub.slug}`;
                            return renderOverviewRow({
                              key: `${lesson.id}-ex-${sub.problemSlug || sub.slug}`,
                              icon: <Typography sx={{ fontSize: '1.1rem' }}>{renderStatusIcon(progress[key], '💻')}</Typography>,
                              label: getText(sub.subtitle),
                              to: `/courses/${courseId}/${sub.problemSlug || sub.slug || lesson.id}`,
                              right: renderStatusWithDifficulty(progress[key] || false, sub.difficulty),
                            });
                          })}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* TAB 2: Tests */}
            {mainTab === 2 && (
              <Box sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    disableRipple
                    onClick={() => setExpandedLessons(prev =>
                      prev.size === (course.content?.length || 0)
                        ? new Set()
                        : new Set((course.content || []).map(l => l.id))
                    )}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#149eca' }}
                  >
                    {expandedLessons.size === (course.content?.length || 0)
                      ? t('lesson.collapse_all', 'Col·lapsa-ho tot')
                      : t('lesson.expand_all', 'Expandeix-ho tot')}
                  </Button>
                </Box>

                {getLessonsWithType('test').length === 0 && (
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    {t('lesson.no_tests', 'Encara no hi ha tests per aquest curs.')}
                  </Typography>
                )}
                {getLessonsWithType('test').map(({ lesson, items }) => {
                  const isOpen = expandedLessons.has(lesson.id);
                  return (
                    <Box key={lesson.id} sx={{ border: '1px solid', borderColor: mode === 'light' ? '#8400ff' : 'divider', borderRadius: 2, mb: 2.5, overflow: 'hidden', bgcolor: 'background.paper' }}>
                      <Box
                        onClick={() => toggleLessonExpand(lesson.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          px: 2.5, py: 2, cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
                            <ChevronDown size={20} />
                          </Box>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                            {getText(lesson.title)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.secondary' }}>
                          {getLessonProgress(lesson)}%
                        </Typography>
                      </Box>
                      {isOpen && (
                        <Box sx={{ px: 2.5, pb: 1 }}>
                          {items.map((sub: any) => {
                            const key = `${courseId}_${sub.problemSlug || sub.slug}`;
                            return renderOverviewRow({
                              key: `${lesson.id}-t-${sub.problemSlug || sub.slug}`,
                              icon: <Typography sx={{ fontSize: '1.1rem' }}>{renderStatusIcon(progress[key], '📝')}</Typography>,
                              label: getText(sub.subtitle),
                              to: `/courses/${courseId}/exam/${sub.problemSlug || sub.slug || lesson.id}`,
                              right: renderStatusWithDifficulty(progress[key] || false, sub.difficulty),
                            });
                          })}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* TAB 3: Fitxers */}
            {mainTab === 3 && (
              <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
                <FileText size={40} style={{ opacity: 0.5 }} />
                <Typography sx={{ mt: 2, fontWeight: 600, fontSize: '0.95rem' }}>
                  {t('lesson.no_files', 'Encara no hi ha fitxers disponibles per aquest curs.')}
                </Typography>
              </Box>
            )}
          </motion.div>
        </Box>

      </Box>
    </Box>
  );
}
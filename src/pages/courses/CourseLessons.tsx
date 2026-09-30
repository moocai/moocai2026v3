import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress, useTheme, alpha, Tabs, Tab,
  Menu, MenuItem, ListItemText, useMediaQuery, Divider, Tooltip, IconButton, Stack
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronDown, CheckCircle2, FileText, AlertTriangle, Globe, Lock, UserCheck,
  ChevronRight, ChevronLeft, Check, BookOpen, Code, ClipboardCheck, Folder
} from 'lucide-react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCourse } from '../../hooks/useCourse';
import { useThemeMode } from '../../hooks/useTheme';
import ParticlesBackground from '../../components/ParticlesBackground';
import { courseService } from '../../services/courseService';

type I18nField = { ca: string; es: string; en: string };
type ScopeType = 'public' | 'private' | 'assigned';

const SCOPES: ScopeType[] = ['public', 'private', 'assigned'];

const SCOPE_META: Record<ScopeType, { labelKey: string; fallback: string }> = {
  public: { labelKey: 'courses.scope_public', fallback: 'Públics' },
  private: { labelKey: 'courses.scope_private', fallback: 'Privats' },
  assigned: { labelKey: 'courses.scope_assigned', fallback: 'Assignats' },
};

// Les 4 pestanyes principals (mateix ordre que els índexs de mainTab)
const TAB_ITEMS = [
  { icon: BookOpen, labelKey: 'lesson.tab_theory', fallback: 'Teoria' },
  { icon: Code, labelKey: 'lesson.tab_exercises', fallback: 'Programació' },
  { icon: ClipboardCheck, labelKey: 'lesson.tab_tests', fallback: 'Tests' },
  { icon: Folder, labelKey: 'lesson.tab_files', fallback: 'Fitxers' },
];

function ScopeIcon({ scope }: { scope: ScopeType }) {
  switch (scope) {
    case 'public': return <Globe size={16} />;
    case 'private': return <Lock size={16} />;
    case 'assigned': return <UserCheck size={16} />;
  }
}

export default function CourseLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isTallScreen = useMediaQuery('(min-height: 900px)');
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: course, isLoading: loading } = useCourse(courseId);

  const [scopeAnchor, setScopeAnchor] = useState<null | HTMLElement>(null);
  const [subMenuAnchor, setSubMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeSubMenuScope, setActiveSubMenuScope] = useState<ScopeType | null>(null);

  const [scope, setScope] = useState<ScopeType>('private');
  const [publicCourses, setPublicCourses] = useState<any[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);

  useEffect(() => {
    courseService.getPublicCourses().then(setPublicCourses).catch(() => {});
    courseService.getAllCourses().then(setAssignedCourses).catch(() => {});
  }, []);

  const filterByScope = useCallback((list: any[], currentScope: ScopeType) => {
    if (currentScope === 'public') return list.filter(c => c.isPublic);
    if (currentScope === 'private') return list.filter(c => !c.isPublic);
    return list;
  }, []);

  const visibleCourses = filterByScope(scope === 'public' ? publicCourses : assignedCourses, scope);

  const handleSelectCourse = (option: ScopeType, targetCourseId: string) => {
    setScope(option);
    setSubMenuAnchor(null);
    setScopeAnchor(null);
    setActiveSubMenuScope(null);
    navigate(`/courses/${targetCourseId}`);
  };

  const [mainTab, setMainTab] = useState<number>(() => {
    const saved = localStorage.getItem(`mooc_tab_${courseId}`);
    return saved !== null ? JSON.parse(saved) : 0;
  });

  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`mooc_expanded_${courseId}`);
    return saved !== null ? new Set(JSON.parse(saved)) : new Set();
  });

  // Ordre en què s'han completat les lliçons de teoria (la darrera completada va al final)
  const [doneOrder, setDoneOrder] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mooc_done_order_${courseId}`) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (courseId) {
      localStorage.setItem(`mooc_done_order_${courseId}`, JSON.stringify(doneOrder));
    }
  }, [doneOrder, courseId]);

  const toggleLessonExpand = (id: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    const allIds = (course?.content || []).map(l => l.id);
    setExpandedLessons(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  };

  useEffect(() => {
    if (courseId) {
      localStorage.setItem(`mooc_tab_${courseId}`, JSON.stringify(mainTab));
    }
  }, [mainTab, courseId]);

  useEffect(() => {
    if (courseId) {
      localStorage.setItem(`mooc_expanded_${courseId}`, JSON.stringify([...expandedLessons]));
    }
  }, [expandedLessons, courseId]);

  const getProgressKey = useCallback(() => {
    const saved = localStorage.getItem('currentStudent');
    const id = saved ? JSON.parse(saved).id : 'temp';
    return `mooc_global_progress_${id}`;
  }, []);

  const [progress, setProgress] = useState<Record<string, boolean | string>>(() =>
    JSON.parse(localStorage.getItem(getProgressKey()) || '{}')
  );

  const reSyncProgress = useCallback(() => {
    setProgress(JSON.parse(localStorage.getItem(getProgressKey()) || '{}'));
  }, [getProgressKey]);

  useEffect(() => {
    window.addEventListener('lessonProgressUpdated', reSyncProgress);
    return () => window.removeEventListener('lessonProgressUpdated', reSyncProgress);
  }, [reSyncProgress]);

  const [theoryMap, setTheoryMap] = useState<Record<string, string>>({});

  // Càrrega de la teoria de cada lliçó fent ús directe del servei courseService
  useEffect(() => {
    if (!course || !course.content) return;
    course.content.forEach((lesson: any) => {
      courseService.getTopicBySlug(course.id, lesson.id)
        .then(data => {
          const markdownValue = data?.theory_md || '';
          setTheoryMap(prev => ({ ...prev, [lesson.id]: markdownValue }));
        })
        .catch(() => {
          setTheoryMap(prev => ({ ...prev, [lesson.id]: '' }));
        });
    });
  }, [course]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll_${courseId}`);
    if (saved && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo(0, parseInt(saved, 10));
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

  const [tabsEl, setTabsEl] = useState<HTMLDivElement | null>(null);
  const [showRail, setShowRail] = useState(false);
  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const getTabsScroller = () =>
    (tabsListRef.current?.querySelector('.MuiTabs-scroller') as HTMLElement | null) ?? null;

  useEffect(() => {
    const scroller = getTabsScroller();
    if (!scroller) return;
    const update = () => {
      setCanScrollLeft(scroller.scrollLeft > 1);
      setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
    // Es reexecuta en canviar de secció perquè el <Tabs> es remunta.
  }, [mainTab, isXs]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!tabsEl || !root) {
      setShowRail(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0;
        setShowRail(!entry.isIntersecting && entry.boundingClientRect.top < rootTop);
      },
      { root, threshold: 0 }
    );
    observer.observe(tabsEl);
    return () => observer.disconnect();
  }, [tabsEl]);

  const handleRailTabClick = (index: number) => {
    setMainTab(index);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const markLessonAsDone = (lessonId: string) => {
    const key = `${courseId}_theory_${lessonId}`;
    const newProgress = { ...progress, [key]: true };
    setProgress(newProgress);
    const student = localStorage.getItem('currentStudent');
    const sId = student ? JSON.parse(student).id : 'temp';
    localStorage.setItem(`mooc_global_progress_${sId}`, JSON.stringify(newProgress));
    window.dispatchEvent(new Event('lessonProgressUpdated'));

    // La lliçó completada passa al final de la llista
    setDoneOrder(prev => [...prev.filter(id => id !== lessonId), lessonId]);
    // ...i es tanca automàticament
    setExpandedLessons(prev => {
      const next = new Set(prev);
      next.delete(lessonId);
      return next;
    });
    // Tornem a dalt perquè l'usuari vegi la següent lliçó pendent
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const contentCount = course.content?.length || 0;
  const isAllExpanded = expandedLessons.size === contentCount;

  // Lliçons de teoria: primer les pendents (ordre original) i després les completades
  // (segons l'ordre en què s'han completat; les que ja ho estaven abans mantenen l'ordre original).
  const isTheoryDone = (lessonId: string) => progress[`${courseId}_theory_${lessonId}`] === true;
  const allLessons: any[] = course.content || [];
  const theoryLessons = [
    ...allLessons.filter(l => !isTheoryDone(l.id)),
    ...allLessons
      .filter(l => isTheoryDone(l.id))
      .sort((a, b) => doneOrder.indexOf(a.id) - doneOrder.indexOf(b.id)),
  ];

  const scrollTabs = (dir: -1 | 1) => {
    const scroller = getTabsScroller();
    if (!scroller) return;
    scroller.scrollBy({ left: dir * Math.max(160, scroller.clientWidth * 0.8), behavior: 'smooth' });
  };

  // Fletxes de desplaçament. Viuen com a germans de les pestanyes, no com a
  // scrollButtons de MUI (que van superposats i es menjaven el text).
  const navArrow = (dir: -1 | 1) => {
    const disabled = dir === -1 ? !canScrollLeft : !canScrollRight;
    const canScroll = !disabled;
    return (
      <IconButton
        onClick={() => scrollTabs(dir)}
        disabled={disabled}
        aria-label={dir === -1 ? t('lesson.tab_prev', 'Pestanya anterior') : t('lesson.tab_next', 'Pestanya següent')}
        sx={{
          display: { xs: 'inline-flex', md: 'none' },
          flexShrink: 0, width: 40, height: 40, p: 0,
          borderRadius: 999,
          color: canScroll ? '#8400ff' : alpha('#8400ff', 1),
          bgcolor: canScroll ? 'transparent' : alpha('#8400ff', 1),
          '&:hover': { bgcolor: canScroll ? 'transparent' : alpha('#fff', 0) },
          '&.Mui-disabled': { color: alpha('#fff', 0) },
        }}
      >
        {dir === -1 ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
      </IconButton>
    );
  };

  const renderTabs = () => (
    /* A xs la barra va de vora a vora: marges negatius que compensen el
       pl:3 / pr:7.5 del contenidor de scroll (pr:7.5 reserva el rail).
       Sense width:'100%' perquè un 100% fixe deixaria el marge dret. */
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: 'center',
        ml: { xs: -3, md: 0 },
        mr: { xs: -6, md: 0 },
      }}
    >
      {navArrow(-1)}
      <Box ref={setTabsEl} sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center'}}>
        <Tabs
          ref={tabsListRef}
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          variant={isXs ? 'scrollable' : 'standard'}
          sx={{
            mb: 4, minHeight: 0, borderBottom: '1px solid', borderColor: 'divider',

            '& .MuiTabs-list': {
              justifyContent: { xs: 'flex-start' },
            },
            '& .MuiTab-root': {
                textTransform: 'none', fontWeight: 900,
                fontSize: { xs: '1.2rem', md: '0.95rem' },
                minHeight: { xs: 60, md: 0 },          // més alçada a mòbil
                minWidth: { xs: 50, md: 90 },           // MUI posa 90px per defecte i ocupa espai
                py: { xs: 2, md: 1.5 },
                px: { xs: 1.75, md: 5 }, 
                color: mode === 'light' ? '#000' : '#fff',
              },
            '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : '#fff !important' },
            '& .MuiTabs-indicator': { bgcolor: '#8400ff', height: { xs: 4, md: 3}},
          }}
        >
          {TAB_ITEMS.map(({ labelKey, fallback }) => (
            <Tab key={labelKey} label={t(labelKey, fallback)} />
          ))}
        </Tabs>
      </Box>
      {navArrow(1)}
    </Stack>
  );

  const renderExpandAll = () => (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
      <Button
        disableRipple
        onClick={handleToggleAll}
        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#149eca' }}
      >
        {isAllExpanded ? t('lesson.collapse_all', 'Col·lapsa-ho tot') : t('lesson.expand_all', 'Expandeix-ho tot')}
      </Button>
    </Box>
  );

  return (
    <Box sx={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, bgcolor: 'background.default', overflow: 'hidden' }}>
      {mode === 'fancy' && <ParticlesBackground opacityMultiplier={0.4} />}
      <Box sx={{ display: 'flex', height: '100%' }}>
        <Box ref={scrollRef} sx={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: { md: 'none' },
          pl: { xs: 3, md: 8 },
          pr: { xs: 7.5, md: 10 },
          py: 6,
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            <Box sx={{
              display: 'inline-flex', alignItems: 'center', mb: 3, mt: isTallScreen ? 2 : 0,
              bgcolor: 'background.paper', borderRadius: 999, border: '2px solid', borderColor: '#00685d', px: { xs: 2, md: 3 },
              flexWrap: 'wrap', maxWidth: '100%',
            }}>
              <Button
                onClick={(e) => setScopeAnchor(e.currentTarget)}
                aria-haspopup="menu"
                aria-expanded={Boolean(scopeAnchor)}
                startIcon={<ScopeIcon scope={scope} />}
                endIcon={<ExpandMoreIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: scopeAnchor ? 'rotate(180deg)' : 'none' }} />}
                sx={{
                  textTransform: 'none', fontWeight: 800, fontSize: { xs: '0.9rem', md: '1rem' },
                  color: '#00A896', minWidth: 0, flexShrink: 0, py: 0.75, pr: 0.5,
                }}
              >
                {t(SCOPE_META[scope].labelKey, SCOPE_META[scope].fallback)}
                <Typography component="span" sx={{ ml: 1, px: 1, borderRadius: 999, bgcolor: 'action.hover', fontSize: '0.75rem', fontWeight: 900 }}>
                  {visibleCourses.length}
                </Typography>
              </Button>

              <Menu
                anchorEl={scopeAnchor}
                open={Boolean(scopeAnchor)}
                onClose={() => {
                  setScopeAnchor(null);
                  setSubMenuAnchor(null);
                  setActiveSubMenuScope(null);
                }}
                slotProps={{ paper: { sx: { bgcolor: 'background.paper', minWidth: 220 } } }}
              >
                {SCOPES.map((option, idx) => {
                  const source = option === 'public' ? publicCourses : assignedCourses;
                  const matchingCourses = filterByScope(source, option);
                  const isSelectedScope = activeSubMenuScope === option;

                  return (
                    <Box key={option}>
                      {idx > 0 && <Divider sx={{ my: 0.5 }} />}
                      <MenuItem
                        onClick={(e) => {
                          setSubMenuAnchor(e.currentTarget);
                          setActiveSubMenuScope(option);
                        }}
                        sx={{
                          fontWeight: 800, py: 1.25, display: 'flex', justifyContent: 'space-between',
                          bgcolor: isSelectedScope ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <ScopeIcon scope={option} />
                          <ListItemText primary={t(SCOPE_META[option].labelKey, SCOPE_META[option].fallback)} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {matchingCourses.length}
                          </Typography>
                          <ChevronRight size={16} />
                        </Box>
                      </MenuItem>
                    </Box>
                  );
                })}
              </Menu>

              <Menu
                anchorEl={subMenuAnchor}
                open={Boolean(subMenuAnchor) && Boolean(activeSubMenuScope)}
                onClose={() => {
                  setSubMenuAnchor(null);
                  setActiveSubMenuScope(null);
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                  paper: {
                    sx: { bgcolor: 'background.paper', minWidth: 260, maxHeight: '60vh', overflowY: 'auto', ml: 1 }
                  }
                }}
              >
                {activeSubMenuScope && filterByScope(
                  activeSubMenuScope === 'public' ? publicCourses : assignedCourses,
                  activeSubMenuScope
                ).map((c: any) => {
                  const isCurrentCourse = c.id === courseId;
                  return (
                    <MenuItem
                      key={c.id}
                      onClick={() => handleSelectCourse(activeSubMenuScope, c.id)}
                      sx={{
                        py: 1.25,
                        bgcolor: isCurrentCourse ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                        fontWeight: isCurrentCourse ? 700 : 400,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography sx={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getText(c.title)}
                          </Typography>
                        }
                      />
                    </MenuItem>
                  );
                })}
              </Menu>
            </Box>

            <Typography variant="h2" sx={{
              fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.5rem' },
              letterSpacing: '0.03em', mt: 1, mb: 2, lineHeight: 1.1
            }}>
              {getText(course.title)}
            </Typography>

            <Typography sx={{ color: 'text.secondary', fontSize: '1.4rem', lineHeight: 1.7, mb: 6, maxWidth: '900px' }}>
              {getText(course.description)}
            </Typography>

            {mainTab === 0 && (
              <Box sx={{ mb: 6 }}>
                {renderTabs()}
                {renderExpandAll()}
                {theoryLessons.map((lesson: any) => {
                  const isOpen = expandedLessons.has(lesson.id);
                  const isDone = progress[`${courseId}_theory_${lesson.id}`] === true;
                  return (
                    <Box key={lesson.id} sx={{
                      border: '1px solid', borderColor: 'divider', borderRadius: 2,
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
                        {isDone && <CheckCircle2 size={18} color={theme.palette.success.main} />}
                      </Box>

                      {isOpen && (
                        <Box id={`theory-${lesson.id}`} sx={{ px: 2.5, pb: 2.5 }}>
                          {lesson.subTopics && lesson.subTopics.length > 0 && (
                            <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {lesson.subTopics.map((sub: any) => {
                                const subTitle = getText(sub.title);
                                if (!subTitle) return null;
                                return (
                                  <Button
                                    key={sub.id || sub.slug}
                                    component={RouterLink}
                                    to={`/courses/${courseId}/${lesson.id}/topic`}
                                    variant="outlined"
                                    size="small"
                                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                                  >
                                    {subTitle}
                                  </Button>
                                );
                              })}
                            </Box>
                          )}

                          {theoryMap[lesson.id] ? (
                            <Box
                              sx={{ '& p': { color: 'text.secondary', fontSize: '1rem', lineHeight: 1.8, mb: 2.5 }, '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem' }, '& pre': { bgcolor: '#1a1d23', p: 2.5, borderRadius: 2, overflow: 'auto', '& code': { bgcolor: 'transparent', px: 0, py: 0, fontSize: '0.85rem', color: '#7ee787' } }, '& ul, & ol': { color: 'text.secondary', lineHeight: 1.8, mb: 2.5 }, '& li': { mb: 0.5 }, '& h1, & h2, & h3, & h4, & h5, & h6': { color: 'text.primary', fontWeight: 700, mb: 1.5 }, '& table': { width: '100%', borderCollapse: 'collapse', mb: 2.5 }, '& th, & td': { border: '1px solid', borderColor: 'divider', px: 2, py: 1, textAlign: 'left', color: 'text.secondary' }, '& th': { bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 700, color: 'text.primary' }, '& a': { color: 'primary.main' }, '& blockquote': { borderLeft: '4px solid', borderColor: 'primary.main', pl: 2, py: 0.5, mb: 2.5, color: 'text.secondary', fontStyle: 'italic' }, '& img': { maxWidth: '100%', borderRadius: 2 } }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {theoryMap[lesson.id]}
                              </ReactMarkdown>
                            </Box>
                          ) : (
                            <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', mb: 2 }}>
                              {t('lesson.no_theory_content', "No hi ha contingut teòric detallat per a aquesta lliçó.")}
                            </Typography>
                          )}

                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Button
                              variant={isDone ? "outlined" : "contained"}
                              color={isDone ? "success" : "primary"}
                              onClick={() => markLessonAsDone(lesson.id)}
                              startIcon={<Check size={16} />}
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              {isDone ? t('lesson.completed', 'Completat') : t('lesson.mark_as_done', 'Marca com a completat')}
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {mainTab === 1 && (
              <Box sx={{ mb: 6 }}>
                {renderTabs()}
                {renderExpandAll()}
                {getLessonsWithType('coding').length === 0 && (
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    {t('lesson.no_exercises', 'Encara no hi ha exercicis per aquest curs.')}
                  </Typography>
                )}
                {getLessonsWithType('coding').map(({ lesson, items }) => {
                  const isOpen = expandedLessons.has(lesson.id);
                  return (
                    <Box key={lesson.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2.5, overflow: 'hidden', bgcolor: 'background.paper' }}>
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
                            const key = `${courseId}_${sub.problemSlug || sub.slug || lesson.id}`;
                            const targetSlug = sub.slug || sub.problemSlug || lesson.id;
                            return renderOverviewRow({
                              key: `${lesson.id}-ex-${targetSlug}`,
                              icon: <Typography sx={{ fontSize: '1.1rem' }}>{renderStatusIcon(progress[key], '💻')}</Typography>,
                              label: getText(sub.subtitle || sub.title),
                              to: `/courses/${courseId}/${targetSlug}`,
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

            {mainTab === 2 && (
              <Box sx={{ mb: 6 }}>
                {renderTabs()}
                {renderExpandAll()}
                {getLessonsWithType('test').length === 0 && (
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    {t('lesson.no_tests', 'Encara no hi ha tests per aquest curs.')}
                  </Typography>
                )}
                {getLessonsWithType('test').map(({ lesson, items }) => {
                  const isOpen = expandedLessons.has(lesson.id);
                  return (
                    <Box key={lesson.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2.5, overflow: 'hidden', bgcolor: 'background.paper' }}>
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
                            const key = `${courseId}_${sub.problemSlug || sub.slug || lesson.id}`;
                            const targetSlug = sub.slug || sub.problemSlug || lesson.id;
                            return renderOverviewRow({
                              key: `${lesson.id}-t-${targetSlug}`,
                              icon: <Typography sx={{ fontSize: '1.1rem' }}>{renderStatusIcon(progress[key], '📝')}</Typography>,
                              label: getText(sub.subtitle || sub.title),
                              to: `/courses/${courseId}/exam/${targetSlug}`,
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

            {mainTab === 3 && (
              <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
                {renderTabs()}
                <FileText size={40} style={{ opacity: 0.5 }} />
                <Typography sx={{ mt: 2, fontWeight: 600, fontSize: '0.95rem' }}>
                  {t('lesson.no_files', 'Encara no hi ha fitxers disponibles per aquest curs.')}
                </Typography>
              </Box>
            )}
          </motion.div>
        </Box>
      </Box>

      {/* Menú vertical flotant: apareix quan les pestanyes de dalt surten de la pantalla */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 6, md: 20 },
          top: '50%',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          p: 0.5,
          borderRadius: 999,
          bgcolor: alpha(theme.palette.background.paper, 0.85),
          backdropFilter: 'blur(8px)',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 3,
          transition: 'opacity 0.25s, transform 0.25s',
          opacity: showRail ? 1 : 0,
          transform: showRail ? 'translateY(-50%)' : 'translate(24px, -50%)',
          pointerEvents: showRail ? 'auto' : 'none',
        }}
      >
        {TAB_ITEMS.map(({ icon: Icon, labelKey, fallback }, index) => {
          const active = mainTab === index;
          return (
            <Tooltip key={labelKey} title={t(labelKey, fallback)} placement="left">
              <Box
                component="button"
                type="button"
                aria-label={t(labelKey, fallback)}
                onClick={() => handleRailTabClick(index)}
                sx={{
                  width: { xs: 36, md: 44 },
                  height: { xs: 36, md: 44 },
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', borderRadius: '50%', cursor: 'pointer',
                  bgcolor: active ? '#8400ff' : 'transparent',
                  color: active ? '#fff' : 'text.secondary',
                  transition: 'background-color 0.2s, color 0.2s',
                  '&:hover': { bgcolor: active ? '#8400ff' : alpha(theme.palette.primary.main, 0.12) },
                }}
              >
                <Icon size={20} />
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
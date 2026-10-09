import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {Box, Typography, Button, CircularProgress, useTheme, alpha, Tabs, Tab, Menu, MenuItem, ListItemText, useMediaQuery, Divider, Tooltip, IconButton, Stack} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {CheckCircle2, XCircle, FileText, Download, Star, AlertTriangle, Globe, Lock, UserCheck, ChevronRight, ChevronLeft, Check, BookOpen, Code, ClipboardCheck, Folder, List as ListIcon} from 'lucide-react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCourse } from '../../hooks/useCourse';
import { useThemeMode } from '../../hooks/useTheme';
import ParticlesBackground from '../../components/ParticlesBackground';
import { courseService } from '../../services/courseService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { problemDetailQuery, resolveSlug } from '../../hooks/useCourse';
import { preloadMonaco } from '../../utils/monaco';
import { useAllCourses, usePublicCourses } from '../../hooks/useCourses';
import { answerKey, isLoggedIn, readAllSavedAnswers, syncTopicAnswers } from '../../services/topicTestAnswers';

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

type TopicNavItem = { id: string; title: string; done?: boolean; percent?: number; current?: boolean };
type TopicFile = { id: number; name: string };

function ScopeIcon({ scope }: { scope: ScopeType }) {switch (scope) {case 'public': return <Globe size={16} />; case 'private': return <Lock size={16} />; case 'assigned': return <UserCheck size={16} />;}}

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Llistes de cursos per al selector: només la de l'àmbit del curs actual (per al
  // recompte del botó) i, quan s'obre el menú, totes. Si el detall no diu si el curs
  // és públic, es demanen les dues per deduir-ho.
  const publicFlag: boolean | undefined = course?.is_public ?? course?.isPublic;
  const scopeKnown = typeof publicFlag === 'boolean';
  const switcherOpen = scopeAnchor != null;
  const publicQuery = usePublicCourses(!!course && (switcherOpen || !scopeKnown || publicFlag === true));
  const assignedQuery = useAllCourses(!!course && isLoggedIn() && (switcherOpen || !scopeKnown || publicFlag === false));
  const publicCourses: any[] = publicQuery.data ?? [];
  const assignedCourses: any[] = assignedQuery.data ?? [];

  const filterByScope = useCallback((list: any[], currentScope: ScopeType) => {
    if (currentScope === 'public') return list.filter(c => c.isPublic);
    if (currentScope === 'private') return list.filter(c => !c.isPublic);
    return list;
  }, []);

  const scope: ScopeType = useMemo(() => {
    if (scopeKnown) return publicFlag ? 'public' : 'private';
    const listed = [...publicCourses, ...assignedCourses].find(
      (c) => c.id === courseId || c.slug === courseId
    );
    return listed?.isPublic ? 'public' : 'private';
  }, [scopeKnown, publicFlag, courseId, publicCourses, assignedCourses]);

  const visibleCourses = filterByScope(scope === 'public' ? publicCourses : assignedCourses, scope);

  const handleSelectCourse = (targetCourseId: string) => {
    setSubMenuAnchor(null);
    setScopeAnchor(null);
    setActiveSubMenuScope(null);
    navigate(`/courses/${targetCourseId}`);
  };

  const [mainTab, setMainTab] = useState<number>(() => {
    const saved = localStorage.getItem(`mooc_tab_${courseId}`);
    return saved !== null ? JSON.parse(saved) : 0;
  });

  useEffect(() => {if (courseId) {localStorage.setItem(`mooc_tab_${courseId}`, JSON.stringify(mainTab));}}, [mainTab, courseId]);

  const getProgressKey = useCallback(() => {
    const saved = localStorage.getItem('currentStudent');
    const id = saved ? JSON.parse(saved).id : 'temp';
    return `mooc_global_progress_${id}`;
  }, []);

  const [progress, setProgress] = useState<Record<string, boolean | string>>(() =>
    JSON.parse(localStorage.getItem(getProgressKey()) || '{}')
  );

  // Respostes dels tests (font de l'estat dels tests: correcte / incorrecte / pendent)
  const [savedTestAnswers, setSavedTestAnswers] = useState(() => readAllSavedAnswers());

  const reSyncProgress = useCallback(() => {
    setProgress(JSON.parse(localStorage.getItem(getProgressKey()) || '{}'));
    setSavedTestAnswers(readAllSavedAnswers());
  }, [getProgressKey]);

  useEffect(() => {
    window.addEventListener('lessonProgressUpdated', reSyncProgress);
    return () => window.removeEventListener('lessonProgressUpdated', reSyncProgress);
  }, [reSyncProgress]);

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

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(() => {try {const saved = localStorage.getItem(`mooc_selected_topic_${courseId}`); return saved ? JSON.parse(saved) : null;} catch {return null;}});
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const selectTopic = (id: string) => {
    setSelectedTopicId(id);
    setMobileNavOpen(false);
    setFileError(null);
    try {
      localStorage.setItem(`mooc_selected_topic_${courseId}`, JSON.stringify(id));
    } catch {}
    requestAnimationFrame(() => {
      const el = contentRef.current;
      const root = scrollRef.current;
      if (el && root && el.getBoundingClientRect().top < root.getBoundingClientRect().top) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const [tabsEl, setTabsEl] = useState<HTMLDivElement | null>(null);
  const [showRail, setShowRail] = useState(false);
  const tabsListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {const root = scrollRef.current;if (!tabsEl || !root) {setShowRail(false); return;}
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

    const lessons: any[] = course?.content || [];
    const idx = lessons.findIndex((l: any) => l.id === lessonId);
    const next = [...lessons.slice(idx + 1), ...lessons.slice(0, Math.max(idx, 0))]
      .find((l: any) => l.id !== lessonId && newProgress[`${courseId}_theory_${l.id}`] !== true);
    if (next) selectTopic(next.id);
    else scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // % de problemes resolts del tema; `undefined` si el tema no té problemes (no hi ha res a completar)
  const getLessonProgress = (lesson: any): number | undefined => {
    const completable = lesson.subTopics?.filter((s: any) => s.type === 'coding' || s.type === 'test') || [];
    if (completable.length === 0) return undefined;
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
      <Box sx={{fontSize: '0.65rem', fontWeight: 700, color,border: `1px solid ${border}`, borderRadius: 5, px: 1, py: 0.2, textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: bg}}>
        {getDifficultyLabel(difficulty)}
      </Box>
    );
  };

  const renderStatusChip = (status: boolean | string) =>
    status === true ? (
      <CheckCircle2 size={16} color={theme.palette.success.main} />
    ) : status === 'wrong' ? (
      // Test respost i incorrecte (un test només té un intent: no està pendent de res)
      <XCircle size={16} color={theme.palette.error.main} aria-label={t('lesson.test_wrong', 'Incorrecte')} />
    ) : status === 'attempted' ? (
      <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b',border: '1px solid #f59e0b', borderRadius: 5,px: 1, py: 0.2,}}>
        <AlertTriangle size={12} />
        {t('lesson.pending_send', 'Pendent per enviar')}
      </Box>
    ) : (
      <Box sx={{fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary',border: '1px solid', borderColor: 'divider', borderRadius: 5,px: 1, py: 0.2, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {t('lesson.pending', 'Pendent')}
      </Box>
    );

  const renderStatusIcon = (status: boolean | string, defaultIcon: string) =>
    status === true ? '✅' : status === 'wrong' ? '❌' : status === 'attempted' ? '⚠️' : defaultIcon;

  const renderStatusWithDifficulty = (status: boolean | string, difficulty?: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {renderDifficultyChip(difficulty)}
      {renderStatusChip(status)}
    </Box>
  );

  const renderOverviewRow = (opts: {key: string; icon: ReactNode; label: string; to?: string; onClick?: () => void; right?: ReactNode; onIntent?: () => void;}) => {
    const content = (
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5,px: 1, py: 1.25, borderBottom: '1px solid', borderColor: 'divider','&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) }}}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'primary.main' }}>{opts.icon}</Box>
        <Typography sx={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: 'text.primary' }}>{opts.label}</Typography>{opts.right}</Box>
    );
    if (opts.to) {
      return (<Box key={opts.key} component={RouterLink} to={opts.to} onMouseEnter={opts.onIntent} onFocus={opts.onIntent} onTouchStart={opts.onIntent} sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{content}</Box>);}
      return (<Box key={opts.key} onClick={opts.onClick} sx={{ cursor: 'pointer' }}>{content}</Box>);
  };

  // Pestanya Tests: amb sessió, porta del servidor l'estat dels tests del tema actiu (així es
  // veu bé en qualsevol navegador). Llista del tema fresca (1 petició) + GET submissions només
  // dels tests ja resposts que no tenim desats.
  const queryClient = useQueryClient();
  // Pestanya Programació: es descarrega l'editor de codi (Monaco) en segon pla,
  // així en obrir un problema l'editor apareix sense esperes.
  useEffect(() => { if (mainTab === 1) preloadMonaco(); }, [mainTab]);
  const syncTopicId = mainTab === 2 && course?.content?.length
    ? ((course.content as any[]).find((l: any) => l.id === selectedTopicId) ?? course.content[0])?.id
    : undefined;
  // Teoria i Fitxers: detall (teoria + fitxers) només del tema obert, no de tots els temes
  const detailTopicId: string | undefined = (mainTab === 0 || mainTab === 3) && course?.content?.length
    ? ((course.content as any[]).find((l: any) => l.id === selectedTopicId) ?? course.content[0])?.id
    : undefined;
  const topicDetailQuery = useQuery<{ theory: string; files: TopicFile[] }>({
    queryKey: ['topic-detail', course?.id, detailTopicId, lang],
    queryFn: () => courseService.getTopicBySlug(course!.id, detailTopicId!).then((d) => ({
      theory: d?.theory_md || '',
      files: Array.isArray(d?.files) ? d.files : [],
    })),
    enabled: !!course?.id && !!detailTopicId,
    staleTime: 30 * 60 * 1000,
  });

  const downloadFile = async (file: TopicFile) => {
    if (!course?.id) return;
    // Descarregar un fitxer demana sessió (encara que el curs sigui públic)
    if (!isLoggedIn()) { setFileError(t('lesson.file_login_required', 'Inicia sessió per descarregar els fitxers.')); return; }
    setDownloadingFileId(file.id);
    setFileError(null);
    try {
      const blob = await courseService.downloadFile(course.id, file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setFileError(t('lesson.file_download_error', "No s'ha pogut descarregar el fitxer."));
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Amb el backend nou l'estructura del curs ja porta la resposta pròpia de cada test
  // (`my_solution`, aplicada en carregar-la): no cal tornar a demanar el tema.
  const outlineHasSolutions = !!course?.content?.some((l: any) => (l.subTopics || []).some((s: any) => s.mySolution !== undefined));
  useEffect(() => {
    if (!courseId || !syncTopicId || !isLoggedIn() || outlineHasSolutions) return;
    const courseSlug = resolveSlug(courseId);
    queryClient.fetchQuery({
      queryKey: ['topic-problems', courseSlug, syncTopicId],
      queryFn: () => courseService.getTopicProblems(courseSlug, syncTopicId),
      staleTime: 0,
    }).then((problems: any[]) => syncTopicAnswers(courseId, courseSlug, syncTopicId, problems))
      .catch(() => {});
  }, [courseId, syncTopicId, queryClient, outlineHasSolutions]);

  if (loading) return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 9999 }}>
      <CircularProgress color="primary" />
    </Box>
  );

  if (!course) return <Typography>{t('lesson.course_not_found')}</Typography>;

  const isTheoryDone = (lessonId: string) => progress[`${courseId}_theory_${lessonId}`] === true;
  const allLessons: any[] = course.content || [];
  const isFirstTab = mainTab === 0; const isLastTab = mainTab === TAB_ITEMS.length - 1;

  const handleTabArrow = (dir: -1 | 1) => {
    const target = Math.min(Math.max(mainTab + dir, 0), TAB_ITEMS.length - 1);
    if (target === mainTab) return;
    setMainTab(target);
    const scroller = tabsListRef.current?.querySelector('.MuiTabs-scroller') as HTMLElement | null;
    const tab = tabsListRef.current?.querySelectorAll('[role="tab"]')[target] as HTMLElement | undefined;
    if (scroller && tab) {
      const delta = tab.getBoundingClientRect().left - scroller.getBoundingClientRect().left - (scroller.clientWidth - tab.offsetWidth) / 2;
      if (delta) scroller.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const navArrow = (dir: -1 | 1) => {
    const disabled = dir === -1 ? isFirstTab : isLastTab;
    const atStart = isFirstTab;
    const atEnd = isLastTab;
    const color = dir === -1 ? (atStart ? '#8400ff' : '#fff') : (atEnd ? '#8400ff' : '#fff');
    return (
      <IconButton onClick={() => handleTabArrow(dir)}  disabled={disabled}  aria-label={dir === -1 ? t('lesson.tab_prev', 'Pestanya anterior') : t('lesson.tab_next', 'Pestanya següent')}
      sx={{display: { xs: 'inline-flex', md: 'none' }, flexShrink: 0, width: 40, height: 40, p: 0,borderRadius: 999, color,'&.Mui-disabled': { color }}} >
        {dir === -1 ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
      </IconButton>
    );
  };

  const renderTabs = () => (
    <Stack direction="row" spacing={0.5} sx={{alignItems: 'center', ml: { xs: -3, md: 0}, mr: { xs: -6, md: 0 }, mt:{lg:3}}}>
      {navArrow(-1)}
      <Box ref={setTabsEl} sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center'}}>
        <Tabs
          ref={tabsListRef}
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          variant={isXs ? 'scrollable' : 'standard'}
          sx={{ mb: { xs: 4, lg: 8 }, minHeight: 0, borderBottom: '1px solid', borderColor: 'divider', '& .MuiTabs-list': {justifyContent: { xs: 'flex-start' }},
            '& .MuiTab-root': {textTransform: 'none', fontWeight: 900,fontSize: { xs: '1.2rem', md: '0.95rem', lg: '1.3rem'}, minHeight: { xs: 60, md: 0 }, minWidth: { xs: 50, md: 90 },py: { xs: 2, md: 1.5}, px: { xs: 1.75, md: 7, lg:8},color: mode === 'light' ? '#000' : '#fff',},
            '& .Mui-selected': { color: mode === 'light' ? '#000 !important' : '#fff !important' },
            '& .MuiTabs-indicator': { bgcolor: '#8400ff', height: { xs: 4, md: 3}},
          }}>
          {TAB_ITEMS.map(({ labelKey, fallback }) => (<Tab key={labelKey} label={t(labelKey, fallback)} />))}
        </Tabs>
      </Box>
      {navArrow(1)}
    </Stack>
  );

  const markdownSx = { '& p': { color: 'text.secondary', fontSize: '1rem', lineHeight: 2, mb: 2.5 }, '& code': { bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.8, py: 0.2, borderRadius: 1, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.85rem' }, '& pre': { bgcolor: '#1a1d23', p: 2.5, borderRadius: 2, overflow: 'auto', '& code': { bgcolor: 'transparent', px: 0, py: 0, fontSize: '0.85rem', color: '#7ee787' } }, '& ul, & ol': { color: 'text.secondary', lineHeight: 1.8, mb: 2.5 }, '& li': { mb: 0.5 }, '& h1, & h2, & h3, & h4, & h5, & h6': { color: 'text.primary', fontWeight: 700, mb: 1.5 }, '& table': { width: '100%', maxWidth: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', mb: 2.5 }, '& th, & td': { border: '1px solid', borderColor: 'divider', px: { xs: 1, md: 2 }, py: 1, textAlign: 'left', color: 'text.secondary', overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: { xs: '0.8rem', md: '0.875rem' } }, '& th': { bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 700, color: 'text.primary' }, '& a': { color: 'primary.main' }, '& blockquote': { borderLeft: '4px solid', borderColor: 'primary.main', pl: 2, py: 0.5, mb: 2.5, color: 'text.secondary', fontStyle: 'italic' }, '& img': { maxWidth: '100%', borderRadius: 2 } };

  const renderTopicButtons = (items: TopicNavItem[], activeId?: string) =>
    items.map((item) => {
      const active = item.id === activeId;
      return (
        <Box key={item.id} component={motion.button} layout transition={{ type: 'spring', stiffness: 400, damping: 34 }} type="button" onClick={() => selectTopic(item.id)} aria-current={active ? 'true' : undefined}
          sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexShrink: 0,textAlign: 'left', cursor: 'pointer', font: 'inherit',px: 3, py: 1, borderRadius: 2, border: '1px solid', borderColor: active ? '#8400ff' : 'divider', bgcolor: active ? '#8400ff' : 'background.paper',color: active ? '#fff' : 'text.primary',fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'normal',overflowWrap: 'anywhere', transition: 'background-color 0.2s, border-color 0.2s','&:hover': { bgcolor: active ? '#8400ff' : alpha(theme.palette.primary.main, 0.06) }}}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Estrella com a algorien: plena si el tema dona punts (tema en curs), buida si no */}
            {item.current !== undefined && (
              <Tooltip title={item.current ? t('lesson.topic_gives_stars', 'Els problemes d\'aquest tema donen estrelles!') : t('lesson.topic_no_stars', 'Aquest tema no dona estrelles')} placement="top">
                <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
                  <Star size={16} aria-label={item.current ? t('lesson.topic_gives_stars', 'Els problemes d\'aquest tema donen estrelles!') : t('lesson.topic_no_stars', 'Aquest tema no dona estrelles')}
                    color={item.current ? '#facc15' : (active ? alpha('#fff', 0.7) : theme.palette.text.disabled)} fill={item.current ? '#facc15' : 'none'} />
                </Box>
              </Tooltip>
            )}
            <span>{item.title}</span>
          </Box>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            {item.percent !== undefined && (<Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.8 }}>{item.percent}%</Typography>)}
            {item.done && (<CheckCircle2 size={16} color={active ? '#fff' : theme.palette.success.main} />)}
          </Box>
        </Box>
      );
    });

  const renderTopicNav = (items: TopicNavItem[], activeId?: string) => (
    <Box component="aside" aria-label={t('lesson.topics', 'Temes')}
      sx={{display: { xs: 'none', md: 'flex' },width: { md: 280, lg: 350},mt:{lg:0},flexShrink: 0,flexDirection: 'column',gap: 2}}>
      {renderTopicButtons(items, activeId)}
    </Box>
  );
  const renderMobileTopicPanel = (items: TopicNavItem[], activeId?: string) => (
    <>
      <Box onClick={() => setMobileNavOpen(false)} sx={{display: { xs: 'block', md: 'none' },position: 'absolute', inset: 0, zIndex: 29,bgcolor: alpha('#000', 0.45),opacity: mobileNavOpen ? 1 : 0,pointerEvents: mobileNavOpen ? 'auto' : 'none',transition: 'opacity 0.25s ease',}}/>
      <Box component="aside" id="lesson-topics" aria-label={t('lesson.topics', 'Topics')} sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', position: 'absolute', top: 15, left: 0, bottom: 0, zIndex: 30, width: 300, maxWidth: '86vw', bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider', boxShadow: mobileNavOpen ? 6 : 'none', transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease, box-shadow 0.25s ease' }} >
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,}}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}>
            {t('lesson.topics', 'Topics')}
          </Typography>
          <IconButton size="small" onClick={() => setMobileNavOpen(false)} aria-label={t('lesson.close_topics', 'Tancar topics')} sx={{ color: 'text.primary' }}>
            <ChevronLeft size={20} />
          </IconButton>
        </Box>
        <Box sx={{flex: 1, overflowY: 'auto', p: 1.5,display: 'flex', flexDirection: 'column', gap: 1,scrollbarWidth: 'none','&::-webkit-scrollbar': { display: 'none' }}}>
          {renderTopicButtons(items, activeId)}
        </Box>
      </Box>
    </>
  );

  const renderMasterDetail = (items: TopicNavItem[], activeId: string | undefined, content: ReactNode) => (
    <Box sx={{display: 'flex', flexDirection: { xs: 'column', md: 'row' },alignItems: { md: 'flex-start' }, gap: { xs: 2, md: 4 }, mb: 6}}>
      {renderTopicNav(items, activeId)}
      <Box ref={contentRef} sx={{ flex: 1, minWidth: 0, width: '100%', maxWidth: { xs: '100%', md: 1400, lg:1950 }, mx: 'auto' }}>
        {content}
      </Box>
    </Box>
  );

  const topicItems: TopicNavItem[] = allLessons
    .map((l) => ({ id: l.id, title: getText(l.title), done: isTheoryDone(l.id), percent: getLessonProgress(l), current: typeof l.current === 'boolean' ? l.current : undefined }))
    .sort((a, b) => Number(a.done === true) - Number(b.done === true));
  const activeTopicId: string | undefined = allLessons.find((l) => l.id === selectedTopicId)?.id ?? allLessons[0]?.id;

  const renderTheoryTab = () => {
    if (allLessons.length === 0) {return (<Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{t('lesson.no_theory_content', "No hi ha contingut teòric detallat per a aquesta lliçó.")}</Typography>);}
    const activeLesson = allLessons.find((l) => l.id === selectedTopicId) ?? allLessons[0];
    const isDone = isTheoryDone(activeLesson.id);
    // Si el detall falla, es mostra com a tema sense teoria (no un spinner infinit)
    const markdown = topicDetailQuery.isError ? '' : topicDetailQuery.data?.theory;

    return renderMasterDetail(topicItems, activeTopicId, (
      <Box id={`theory-${activeLesson.id}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2.5 }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>{getText(activeLesson.title)}</Typography>
          {isDone && <CheckCircle2 size={20} color={theme.palette.success.main} />}
        </Box>

        {activeLesson.subTopics && activeLesson.subTopics.length > 0 && (
          <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {activeLesson.subTopics.map((sub: any) => {
              const subTitle = getText(sub.title);
              if (!subTitle) return null;
              return (
              <Button key={sub.id || sub.slug} component={RouterLink} to={`/courses/${courseId}/${activeLesson.id}/topic`}variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>{subTitle} </Button>);
            })}
          </Box>
        )}

        {markdown === undefined ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : markdown ? (<Box sx={markdownSx}><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></Box>
        ) : (<Typography sx={{ color: 'text.secondary', fontStyle: 'italic', mb: 2 }}>{t('lesson.no_theory_content', "No hi ha contingut teòric detallat per a aquesta lliçó.")}</Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant={isDone ? 'outlined' : 'contained'} color={isDone ? 'success' : 'primary'} onClick={() => markLessonAsDone(activeLesson.id)}startIcon={<Check size={16} />}sx={{ textTransform: 'none', fontWeight: 700 }}>
            {isDone ? t('lesson.completed', 'Completat') : t('lesson.mark_as_done', 'Marca com a completat')}
          </Button>
        </Box>
      </Box>
    ));
  };

  // Estat d'un test a partir de la resposta desada (validada amb les opcions actuals)
  const testStatus = (sub: any): boolean | string => {
    const saved = savedTestAnswers[answerKey(courseId!, sub.problemSlug || sub.slug)];
    if (!saved || !Array.isArray(saved.answers) || saved.correct == null) return false;
    const ids = new Set((sub.choices || []).map((c: any) => String(c.id)));
    if (ids.size > 0 && !saved.answers.every((a: any) => ids.has(String(a)))) return false;
    return saved.correct ? true : 'wrong';
  };

  const renderExerciseTab = (type: 'coding' | 'test') => {
    // Curs sense temes: el missatge és del curs; si no, és només del tema obert (n'hi pot haver en altres temes)
    if (allLessons.length === 0) {
      const courseMessage = type === 'coding' ? t('lesson.no_exercises', 'No hi ha exercicis per aquest curs.') : t('lesson.no_tests', 'No hi ha tests per aquest curs.');
      return <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>{courseMessage}</Typography>;
    }
    const emptyMessage = type === 'coding' ? t('lesson.no_topic_exercises', 'Aquest tema no té exercicis de programació.') : t('lesson.no_topic_tests', 'Aquest tema no té tests.');

    const active = allLessons.find((l) => l.id === selectedTopicId) ?? allLessons[0];
    const subItems: any[] = (active.subTopics || []).filter((s: any) => s.type === type);
    const emoji = type === 'coding' ? '💻' : '📝';

    return renderMasterDetail(topicItems, activeTopicId, (
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
            {getText(active.title)}
          </Typography>
        </Box>
        {subItems.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.95rem', px: 2.5, py: 4 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <Box sx={{ px: 2.5, pb: 1 }}>
            {subItems.map((sub: any) => {
              const key = `${courseId}_${sub.problemSlug || sub.slug || active.id}`;
              const targetSlug = sub.slug || sub.problemSlug || active.id;
              const status = type === 'test' ? testStatus(sub) : progress[key];
              return renderOverviewRow({
                key: `${active.id}-${type}-${targetSlug}`,
                icon: <Typography sx={{ fontSize: '1.1rem' }}>{renderStatusIcon(status, emoji)}</Typography>,
                label: getText(sub.subtitle || sub.title),
                to: type === 'coding' ? `/courses/${courseId}/${targetSlug}` : `/courses/${courseId}/test/${targetSlug}?topic=${encodeURIComponent(active.id)}`,
                right: renderStatusWithDifficulty(status || false, sub.difficulty),
                // Problema de codi: n'avança l'enunciat en passar-hi per sobre, perquè s'obri a l'instant
                onIntent: type === 'coding' && sub.text === undefined
                  ? () => { void queryClient.prefetchQuery(problemDetailQuery(courseId!, active.id, targetSlug)); }
                  : undefined,
              });
            })}
          </Box>
        )}
      </Box>
    ));
  };

  const renderFilesTab = () => {
    if (allLessons.length === 0) {return <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>{t('lesson.no_files', 'No hi ha fitxers disponibles per aquest curs.')}</Typography>;}

    const active = allLessons.find((l) => l.id === selectedTopicId) ?? allLessons[0];
    const files = topicDetailQuery.data?.files ?? [];
    const renderEmpty = (message: string) => (
      <Box sx={{ textAlign: 'center', py: 10, px: 3, color: 'text.secondary' }}>
        <FileText size={40} style={{ opacity: 0.5 }} />
        <Typography sx={{ mt: 2, fontWeight: 600, fontSize: '0.95rem' }}>{message}</Typography>
      </Box>
    );

    return renderMasterDetail(topicItems, activeTopicId, (
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>{getText(active.title)}</Typography>
        </Box>
        {topicDetailQuery.isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : topicDetailQuery.isError ? (
          renderEmpty(t('lesson.files_error', "No s'han pogut carregar els fitxers d'aquest tema."))
        ) : files.length === 0 ? (
          renderEmpty(t('lesson.no_topic_files', 'Aquest tema no té fitxers.'))
        ) : (
          <Box sx={{ px: 2.5, pb: 1 }}>
            {fileError && (
              <Typography role="alert" sx={{ color: 'error.main', fontSize: '0.9rem', pt: 1.5 }}>{fileError}</Typography>
            )}
            {files.map((file) => renderOverviewRow({
              key: `file-${file.id}`,
              icon: <FileText size={18} />,
              label: file.name,
              onClick: () => { if (downloadingFileId === null) void downloadFile(file); },
              right: downloadingFileId === file.id ? <CircularProgress size={16} /> : <Download size={16} />,
            }))}
          </Box>
        )}
      </Box>
    ));
  };

  return (
    <Box sx={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, bgcolor: 'background.default', overflow: 'hidden' }}>
      {mode === 'fancy' && <ParticlesBackground opacityMultiplier={0.4} />}

      <Box sx={{ display: 'flex', height: '100%' }}>
        <Box ref={scrollRef} sx={{flex: '1 1 auto', minWidth: 0,maxWidth: { md: 'none' },pl: { xs: 3, md: 8 },pr: { xs: 7.5, md: 10 },py: 6,overflowY: 'auto',height: 'calc(100vh - 64px)'}}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, gap: { xs: 1, lg: 5 }, mt: { lg: 4 }, flexWrap: 'wrap' }}>
            <Box sx={{display: 'inline-flex', alignItems: 'center', mb: { xs: 3, lg: 1 }, mt: { xs: isTallScreen ? 2 : 0, lg: 0 },bgcolor: 'background.paper', borderRadius: 999, border: '2px solid', borderColor: '#00685d', px: { xs: 2, md: 3 },flexWrap: 'wrap', maxWidth: '100%',}}>
                <Button onClick={(e) => setScopeAnchor(e.currentTarget)} aria-haspopup="menu" aria-expanded={Boolean(scopeAnchor)} startIcon={<ScopeIcon scope={scope} />} endIcon={<ExpandMoreIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: scopeAnchor ? 'rotate(180deg)' : 'none' }} />} sx={{ textTransform: 'none', fontWeight: 800, fontSize: { xs: '0.9rem', md: '1rem' }, color: '#00A896', minWidth: 0, flexShrink: 0, py: 0.75, pr: 0.5 }}>
                  {t(SCOPE_META[scope].labelKey, SCOPE_META[scope].fallback)}<Typography component="span" sx={{ ml: 1, px: 1, borderRadius: 999, bgcolor: 'action.hover', fontSize: '0.75rem', fontWeight: 900 }}>{visibleCourses.length}</Typography>
                </Button>
  
                <Menu anchorEl={scopeAnchor} open={Boolean(scopeAnchor)}  onClose={() => { setScopeAnchor(null); setSubMenuAnchor(null); setActiveSubMenuScope(null);}}
                  slotProps={{ paper: { sx: { bgcolor: 'background.paper', minWidth: 220}}}}>
                  {SCOPES.map((option, idx) => {
                    const source = option === 'public' ? publicCourses : assignedCourses;
                    const matchingCourses = filterByScope(source, option);
                    const isSelectedScope = activeSubMenuScope === option;
  
                    return (
                      <Box key={option}>
                        {idx > 0 && <Divider sx={{ my: 0.5 }} />}
                        <MenuItem onClick={(e) => {setSubMenuAnchor(e.currentTarget); setActiveSubMenuScope(option);}}
                          sx={{fontWeight: 800, py: 1.25, display: 'flex', justifyContent: 'space-between',bgcolor: isSelectedScope ? alpha(theme.palette.primary.main, 0.08) : 'transparent'}}>
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
  
                <Menu anchorEl={subMenuAnchor} open={Boolean(subMenuAnchor) && Boolean(activeSubMenuScope)} onClose={() => { setSubMenuAnchor(null); setActiveSubMenuScope(null); }} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { sx: { bgcolor: 'background.paper', minWidth: 260, maxHeight: '60vh', overflowY: 'auto', ml: 1 } } }}>
                  {activeSubMenuScope && filterByScope(
                    activeSubMenuScope === 'public' ? publicCourses : assignedCourses,
                    activeSubMenuScope
                  ).map((c: any) => {
                    const isCurrentCourse = c.id === courseId;
                    return (
                      <MenuItem key={c.id} onClick={() => handleSelectCourse(c.id)} sx={{ py: 1.25, bgcolor: isCurrentCourse ? alpha(theme.palette.primary.main, 0.08) : 'transparent', fontWeight: isCurrentCourse ? 700 : 400, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
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

              <Typography variant="h2" sx={{fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.5rem' },letterSpacing: '0.03em', mt: { xs: 1, lg: 0 }, mb: 2, lineHeight: 1.1}}>
                {getText(course.title)}
              </Typography>
            </Box>

            {/* Mòbil: botó "Topics" per obrir/tancar el menú de temes */}
            <Button onClick={() => setMobileNavOpen((v) => !v)} aria-label={mobileNavOpen ? t('lesson.close_topics', 'Tancar temes') : t('lesson.open_topics', 'Obrir temes')} aria-expanded={mobileNavOpen} aria-controls="lesson-topics" variant="outlined" startIcon={mobileNavOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />} sx={{ display: { xs: 'inline-flex', md: 'none' }, textTransform: 'none', fontWeight: 900, fontSize: '1rem', borderRadius: 999, borderColor: '#00685d', color: '#00685d', px: 2, mt: { xs: 2 }, mb: { xs: -3 } }}> Topics </Button>

            <Typography sx={{ color: 'text.secondary', fontSize: { xs: '1rem', md: '1.4rem' }, lineHeight: 1.7, mb: 6, maxWidth: '900px' }}>
              {getText(course.description)}
            </Typography>

            {mainTab === 0 && (<Box>{renderTabs()}{renderTheoryTab()}</Box>)}
            {mainTab === 1 && (<Box>{renderTabs()}{renderExerciseTab('coding')}</Box>)}
            {mainTab === 2 && (<Box>{renderTabs()}{renderExerciseTab('test')}</Box>)}
            {mainTab === 3 && (<Box>{renderTabs()}{renderFilesTab()}</Box>)}
          </motion.div>
        </Box>
      </Box>

      {/* Menú vertical flotant: apareix quan les pestanyes de dalt surten de la pantalla */}
      <Box sx={{ position: 'absolute', right: { xs: 7.5, md: 27, lg: 35 }, top: '50%', zIndex: 20, display: 'flex', flexDirection: 'column', gap: 3, p: 1, borderRadius: 999, bgcolor: alpha(theme.palette.background.paper, 0.85), backdropFilter: 'blur(8px)', border: '1px solid', borderColor: 'divider', boxShadow: 3, transition: 'opacity 0.25s, transform 0.25s', opacity: showRail ? 1 : 0, transform: showRail ? 'translateY(-50%)' : 'translate(24px, -50%)', pointerEvents: showRail ? 'auto' : 'none' }}>
        {TAB_ITEMS.map(({ icon: Icon, labelKey, fallback }, index) => {
          const active = mainTab === index;
          return (
            <Tooltip key={labelKey} title={t(labelKey, fallback)} placement="left">
              <Box component="button" type="button" aria-label={t(labelKey, fallback)} onClick={() => handleRailTabClick(index)} sx={{ width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 }, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '50%', cursor: 'pointer', bgcolor: active ? '#8400ff' : 'transparent', color: active ? '#fff' : 'text.secondary', transition: 'background-color 0.2s, color 0.2s', '&:hover': { bgcolor: active ? '#8400ff' : alpha(theme.palette.primary.main, 0.12) } }}><Icon size={20} /></Box>
            </Tooltip>
          );
        })}

        {/* Mòbil: separador + botó de topics dins del mateix rail flotant */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, width: 22, height: 1, bgcolor: 'divider', my: -1, flexShrink: 0 }} />
        <Tooltip title="Topics" placement="left">
          <Box component="button" type="button" aria-label="Topics" aria-controls="lesson-topics" onClick={() => setMobileNavOpen(true)} sx={{ display: { xs: 'flex', md: 'none' }, width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 }, alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '50%', cursor: 'pointer', bgcolor: 'transparent', color: 'text.secondary', transition: 'background-color 0.2s, color 0.2s', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) } }}><ListIcon size={20} /></Box>
        </Tooltip>
      </Box>

      {/* Menú de temes per a mòbil (ocultat a l'esquerra) */}
      {renderMobileTopicPanel(topicItems, activeTopicId)}
    </Box>
  );
}

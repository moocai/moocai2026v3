import {useState, useEffect, useMemo, useCallback, useRef, type FormEvent} from 'react';
import {useNavigate} from 'react-router-dom';
import {Box, Container, Typography, Stack, CircularProgress, Tabs, Tab, IconButton, LinearProgress, Avatar, Button, useMediaQuery, Tooltip, Divider, Menu, MenuItem, ListItemIcon, ListItemText, Grid} from '@mui/material';
import {Public as PublicIcon, LockOutlined as LockIcon, School as SchoolIcon, ExpandMore as ExpandMoreIcon, MenuBook as MenuBookIcon, LaptopMac as LaptopMacIcon, InfoOutlined as InfoOutlinedIcon, AccessTime as AccessTimeIcon, ArrowForward as ArrowForwardIcon, RestartAlt as RestartAltIcon, Code as CodeIcon, FactCheckOutlined as FactCheckOutlinedIcon} from '@mui/icons-material';
import {api} from '../../services/api';
import {authService} from '../../services/authService';
import {useTranslation} from 'react-i18next';
import {useNotifications} from '../../contexts/NotificationContext';
import {Login} from '../../features/student/Login';
import {Student, Topic, Course} from '../../features/student/types';
import { courseService } from '../../services/courseService';
import {useThemeMode} from '../../hooks/useTheme';
import ParticlesBackground from '../../components/ParticlesBackground';

const getProgress = (studentId: string): Record<string, boolean> => {
  const perStudent = JSON.parse(localStorage.getItem(`mooc_global_progress_${studentId}`) || '{}');
  const shared = JSON.parse(localStorage.getItem('mooc_shared_all_progress') || '{}');
  return { ...(shared[studentId] || {}), ...perStudent };
};

/** Les tres llistes de cursos que es poden veure als tabs. */
export type CourseScope = 'public' | 'private' | 'assigned';

const SCOPES: CourseScope[] = ['public', 'private', 'assigned'];

const SCOPE_META: Record<CourseScope, { labelKey: string; fallback: string }> = {
  public: { labelKey: 'dashboard.public_courses', fallback: 'Públics' },
  private: { labelKey: 'dashboard.private_courses', fallback: 'Privats' },
  assigned: { labelKey: 'dashboard.assigned_courses', fallback: 'Assignats' },
};

/** Icona associada a cada àmbit. */
function ScopeIcon({ scope }: { scope: CourseScope }) {
  if (scope === 'public') return <PublicIcon fontSize="small" />;
  if (scope === 'private') return <LockIcon fontSize="small" />;
  return <SchoolIcon fontSize="small" />;
}

function filterByScope(courses: Course[], scope: CourseScope): Course[] {
  if (scope === 'public') return courses.filter((c) => c.isPublic !== false);
  if (scope === 'private') return courses.filter((c) => c.isPublic === false);
  return courses;
}

/** Clau on es recorda l'últim curs i filtre que l'usuari estava mirant. */
const LAST_COURSE_KEY = 'mooc_dashboard_last_course';

function readLastCourse(): { slug?: string; scope?: string } | null {
  try {
    const raw = localStorage.getItem(LAST_COURSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLastCourse(slug: string | undefined, scope: string) {
  try { localStorage.setItem(LAST_COURSE_KEY, JSON.stringify({ slug, scope })); } catch { /* mode privat */ }
}

/** Una fila del leaderboard. */
type RankedStudent = { id: string; name: string; points: number };

/**
 * Converteix la resposta de `GET /courses/{slug}/students/overview/` en files
 * del leaderboard, ordenades de més a menys punts.
 * Si la teva API fa servir altres noms de camp, ajusta NOMÉS les llistes de
 * claus d'aquesta funció.
 */
function toRanking(data: any[]): RankedStudent[] {
  const firstNumber = (row: any, keys: string[]): number => {
    for (const k of keys) {
      const value = Number(row?.[k]);
      if (row?.[k] != null && !Number.isNaN(value)) return value;
    }
    return 0;
  };
  return data
    .map((row, i) => {
      const user = row?.user ?? row;
      return {
        id: String(user?.id ?? user?.user_id ?? user?.username ?? i),
        name: String(user?.username ?? user?.name ?? user?.full_name ?? user?.first_name ?? '?'),
        points: firstNumber(row, ['points', 'score', 'total_points', 'total_score', 'stars', 'grade']),
      };
    })
    .sort((a, b) => b.points - a.points);
}

export default function StudentDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { mode } = useThemeMode();
  const [loading, setLoading] = useState(true);
  const [, setActionLoading] = useState(false);
  /** `GET /courses/` — cursos assignats al currentUser (o els seus, si és profe). */
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  /** `GET /public/courses/` — catàleg de cursos públics. */
  const [publicCourses, setPublicCourses] = useState<Course[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dbProgress, setDbProgress] = useState<Record<string, boolean>>({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [courseTabIndex, setCourseTabIndex] = useState(0);
  /** Quina de les tres llistes mostrem als tabs. */
  const [scope, setScope] = useState<CourseScope>('public');
  const [scopeAnchor, setScopeAnchor] = useState<null | HTMLElement>(null);
  /** Classificació del curs seleccionat (`students/overview/`). */
  const [ranking, setRanking] = useState<RankedStudent[]>([]);
  /** Evita restaurar dues vegades el darrer curs. */
  const restoredRef = useRef(false);

  const isMdUp = useMediaQuery('(max-height:900px)');
  const lessonsSliceLimit = isMdUp ? 5 : 7;
  const isTallScreen = useMediaQuery('(min-height:1200px)');

  const lang = (i18n.language?.split('-')[0]) as 'ca' | 'es' | 'en';
  const getText = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['ca'] || '';
  };

  const getCourseTopics = (course: Course): Topic[] => {
    if (course.topics && course.topics.length > 0) return course.topics;
    if (course.content && course.content.length > 0) {
      const lessons = course.content.flatMap((item: any) =>
        (item.subTopics || []).map((st: any) => ({
          id: st.problemSlug,
          title: st.subtitle,
          type: st.type,
          choices: st.choices,
          precode: st.precode,
        }))
      );
      return [{ title: '', lessons }];
    }
    return [];
  };

  const fetchProgress = useCallback(async (studentId: string) => {
    setActionLoading(true);
    const apiData = await api.getStudentProgress(studentId).catch(() => null);
    if (apiData && Object.keys(apiData).length > 0) {
      setDbProgress(apiData);
    } else {
      setDbProgress(getProgress(studentId));
    }
    setActionLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const initData = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);
        if (!mounted) return;
        try {
          // Dues llistes: els públics del catàleg i els assignats al currentUser.
          const [assignedFromApi, publicFromApi] = await Promise.all([
            courseService.getAllCourses().catch(() => [] as Course[]),
            courseService.getPublicCourses().catch(() => [] as Course[]),
          ]);
          const withDetails = async (course: Course) => {
            try {
              const detail = await courseService.getFullCourseDetail(course.slug!);
              const topics: Topic[] = (detail.content || []).map((topic: any) => ({
                id: topic.id ?? topic.slug,
                title: topic.title,
                lessons: (topic.subTopics || []).map((st: any) => ({
                  id: st.problemSlug,
                  title: st.subtitle,
                  theoryInstructions: st.text,
                  challenge: st.text,
                  type: st.type,
                  choices: st.choices,
                  precode: st.precode,
                  difficulty: st.difficulty,
                  score: st.score,
                })),
              }));
              return { ...course, topics };
            } catch { return course; }
          };
          setAssignedCourses(await Promise.all(assignedFromApi.map(withDetails)));
          setPublicCourses(await Promise.all(publicFromApi.map(withDetails)));
        } catch (err) { console.error("Error carregant cursos:", err); }

        const saved = localStorage.getItem('currentStudent');
        if (saved) {
            const parsed = JSON.parse(saved);
            setSelectedStudent(parsed);
            await fetchProgress(parsed.id);
        }
      } catch (err) { console.error("Error inesperat:", err); }
      finally { if (isInitial) setLoading(false); }
    };
    initData(true);
    const onVisible = () => { if (document.visibilityState === 'visible') initData(); };
    document.addEventListener('visibilitychange', onVisible);
    const onProgress = () => {
      const saved = localStorage.getItem('currentStudent');
      if (saved) fetchProgress(JSON.parse(saved).id);
    };
    document.addEventListener('lessonProgressUpdated', onProgress);
    window.addEventListener('storage', onProgress);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('lessonProgressUpdated', onProgress);
      window.removeEventListener('storage', onProgress);
    };
  }, [fetchProgress]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const data = await authService.login(username, password);
      const role = 'student';
      const student: Student = {
        id: data?.user?.id != null ? String(data.user.id) : username,
        name: data?.user?.name || username,
        code: password,
        email: data?.user?.email || username,
        role,
      };
      setSelectedStudent(student);
      localStorage.setItem('currentStudent', JSON.stringify(student));
      fetchProgress(student.id);
      setUsername("");
      setPassword("");
      setLoginLoading(false);
      addNotification(t('notifications.welcome', { name: student.name }), 'success');
      window.dispatchEvent(new Event('auth-state-change'));
    } catch (err: any) {
      setLoginError(true);
      setLoginLoading(false);
      addNotification(t('notifications.incorrect_pin'), 'error');
      setTimeout(() => setLoginError(false), 1500);
    }
  };

  const handleResetCourse = async (courseId: string) => {
    if (!selectedStudent || !window.confirm(t('dashboard.reset_course_confirm'))) return;
    try {
      setActionLoading(true);
      await api.resetCourse(selectedStudent.id, courseId);
      await fetchProgress(selectedStudent.id);
      addNotification(t('notifications.course_reset'), 'success');
    } catch (err) { addNotification(t('notifications.course_reset_error'), 'error'); }
    finally { setActionLoading(false); }
  };

  const getCourseProgress = (course: Course, studentId: string): number => {
    const topics = getCourseTopics(course);
    const totalLessons = topics.reduce((acc, topic) => acc + (topic.lessons?.length || 0), 0) || 0;
    if (totalLessons === 0) return 0;
    const studentData = getProgress(studentId);
    const done = topics.reduce((acc, topic) => acc + (topic.lessons?.filter(l => studentData[`${course.id}_${l.id}`] === true).length || 0), 0) || 0;
    if (done === 0) return 0;
    return Math.max(1, Math.round((done / totalLessons) * 100));
  };

  const TEST_TYPE_VALUES = ['test', 'quiz', 'exam', 'multiple_choice'];
  const isTestLesson = (lesson: any) =>
    TEST_TYPE_VALUES.includes(String(lesson?.type || '').toLowerCase()) ||
    (Array.isArray(lesson?.choices) && lesson.choices.length > 0);
  const isCodeLesson = (lesson: any) => !isTestLesson(lesson);

  const getFlatLessons = (course: Course) => {
    const topics = getCourseTopics(course);
    return topics.flatMap(topic => (topic.lessons || []).map(lesson => ({ ...lesson, topicTitle: topic.title })));
  };

  /**
   * Llista els TEMES d'un curs que tenen almenys una activitat del tipus demanat
   * (codi o test), amb el recompte fet/total per poder pintar la barra de progrés.
   * No es mostren les activitats (subtemes), només el tema.
   * `budget` limita quants temes es mostren perquè la card (molt estreta) no creixi
   * sense límit, i `hidden` és el nombre de temes que no hi caben.
   */
  const getTopicSummaries = (
    course: Course,
    matches: (l: any) => boolean,
    budget: number,
    progress: Record<string, boolean>,
  ) => {
    const all: TopicSummary[] = getCourseTopics(course)
      .map((topic, i) => {
        const lessons = (topic.lessons || []).filter(matches);
        const done = lessons.filter((l: any) => progress[`${course.id}_${l.id}`] === true).length;
        return {
          key: String(topic.id ?? `topic-${i}`),
          id: topic.id != null ? String(topic.id) : '',
          // Si el curs no té temes (estructura plana), fem servir el títol del curs.
          title: getText(topic.title) || getText(course.title),
          total: lessons.length,
          done,
        };
      })
      .filter((topic) => topic.total > 0);
    return { topics: all.slice(0, budget), hidden: Math.max(0, all.length - budget) };
  };

  /** Llistes base segons l'àmbit triat. 'public' ve del catàleg, la resta de `/courses/`. */
  const scopeSource = scope === 'public' ? publicCourses : assignedCourses;

  /** Subconjunt de cursos que mostrem als tabs segons el filtre del desplegable. */
  const visibleCourses = useMemo(
    () => filterByScope(scopeSource, scope),
    [scopeSource, scope],
  );

  /** Recorda curs + àmbit. Es crida des dels handlers, no des d'un efecte. */
  const persistSelection = (course: Course | undefined, nextScope: CourseScope) => {
    writeLastCourse(course?.slug, nextScope);
  };

  const pickScope = (nextScope: CourseScope) => {
    setScope(nextScope);
    setCourseTabIndex(0);
    setScopeAnchor(null);
    const source = nextScope === 'public' ? publicCourses : assignedCourses;
    persistSelection(filterByScope(source, nextScope)[0], nextScope);
  };

  // Restaura l'últim curs + àmbit quan els cursos ja han arribat de l'API.
  useEffect(() => {
    if (restoredRef.current || assignedCourses.length + publicCourses.length === 0) return;
    restoredRef.current = true;
    const saved = readLastCourse();
    if (!saved) return;
    const savedScope: CourseScope =
      saved.scope === 'private' || saved.scope === 'assigned' ? saved.scope : 'public';
    setScope(savedScope);
    const source = savedScope === 'public' ? publicCourses : assignedCourses;
    const list = filterByScope(source, savedScope);
    const idx = list.findIndex((c) => c.slug === saved.slug);
    if (idx >= 0) setCourseTabIndex(idx);
  }, [assignedCourses, publicCourses]);

  // Carrega la classificació del curs seleccionat cada cop que canvia de curs.
  const currentSlug = visibleCourses[courseTabIndex]?.slug;
  const selectedStudentId = selectedStudent?.id;
  useEffect(() => {
    if (!currentSlug || !selectedStudentId) {
      setRanking([]);
      return;
    }
    let cancelled = false;
    courseService.getStudentsOverview(currentSlug)
      .then((rows) => {
        // Temporal: mira la consola per veure els noms reals dels camps; després treu-ho.
        console.debug('[ranking] students/overview', rows);
        if (!cancelled) setRanking(toRanking(rows));
      })
      .catch(() => { if (!cancelled) setRanking([]); });
    return () => { cancelled = true; };
  }, [currentSlug, selectedStudentId]);

  const stats = useMemo(() => {
    const empty = { streak: 0, successRate: 0, remainingHours: 0, codeDone: 0, codeTotal: 0, testRate: 0 };
    const course = visibleCourses[courseTabIndex] || null;
    if (!course || !selectedStudent) return empty;

    const lessons = getFlatLessons(course);
    const codeLessons = lessons.filter((l) => !isTestLesson(l));
    const testLessons = lessons.filter((l) => isTestLesson(l));
    const progress = getProgress(selectedStudent.id);
    const isDone = (l: any) => progress[`${course.id}_${l.id}`] === true;

    const codeTotal = codeLessons.length;
    const codeDone = codeLessons.filter(isDone).length;
    const testTotal = testLessons.length;
    const testDone = testLessons.filter(isDone).length;

    const successRate = codeTotal > 0 ? Math.round((codeDone / codeTotal) * 100) : 0;
    const testRate = testTotal > 0 ? Math.round((testDone / testTotal) * 100) : 0;
    const remainingHours = Math.round((codeTotal - codeDone) * 0.5 * 10) / 10;

    const raw = localStorage.getItem(`mooc_streak_${selectedStudent.id}`);
    const streak = raw ? parseInt(raw, 10) || 0 : 0;

    return { streak, successRate, remainingHours, codeDone, codeTotal, testRate };
  }, [visibleCourses, courseTabIndex, selectedStudent, dbProgress]);

  if (loading) return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: mode === 'fancy' ? 'transparent' : 'background.default', zIndex: 9999 }}>
      <CircularProgress color="primary" />
    </Box>
  );

  const currentCourse = visibleCourses[courseTabIndex] || null;
  const currentProgress = currentCourse && selectedStudent ? getCourseProgress(currentCourse, selectedStudent.id) : 0;
  const progressData = selectedStudent ? getProgress(selectedStudent.id) : {};
  const flatLessons = currentCourse ? getFlatLessons(currentCourse) : [];
  /** Els dos boxes del resum: només temes, amb el progrés de les seves activitats. */
  const codeTopics = currentCourse ? getTopicSummaries(currentCourse, isCodeLesson, lessonsSliceLimit, progressData) : null;
  const testTopics = currentCourse ? getTopicSummaries(currentCourse, isTestLesson, lessonsSliceLimit, progressData) : null;
  const top3Ranking = ranking.slice(0, 3);

  const handleStatsClick = () => {
    navigate(`/courses/${currentCourse?.slug}/stats`);
  };

  /**
   * Obre la pàgina del curs a la pestanya que toca (1 = Programació, 2 = Tests)
   * amb el tema clicat ja desplegat. Fa servir les mateixes claus de localStorage
   * que llegeix CourseLessons.
   */
  const openTopic = (tab: number, topicId: string) => {
    if (!currentCourse?.slug) return;
    try {
      localStorage.setItem(`mooc_tab_${currentCourse.slug}`, JSON.stringify(tab));
      if (topicId) {
        const key = `mooc_expanded_${currentCourse.slug}`;
        const expanded: string[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (!expanded.includes(topicId)) {
          localStorage.setItem(key, JSON.stringify([...expanded, topicId]));
        }
      }
    } catch { /* mode privat */ }
    navigate(`/courses/${currentCourse.slug}`);
  };

  return (
    <Box sx={{ position: 'relative', bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default', color: 'text.primary', width: '100%', maxWidth: '100vw', height: '100%', overflow: { xs: 'auto', md: 'hidden' }, display: 'flex', flexDirection: 'column' }}>
        {mode === 'fancy' && <ParticlesBackground opacityMultiplier={0.4} />}
        <Container maxWidth={false} sx={{ pt: { xs: 2, md: 6 }, px: { xs: 2, sm: 1.5, md: 8, lg: 8, xl: 10 }, flex: 1, display: 'flex', flexDirection: 'column', overflow: { xs: 'visible', md: 'auto' } }}>
          <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!selectedStudent ? (
                <Login
                  username={username}
                  onUsernameChange={setUsername}
                  password={password}
                  onPasswordChange={setPassword}
                  onSubmit={handleLogin}
                  error={loginError}
                  loading={loginLoading}
                />
            ) : (
              <>
                {/* --- Course tabs (públic/privat + Python / React / +) --- */}
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', mb: 5, mt: isTallScreen ? 25 : 0,
                  bgcolor: 'background.paper', borderRadius: 999, border: '2px solid', borderColor: '#00685d', px: { xs: 2, md: 5 },
                  flexWrap: 'wrap', maxWidth: '100%',
                }}>
                  {/* Desplegable: públic / privat / assignats */}
                  <Button
                    onClick={(e) => setScopeAnchor(e.currentTarget)}
                    aria-haspopup="menu"
                    aria-expanded={Boolean(scopeAnchor)}
                    startIcon={<ScopeIcon scope={scope} />}
                    endIcon={<ExpandMoreIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: scopeAnchor ? 'rotate(180deg)' : 'none' }} />}
                    sx={{
                      textTransform: 'none', fontWeight: 800, fontSize: { xs: '0.8rem', md: '0.875rem' },
                      color: '#00A896', minWidth: 0, flexShrink: 0, py: 0.5, pr: 0.5,
                    }}
                  >
                    {t(SCOPE_META[scope].labelKey, SCOPE_META[scope].fallback)}
                    <Typography component="span" sx={{ ml: 0.75, px: 0.9, borderRadius: 999, bgcolor: 'action.hover', fontSize: '0.72rem', fontWeight: 900 }}>
                      {visibleCourses.length}
                    </Typography>
                  </Button>
                  <Menu
                    anchorEl={scopeAnchor}
                    open={Boolean(scopeAnchor)}
                    onClose={() => setScopeAnchor(null)}
                    slotProps={{ paper: { sx: { bgcolor: 'background.paper', minWidth: 200 } } }}
                  >
                    {SCOPES.map((option) => {
                      const source = option === 'public' ? publicCourses : assignedCourses;
                      return (
                        <MenuItem
                          key={option}
                          selected={scope === option}
                          onClick={() => pickScope(option)}
                        >
                          <ListItemIcon><ScopeIcon scope={option} /></ListItemIcon>
                          <ListItemText>{t(SCOPE_META[option].labelKey, SCOPE_META[option].fallback)}</ListItemText>
                          <Typography variant="caption" color="text.secondary">
                            {filterByScope(source, option).length}
                          </Typography>
                        </MenuItem>
                      );
                    })}
                  </Menu>
                  <Divider orientation="vertical" flexItem sx={{ mx: 1.25, my: 1, borderColor: 'divider' }} />
                  <Tabs
                    value={visibleCourses.length ? courseTabIndex : false}
                    onChange={(_e, val) => {
                      setCourseTabIndex(val);
                      persistSelection(visibleCourses[val], scope);
                    }}
                    slotProps={{ indicator: { style: { display: 'none' } } }}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ minHeight: 40, maxWidth: { xs: 200, sm: 'none' } }}
                  >
                    {visibleCourses.map((course) => (
                      <Tab
                        key={course.id}
                        label={getText(course.title) || course.slug}
                        sx={{
                          minHeight: 40, textTransform: 'none', fontWeight: 700, borderRadius: 999,
                          color: '#00A896 !important',
                        }}
                      />
                    ))}
                  </Tabs>
                  {currentCourse && (
                    <IconButton
                      size="small"
                      sx={{ ml: 0.5 }}
                      onClick={() => handleResetCourse(currentCourse.id)}
                      aria-label={t('dashboard.reset_course_tooltip')}
                      title={t('dashboard.reset_course_tooltip')}
                    >
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  )}
                  
                </Box>

                {currentCourse ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {/* --- 5-card summary row --- */}
                    <Grid container spacing={{ xs: 1.5, md: 2, xl: 4 }} sx={{ mb: { xs: 1.5, md: 5 }, ml: { xl: 2 }, order: { xs: 1, md: 0 } }}>
                      {/* Progrés general */}
                      <Grid size={{ xs: 12, sm: 6, md: 2.4, xl: 2.2 }} sx={{ height: { xs: 'auto', md: '100%' } }}>
                        <DashboardCard title={t('dashboard.overall_progress')} compact minHeightXs={110}>
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex', width: { xs: 64, md: isMdUp ? 160 : 180 }, height: { xs: 64, md: isMdUp ? 160 : 200 } }}>
                              <CircularProgress variant="determinate" value={100} thickness={5} size="100%" sx={{ color: 'action.disabledBackground', position: 'absolute', ml: { xs: 0, md: isMdUp ? 0 : 1 } }} />
                              <CircularProgress variant="determinate" value={currentProgress} thickness={5} size="100%" sx={{ color: 'primary.main' }} />
                              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: { xs: 0, md: isMdUp ? 0 : 1 } }}>
                                <Typography variant={isMdUp ? 'h4' : 'h6'} sx={{ fontWeight: 900, fontSize: { xs: '0.85rem', md: isMdUp ? '1.5rem' : '2.5rem' } }}>{currentProgress}%</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </DashboardCard>
                      </Grid>

                      {/* Problemes de codi: només temes */}
                      <Grid size={{ xs: 12, sm: 6, md: 2.4, xl: 2.4 }}>
                        <DashboardCard title={t('dashboard.code_problems')} compact={!isMdUp}>
                          {codeTopics && codeTopics.topics.length > 0 ? (
                            <TopicList
                              topics={codeTopics.topics}
                              hidden={codeTopics.hidden}
                              icon={LaptopMacIcon}
                              onOpen={(topicId) => openTopic(1, topicId)}
                              moreLabel={t('dashboard.and_more', { count: codeTopics.hidden })}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">{t('dashboard.no_lessons')}</Typography>
                          )}
                          <Typography
                            variant="caption"
                            onClick={handleStatsClick}
                            sx={{ color: 'primary.main', fontWeight: 700, fontSize: { xs: '0.75rem', md: '0.85rem' }, letterSpacing: '0.1em', mt: 'auto', pt: 1, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {t('dashboard.view_stats')}
                          </Typography>
                        </DashboardCard>
                      </Grid>

                      {/* Exercicis de test: només temes */}
                      <Grid size={{ xs: 12, sm: 6, md: 2.4, xl: 2.4 }}>
                        <DashboardCard title={t('dashboard.test_exercises')} compact={!isMdUp}>
                          {testTopics && testTopics.topics.length > 0 ? (
                            <TopicList
                              topics={testTopics.topics}
                              hidden={testTopics.hidden}
                              icon={MenuBookIcon}
                              onOpen={(topicId) => openTopic(2, topicId)}
                              moreLabel={t('dashboard.and_more', { count: testTopics.hidden })}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">{t('dashboard.no_lessons')}</Typography>
                          )}
                          <Typography
                            variant="caption"
                            onClick={handleStatsClick}
                            sx={{ color: 'primary.main', fontWeight: 700, fontSize: { xs: '0.75rem', md: '0.85rem' }, letterSpacing: '0.1em', mt: 'auto', pt: 1, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {t('dashboard.view_stats')}
                          </Typography>
                        </DashboardCard>
                      </Grid>

                      {/* Leaderboard */}
                      <Grid size={{ xs: 12, sm: 6, md: 2.4, xl: 2.4 }}>
                        <DashboardCard title={t('dashboard.leaderboard')} compact={!isMdUp}>
                          <Stack spacing={{ xs: 1.5, md: 2.5 }} sx={{ width: '100%', mt: 1, alignItems: 'center' }}>
                            {top3Ranking.map((s) => (
                              <Stack key={s.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                <Avatar sx={{
                                  width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 },
                                  bgcolor: (s.id === selectedStudent?.id || s.name === selectedStudent?.name) ? 'primary.main' : 'action.disabledBackground',
                                }}>{s.name.charAt(0).toUpperCase()}</Avatar>
                                <Typography variant="body2" sx={{ flex: 1, textAlign: 'center', fontSize: { xs: '0.8rem', md: '0.875rem' } }} noWrap>{s.name}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>{s.points}</Typography>
                              </Stack>
                            ))}
                            {top3Ranking.length === 0 && (
                              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>{t('dashboard.no_data')}</Typography>
                            )}
                          </Stack>
                        </DashboardCard>
                      </Grid>

                      {/* Més estadístiques */}
                      <Grid size={{ xs: 12, sm: 6, md: 2.4, xl: 2.4 }}>
                        <DashboardCard title={t('dashboard.more_stats')} compact={!isMdUp}>
                          <Stack
                            direction={{ xs: 'row', md: 'column' }}
                            spacing={{ xs: 2, md: 1.25 }}
                            sx={{ flex: 1, py: { xs: 2, md: 1 }, width: '100%', justifyContent: 'space-evenly', flexWrap: { xs: 'wrap', md: 'nowrap' } }}
                          >
                            {/* 1. Ratxa */}
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'none' } }} />

                       
                            {/* 4. Problemes de programació correctes */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CodeIcon sx={{ color: '#00685d', fontSize: { xs: 22, md: 26 } }} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {t('dashboard.code_correct', 'Problemes de programació')}:{' '}
                                <Box component="span" sx={{ color: '#00685d', fontWeight: 700 }}>
                                  {stats.codeDone}/{stats.codeTotal}
                                </Box>
                              </Typography>
                            </Box>
                            <Divider sx={{ display: { xs: 'none', md: 'block' } }} />

                            {/* 5. Tests correctes */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FactCheckOutlinedIcon sx={{ color: '#00685d', fontSize: { xs: 22, md: 26 } }} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {t('dashboard.tests_correct', 'Tests correctes')}:{' '}
                                <Box component="span" sx={{ color: '#00685d', fontWeight: 700 }}>
                                  {stats.testRate}%
                                </Box>
                              </Typography>
                            </Box>
                            <Divider sx={{ display: { xs: 'none', md: 'block' } }} />
                            {/* 3. Temps restant */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTimeIcon sx={{ color: '#00685d', fontSize: { xs: 22, md: 26 } }} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {t('dashboard.remaining')}: <Box component="span" sx={{ color: '#00685d', fontWeight: 700 }}>{stats.remainingHours}</Box> {t('dashboard.hours')}
                              </Typography>
                            </Box>
                          </Stack>
                        </DashboardCard>
                      </Grid>
                    </Grid>

                    {/* --- Continua estudiant --- */}
                    <Box sx={{ border: '2px solid', borderColor: '#00685d', borderRadius: 3, p: { xs: 2, md: 3 }, bgcolor: 'background.paper', order: { xs: 2, md: 0 } }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {t('dashboard.continue_studying')}
                        </Typography>
                        <Button
                          onClick={() => navigate(`/courses/${currentCourse.slug}`)}
                          endIcon={<ArrowForwardIcon fontSize="small" />}
                          sx={{ textTransform: 'none', fontWeight: 900 }}
                        >
                          {t('dashboard.view_full_course')}
                        </Button>
                      </Stack>
                      <Stack spacing={2}>
                        {(() => {
                          const attemptedLessons = flatLessons.filter((lesson: any) => selectedStudent && dbProgress[`${currentCourse.id}_${lesson.id}`]);
                          return attemptedLessons.length > 0 ? attemptedLessons.slice(-5).reverse().map((lesson: any, idx: number) => {
                            const isCompleted = dbProgress[`${currentCourse.id}_${lesson.id}`] === true;
                            return (
                            <Stack key={lesson.id || idx} direction="row" spacing={{ xs: 1, md: 2 }} sx={{ alignItems: 'center' }}>
                              {isCodeLesson(lesson) ? <LaptopMacIcon sx={{ color: 'text.secondary', fontSize: { xs: 18, md: 24 } }} /> : <MenuBookIcon sx={{ color: 'text.secondary', fontSize: { xs: 18, md: 24 } }} />}
                              <Typography variant="body2" sx={{ width: { xs: 90, md: 220, xl: 280 }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} noWrap>{getText(lesson.title)}</Typography>
                              <Tooltip title={t('dashboard.continue_activity', 'Continuar l\'activitat')} arrow placement="top">
                                <IconButton size="small" onClick={() => navigate(`/courses/${currentCourse.slug}/${lesson.id}`)}>
                                  <InfoOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <LinearProgress variant="determinate" value={isCompleted ? 100 : 50} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'action.disabledBackground' }} />
                              <Typography variant="body2" sx={{ width: 44, textAlign: 'right', fontSize: { xs: '0.75rem', md: '0.875rem' } }} color="text.secondary">{isCompleted ? '100%' : '50%'}</Typography>
                            </Stack>
                            );
                          }) : (
                            <Typography variant="body2" color="text.secondary">
                              {flatLessons.length === 0
                                ? t('dashboard.no_lessons')
                                : t('dashboard.no_attempted_lessons')}
                            </Typography>
                          );
                        })()}
                      </Stack>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary">{t('dashboard.no_courses')}</Typography>
                )}
              </>
            )}
        </Box>
      </Container>
    </Box>
  );
}

type TopicSummary = { key: string; id: string; title: string; total: number; done: number };


function TopicList({ topics, hidden, icon: Icon, onOpen, moreLabel }: {
  topics: TopicSummary[];
  hidden: number;
  icon: typeof LaptopMacIcon;
  onOpen: (topicId: string) => void;
  moreLabel: string;
}) {
  return (
    <Stack spacing={{ xs: 1, xl: 1.5 }} sx={{ width: '100%', mt: 1 }}>
      {topics.map((topic) => (
        <Stack
          key={topic.key}
          direction="row" spacing={1}
          sx={{ alignItems: 'center', width: '100%', cursor: 'pointer', transition: 'color 0.15s', '&:hover': { '& .MuiTypography-root': { color: '#8400ff' } } }}
          onClick={() => onOpen(topic.id)}
        >
          <Icon sx={{ color: 'text.secondary', fontSize: 16 }} />
          <Typography variant="caption" sx={{ flex: 1, textAlign: 'left', fontSize: { xs: '0.75rem', xl: '0.85rem' } }} noWrap>{topic.title}</Typography>
          <LinearProgress
            variant="determinate"
            value={topic.total > 0 ? Math.round((topic.done / topic.total) * 100) : 0}
            sx={{ width: 40, height: 6, borderRadius: 3, bgcolor: 'action.disabledBackground' }}
          />
        </Stack>
      ))}
      {hidden > 0 && (
        <Typography
          variant="caption"
          sx={{ display: 'block', width: '100%', textAlign: 'left', color: 'text.secondary', fontSize: { xs: '0.7rem', xl: '0.75rem' } }}
        >
          {moreLabel}
        </Typography>
      )}
    </Stack>
  );
}

function DashboardCard({ title, children, muted, compact, minHeightXs }: { title: string; children: React.ReactNode; muted?: boolean; compact?: boolean; minHeightXs?: number }) {
  return (
    <Box sx={{
      border: '2px solid', borderColor: '#00685d', borderRadius: 3,
      p: { xs: 1.5, md: 2 },
      minHeight: { xs: minHeightXs ?? (compact ? 180 : 210), md: compact ? 260 : 270 },
      height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      bgcolor: 'background.paper', opacity: muted ? 0.7 : 1,
    }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700, textAlign: 'center', width: '100%', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
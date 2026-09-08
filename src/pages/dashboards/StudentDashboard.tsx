import {useState, useEffect, useMemo, useCallback, type FormEvent} from 'react';
import {useNavigate} from 'react-router-dom';
import {Box, Container, Typography, Stack, CircularProgress, Tabs, Tab, IconButton, LinearProgress, Avatar, Button, useMediaQuery, Tooltip, Divider,} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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

export default function StudentDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { mode } = useThemeMode();
  const [loading, setLoading] = useState(true);
  const [, setActionLoading] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dbProgress, setDbProgress] = useState<Record<string, boolean>>({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [courseTabIndex, setCourseTabIndex] = useState(0);

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
          const coursesFromApi = await courseService.getAllCourses();
          const fullCourses = await Promise.all(
            coursesFromApi.map(async (course) => {
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
            }),
          );
          setAllCourses(fullCourses);
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

  const getCoursePoints = (course: Course, studentId: string): number => {
    const topics = getCourseTopics(course);
    const studentData = getProgress(studentId);
    const done = topics.reduce((acc, topic) => acc + (topic.lessons?.filter(l => studentData[`${course.id}_${l.id}`] === true).length || 0), 0) || 0;
    return done * 10;
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

  const rankedStudentsByCourse = useMemo(() => {
    return [] as Student[];
  }, []);

  const stats = useMemo(() => {
    const course = allCourses[courseTabIndex] || null;
    if (!course || !selectedStudent) return { streak: 0, successRate: 0, remainingHours: 0 };
    const codeLessons = getFlatLessons(course).filter((l) => !isTestLesson(l));
    const progress = selectedStudent ? getProgress(selectedStudent.id) : {};
    const totalCode = codeLessons.length || 0;
    const doneCode = codeLessons.filter(
      (l) => progress[`${course.id}_${l.id}`] === true,
    ).length;
    const remainingLessons = totalCode - doneCode;
    const successRate = totalCode > 0 ? Math.round((doneCode / totalCode) * 100) : 0;
    const remainingHours = Math.round(remainingLessons * 0.5 * 10) / 10;
    const streak = (() => {
      const raw = localStorage.getItem(`mooc_streak_${selectedStudent.id}`);
      return raw ? parseInt(raw, 10) || 0 : 0;
    })();
    return { streak, successRate, remainingHours };
  }, [allCourses, courseTabIndex, selectedStudent, dbProgress]);

  if (loading) return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: mode === 'fancy' ? 'transparent' : 'background.default', zIndex: 9999 }}>
      <CircularProgress color="primary" />
    </Box>
  );

  const currentCourse = allCourses[courseTabIndex] || null;
  const currentProgress = currentCourse && selectedStudent ? getCourseProgress(currentCourse, selectedStudent.id) : 0;
  const progressData = selectedStudent ? getProgress(selectedStudent.id) : {};
  const flatLessons = currentCourse ? getFlatLessons(currentCourse) : [];
  const top3Ranking = rankedStudentsByCourse.slice(0, 3);

  const handleStatsClick = () => {
    navigate(`/courses/${currentCourse?.slug}/stats`);
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
                {/* --- Course tabs (Python / React / +) --- */}
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', mb: 5, mt: isTallScreen ? 25 : 0,
                  bgcolor: 'background.paper', borderRadius: 999, border: '2px solid', borderColor: '#00685d', px: { xs: 2, md: 5 },
                  flexWrap: 'wrap', maxWidth: '100%',
                }}>
                  <Tabs
                    value={courseTabIndex}
                    onChange={(_e, val) => setCourseTabIndex(val)}
                    slotProps={{ indicator: { style: { display: 'none' } } }}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ minHeight: 40, maxWidth: { xs: 200, sm: 'none' } }}
                  >
                    {allCourses.map((course) => (
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
                  <IconButton size="small" sx={{ ml: 0.5 }} onClick={() => navigate('/cursos')} aria-label={t('dashboard.add_course')}>
                    <AddIcon fontSize="small" />
                  </IconButton>
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

                      {/* Topics del curs */}
                      <Grid size={{ xs: 12, sm: 6, md: 2.4, xl: 2.4 }}>
                        <DashboardCard title={t('dashboard.code_problems')} compact={!isMdUp}>
                          <Stack spacing={{ xs: 1.5, xl: 2.5 }} sx={{ width: '100%', mt: 1 }}>
                            {flatLessons.filter(isCodeLesson).slice(0, lessonsSliceLimit).map((lesson: any, i: number) => {
                              const done = !!(selectedStudent && progressData[`${currentCourse.id}_${lesson.id}`] === true);
                              return (
                                <Stack
                                  key={lesson.id || i}
                                  direction="row" spacing={1}
                                  sx={{ alignItems: 'center', width: '100%', cursor: 'pointer', transition: 'color 0.15s', '&:hover': { '& .MuiTypography-root': { color: '#8400ff' } } }}
                                  onClick={() => navigate(`/courses/${currentCourse.slug}/${lesson.id}`)}
                                >
                                  <LaptopMacIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                  <Typography variant="caption" sx={{ flex: 1, textAlign: 'left', fontSize: { xs: '0.75rem', xl: '0.85rem' } }} noWrap>{getText(lesson.title)}</Typography>
                                  <LinearProgress variant="determinate" value={done ? 100 : 0} sx={{ width: 40, height: 6, borderRadius: 3, bgcolor: 'action.disabledBackground' }} />
                                </Stack>
                              );
                            })}
                            {flatLessons.filter(isCodeLesson).length === 0 && (
                              <Typography variant="caption" color="text.secondary">{t('dashboard.no_lessons')}</Typography>
                            )}
                          </Stack>
                          <Typography
                            variant="caption"
                            onClick={handleStatsClick}
                            sx={{ color: 'primary.main', fontWeight: 700, fontSize: { xs: '0.75rem', md: '0.85rem' }, letterSpacing: '0.1em', mt: 'auto', pt: 1, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {t('dashboard.view_stats')}
                          </Typography>
                        </DashboardCard>
                      </Grid>

                      {/* Subtopics del temari */}
                      <Grid size={{ xs: 12, sm: 6, md: 2.4, xl: 2.4 }}>
                        <DashboardCard title={t('dashboard.test_exercises')} compact={!isMdUp}>
                          <Stack spacing={{ xs: 1.5, xl: 2.5 }} sx={{ width: '100%', mt: 1 }}>
                            {flatLessons.filter(isTestLesson).slice(0, lessonsSliceLimit).map((lesson: any, i: number) => {
                              const done = !!(selectedStudent && progressData[`${currentCourse.id}_${lesson.id}`] === true);
                              return (
                                <Stack
                                  key={lesson.id || i}
                                  direction="row" spacing={1}
                                  sx={{ alignItems: 'center', width: '100%', cursor: 'pointer', transition: 'color 0.15s', '&:hover': { '& .MuiTypography-root': { color: '#8400ff' } } }}
                                  onClick={() => navigate(`/courses/${currentCourse.slug}/exam/${lesson.id}`)}
                                >
                                  <MenuBookIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                  <Typography variant="caption" sx={{ flex: 1, textAlign: 'left', fontSize: { xs: '0.75rem', xl: '0.85rem' } }} noWrap>{getText(lesson.title)}</Typography>
                                  <LinearProgress variant="determinate" value={done ? 100 : 0} sx={{ width: 40, height: 6, borderRadius: 3, bgcolor: 'action.disabledBackground' }} />
                                </Stack>
                              );
                            })}
                            {flatLessons.filter(isTestLesson).length === 0 && (
                              <Typography variant="caption" color="text.secondary">{t('dashboard.no_lessons')}</Typography>
                            )}
                          </Stack>
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
                                  bgcolor: s.id === selectedStudent?.id ? 'primary.main' : 'action.disabledBackground',
                                }}>{s.name.charAt(0).toUpperCase()}</Avatar>
                                <Typography variant="body2" sx={{ flex: 1, textAlign: 'center', fontSize: { xs: '0.8rem', md: '0.875rem' } }} noWrap>{s.name}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>{getCoursePoints(currentCourse, s.id)}</Typography>
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
                            spacing={2}
                            sx={{ flex: 1, py: 2, width: '100%', justifyContent: 'space-evenly', flexWrap: { xs: 'wrap', md: 'nowrap' } }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <WhatshotIcon sx={{ color: '#00685d', fontSize: { xs: 22, md: 30 } }} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {t('dashboard.streak')}: <Box component="span" sx={{ color: '#00685d', fontWeight: 700 }}>{stats.streak}</Box> {t('dashboard.days')}
                              </Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'none' } }} />
                            <Divider sx={{ display: { xs: 'none', md: 'block' } }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CheckCircleOutlinedIcon sx={{ color: '#00685d', fontSize: { xs: 22, md: 30 } }} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                {t('dashboard.success_rate')}: <Box component="span" sx={{ color: '#00685d', fontWeight: 700 }}>{stats.successRate}%</Box>
                              </Typography>
                            </Box>
                            <Divider sx={{ display: { xs: 'none', md: 'block' } }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTimeIcon sx={{ color: '#00685d', fontSize: { xs: 22, md: 30 } }} />
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
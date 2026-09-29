import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, Avatar, Stack, Tabs, Tab, Chip, useTheme, Grid } from '@mui/material';
import { Trophy, Medal, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { courseService } from '../../services/courseService';

interface StudentData {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  exercisesCompleted: number;
  totalExercises: number;
  progress: number;
  coursePoints: Record<string, number>;
}

const SHARED_PROGRESS_KEY = 'mooc_shared_all_progress';

function getCourseTopics(course: any): { title?: string; lessons: { id: string }[] }[] {
  if (course.topics && course.topics.length > 0) return course.topics;
  if (course.content && course.content.length > 0) {
    const lessons = course.content.flatMap((item: any) =>
      (item.subTopics || []).map((st: any) => ({
        id: st.problemSlug,
      }))
    );
    return [{ title: '', lessons }];
  }
  return [];
}

function getCourseProgress(course: any, studentId: string): number {
  const topics = getCourseTopics(course);
  const totalLessons = topics.reduce((acc, topic) => acc + (topic.lessons?.length || 0), 0) || 0;
  if (totalLessons === 0) return 0;
  const allProgress = JSON.parse(localStorage.getItem(SHARED_PROGRESS_KEY) || '{}');
  const studentData = allProgress[studentId] || {};
  const done = topics.reduce((acc, topic) => acc + (topic.lessons?.filter((l: any) => studentData[`${course.id}_${l.id}`]).length || 0), 0) || 0;
  return Math.round((done / totalLessons) * 100);
}

function getCoursePoints(course: any, studentId: string): number {
  const topics = getCourseTopics(course);
  const allProgress = JSON.parse(localStorage.getItem(SHARED_PROGRESS_KEY) || '{}');
  const studentData = allProgress[studentId] || {};
  const done = topics.reduce((acc, topic) => acc + (topic.lessons?.filter((l: any) => studentData[`${course.id}_${l.id}`]).length || 0), 0) || 0;
  return done * 10;
}

function getMedalColor(position: number): string {
  switch (position) {
    case 0: return '#FFD700';
    case 1: return '#C0C0C0';
    case 2: return '#CD7F32';
    default: return 'transparent';
  }
}

function getMedalEmoji(position: number): string {
  switch (position) {
    case 0: return '\uD83E\uDD47';
    case 1: return '\uD83E\uDD48';
    case 2: return '\uD83E\uDD49';
    default: return '';
  }
}

export function TeacherLeaderboard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [courses, setCourses] = useState<any[]>([]);
  const [rankingTab, setRankingTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const coursesFromApi = await courseService.getAllCourses();
        const fullCourses = await Promise.all(
          coursesFromApi.map(async (course) => {
            try {
              const detail = await courseService.getFullCourseDetail(course.slug!);
              return { ...course, topics: detail.content || [] };
            } catch {
              return course;
            }
          })
        );
        setCourses(fullCourses);
      } catch (err) {
        console.error('Error loading courses:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const students = useMemo(() => {
    const localStudents = JSON.parse(localStorage.getItem('mooc_local_students') || '[]');
    const deletedIds = JSON.parse(localStorage.getItem('mooc_deleted_ids') || '[]');
    return localStudents.filter(
      (s: any) => !deletedIds.includes(s.id) && s.role !== 'teacher'
    );
  }, []);

  const rankedStudents = useMemo<StudentData[]>(() => {
    const currentCourse = courses[rankingTab];
    if (!currentCourse) return [];

    return students
      .map((student: any) => {
        const coursePoints = getCoursePoints(currentCourse, student.id);
        const courseProgress = getCourseProgress(currentCourse, student.id);
        const totalPoints = courses.reduce((acc, course) => acc + getCoursePoints(course, student.id), 0);
        const totalExercises = courses.reduce((acc, course) => {
          const topics = getCourseTopics(course);
          return acc + topics.reduce((a, t) => a + (t.lessons?.length || 0), 0);
        }, 0);
        const exercisesCompleted = Math.round(totalPoints / 10);

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          totalPoints,
          exercisesCompleted,
          totalExercises,
          progress: courseProgress,
          coursePoints: { [currentCourse.id]: coursePoints },
        };
      })
      .sort((a: StudentData, b: StudentData) => b.totalPoints - a.totalPoints);
  }, [students, courses, rankingTab]);

  const totalExercises = useMemo(() => {
    return courses.reduce((acc, course) => {
      const topics = getCourseTopics(course);
      return acc + topics.reduce((a: number, t: any) => a + (t.lessons?.length || 0), 0);
    }, 0);
  }, [courses]);

  const stats = useMemo(() => ({
    totalStudents: students.length,
    totalExercises,
    avgProgress: rankedStudents.length
      ? Math.round(rankedStudents.reduce((acc, s) => acc + s.progress, 0) / rankedStudents.length)
      : 0,
    activeStudents: rankedStudents.filter(s => s.totalPoints > 0).length,
  }), [students, rankedStudents, totalExercises]);

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('teacher.cargando')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: 'center' }}>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 2, 
          bgcolor: 'warning.main', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Trophy size={24} color="#fff" />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {t('teacher.clasificacion')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('teacher.clasificacionDesc')}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="column" spacing={3}>
        <Box>
          <Card sx={{ 
            borderRadius: 3, 
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}>
            {courses.length > 0 && (
              <Tabs 
                value={rankingTab} 
                onChange={(_, val) => setRankingTab(val)} 
                variant="scrollable"
                sx={{ 
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'action.hover',
                  '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3 },
                }}
              >
                {courses.map(c => (
                  <Tab 
                    key={c.id} 
                    label={c.title || c.name || c.id} 
                    sx={{ 
                      fontWeight: 800, 
                      textTransform: 'none', 
                      minWidth: 0,
                      fontSize: '0.85rem',
                    }} 
                  />
                ))}
              </Tabs>
            )}
            
            <Box sx={{ p: { xs: 1.5, md: 3 } }}>
              {rankedStudents.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary">{t('teacher.sinEstudiantes')}</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {rankedStudents.map((student, idx) => {
                    const isTop3 = idx < 3;
                    const medalColor = getMedalColor(idx);
                    
                    return (
                      <Box
                        key={student.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: isTop3 
                            ? `${medalColor}15` 
                            : 'transparent',
                          border: isTop3 ? `2px solid ${medalColor}40` : '2px solid transparent',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: isTop3 ? `${medalColor}25` : 'action.hover',
                          },
                        }}
                      >
                        <Box sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: isTop3 ? medalColor : 'action.disabledBackground',
                          color: isTop3 ? '#fff' : 'text.secondary',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}>
                          {isTop3 ? getMedalEmoji(idx) : idx + 1}
                        </Box>

                        <Avatar sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: isTop3 ? medalColor : 'action.disabledBackground',
                          fontWeight: 700,
                          fontSize: '1rem',
                        }}>
                          {student.name.charAt(0)}
                        </Avatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {student.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.exercisesCompleted}/{student.totalExercises} {t('teacher.ejerciciosMin')}
                          </Typography>
                        </Box>

                        <Chip
                          label={`${student.totalPoints} ${t('teacher.puntos')}`}
                          sx={{ 
                            fontWeight: 900, 
                            bgcolor: isTop3 ? medalColor : 'primary.main',
                            color: '#fff',
                            fontSize: '0.85rem',
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Card>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              p: 3, 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}>
              <Box sx={{ color: 'primary.main', mb: 1, display: 'flex', justifyContent: 'center' }}>
                <TrendingUp size={40} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
                {stats.totalStudents}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('teacher.totalEstudiantes')}
              </Typography>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              p: 3, 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}>
              <Box sx={{ color: 'success.main', mb: 1, display: 'flex', justifyContent: 'center' }}>
                <Medal size={40} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.main' }}>
                {stats.activeStudents}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('teacher.alumnosActivos')}
              </Typography>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              p: 3, 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}>
              <Box sx={{ fontSize: 40, mb: 1, display: 'flex', justifyContent: 'center' }}>
                <Trophy size={40} color={theme.palette.warning.main} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'warning.main' }}>
                {stats.avgProgress}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('teacher.promedioProgreso')}
              </Typography>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card sx={{ 
              p: 3, 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}>
              <Box sx={{ color: 'info.main', mb: 1, display: 'flex', justifyContent: 'center' }}>
                <Medal size={40} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'info.main' }}>
                {stats.totalExercises}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('teacher.ejerciciosTotales')}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
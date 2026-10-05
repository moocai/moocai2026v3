import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Card, Avatar, Stack, Tabs, Tab, Chip, useTheme, Grid } from '@mui/material';
import { Trophy, Medal, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { courseService } from '../../services/courseService';

interface StudentData {
  id: string;
  name: string;
  email?: string;
  username?: string;
  totalPoints: number;
  exercisesCompleted: number;
  totalExercises: number;
  progress: number;
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
  const [ranking, setRanking] = useState<StudentData[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [totalExercises, setTotalExercises] = useState(0);

  // Cargar cursos al inicio
  useEffect(() => {
    (async () => {
      try {
        const [assignedFromApi, publicFromApi] = await Promise.all([
          courseService.getAllCourses().catch(() => []),
          courseService.getPublicCourses().catch(() => []),
        ]);

        const withDetails = async (course: any) => {
          try {
            const detail = await courseService.getFullCourseDetail(course.slug!);
            const topics = (detail.content || []).map((topic: any) => ({
              id: topic.id ?? topic.slug,
              title: topic.title,
              lessons: (topic.subTopics || []).map((st: any) => ({
                id: st.problemSlug,
                title: st.subtitle,
                type: st.type,
                choices: st.choices,
                precode: st.precode,
              })),
            }));
            return { ...course, topics };
          } catch { return course; }
        };

        const [assigned, pub] = await Promise.all([
          Promise.all(assignedFromApi.map(withDetails)),
          Promise.all(publicFromApi.map(withDetails)),
        ]);

        // Combinar cursos asignados y públicos, eliminando duplicados
        const allCourses = [...assigned];
        pub.forEach(course => {
          if (!allCourses.find(c => c.id === course.id)) {
            allCourses.push(course);
          }
        });

        setCourses(allCourses);
      } catch (err) {
        console.error('Error loading courses:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cargar ranking cuando cambia el curso seleccionado
  const loadRanking = useCallback(async (courseSlug: string) => {
    setRankingLoading(true);
    try {
      const res: any = await courseService.getCourseLeaderboard(courseSlug);
      const list = Array.isArray(res) ? res : (res?.results || []);
      
      // Mapear datos de la API al formato StudentData
      const mapped: StudentData[] = list.map((item: any, idx: number) => ({
        id: item.user_id || item.id || String(idx),
        name: item.full_name || item.username || item.name || `Estudiante ${idx + 1}`,
        email: item.email,
        username: item.username,
        totalPoints: item.total_points || item.points || 0,
        exercisesCompleted: item.completed_exercises || item.exercises_completed || 0,
        totalExercises: item.total_exercises || 0,
        progress: item.progress_percentage || item.progress || 0,
      }));
      
      setRanking(mapped);
      
      // Calcular total de ejercicios del curso
      if (list.length > 0 && list[0].total_exercises) {
        setTotalExercises(list[0].total_exercises);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  }, []);

  // Cargar ranking cuando cambia el tab
  useEffect(() => {
    if (courses.length > 0 && courses[rankingTab]) {
      loadRanking(courses[rankingTab].slug || courses[rankingTab].id);
    }
  }, [courses, rankingTab, loadRanking]);

  const stats = useMemo(() => ({
    totalStudents: ranking.length,
    totalExercises,
    avgProgress: ranking.length
      ? Math.round(ranking.reduce((acc, s) => acc + s.progress, 0) / ranking.length)
      : 0,
    activeStudents: ranking.filter(s => s.totalPoints > 0).length,
  }), [ranking, totalExercises]);

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
              {rankingLoading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary">{t('teacher.cargando')}</Typography>
                </Box>
              ) : ranking.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary">{t('teacher.sinEstudiantes')}</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {ranking.map((student, idx) => {
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
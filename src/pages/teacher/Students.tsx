import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { StatsCards } from '../../features/teacher/StatsCards';
import { StudentFilters } from '../../features/teacher/StudentFilters';
import { StudentTable } from '../../features/teacher/StudentTable';
import { courseService } from '../../services/courseService';
import type { FiltrosEstudiante, Estudiante } from '../../types';

export default function Students() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FiltrosEstudiante>({ buscar: '', estado: 'todos', orden: 'nombre' });
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(() => localStorage.getItem('teacher_selected_course') || '');
  const [students, setStudents] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Cargar cursos al inicio
  useEffect(() => {
    (async () => {
      try {
        const [assignedFromApi, publicFromApi] = await Promise.all([
          courseService.getAllCourses().catch(() => []),
          courseService.getPublicCourses().catch(() => []),
        ]);

        // Només calen les llistes (el selector mostra el títol): abans es baixava
        // també el detall complet (temes + problemes) de cada curs i no es feia servir.
        const assigned: any[] = assignedFromApi;
        const pub: any[] = publicFromApi;

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

  // Cargar estudiantes cuando cambia el curso seleccionado
  const loadStudents = useCallback(async (courseSlug: string) => {
    setStudentsLoading(true);
    try {
      const res: any = await courseService.getCourseLeaderboard(courseSlug);
      const list = Array.isArray(res) ? res : (res?.results || []);
      
      // Mapear datos de la API al formato Estudiante
      const mapped: Estudiante[] = list.map((item: any, idx: number) => ({
        id: item.user_id || item.id || String(idx),
        nombre: item.full_name || item.username || item.name || `Estudiante ${idx + 1}`,
        email: item.email || '',
        avatar: '',
        estado: (item.progress_percentage || item.progress || 0) >= 100 ? 'completado' as const : 
                (item.total_points || item.points || 0) > 0 ? 'activo' as const : 'inactivo' as const,
        progreso: item.progress_percentage || item.progress || 0,
        fechaInscripcion: item.date_joined || new Date().toISOString(),
        ultimoAcceso: item.last_activity || item.last_login || new Date().toISOString(),
        ejerciciosCompletados: item.completed_exercises || item.exercises_completed || 0,
        ejerciciosTotales: item.total_exercises || 0,
        notaPromedio: item.average_grade || item.grade || 0,
        cursoId: courseSlug,
      }));
      
      setStudents(mapped);
    } catch (err) {
      console.error('Error loading students:', err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  // Cargar estudiantes cuando cambia el curso
  useEffect(() => {
    if (selectedCourse) {
      loadStudents(selectedCourse);
    } else {
      setStudents([]);
    }
  }, [selectedCourse, loadStudents]);

  // Filtrar y ordenar estudiantes
  const filteredStudents = useMemo(() => {
    let result = [...students];
    
    // Filtrar por búsqueda
    if (filters.buscar) {
      const search = filters.buscar.toLowerCase();
      result = result.filter(s => 
        s.nombre.toLowerCase().includes(search) || 
        s.email.toLowerCase().includes(search)
      );
    }
    
    // Filtrar por estado
    if (filters.estado !== 'todos') {
      result = result.filter(s => s.estado === filters.estado);
    }
    
    // Ordenar
    result.sort((a, b) => {
      switch (filters.orden) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'progreso':
          return b.progreso - a.progreso;
        case 'ultimoAcceso':
          return new Date(b.ultimoAcceso).getTime() - new Date(a.ultimoAcceso).getTime();
        case 'nota':
          return b.notaPromedio - a.notaPromedio;
        default:
          return 0;
      }
    });
    
    return result;
  }, [students, filters]);

  // Calcular estadísticas
  const stats = useMemo(() => [
    { label: t('teacher.totalEstudiantes'), value: students.length },
    { label: t('teacher.cursosActivos'), value: courses.length },
    { label: t('teacher.promedioProgreso'), value: students.length > 0 
      ? `${Math.round(students.reduce((acc, s) => acc + s.progreso, 0) / students.length)}%` 
      : '0%' },
    { label: t('teacher.ejerciciosPendientes'), value: students.reduce((acc, s) => 
      acc + Math.max(0, s.ejerciciosTotales - s.ejerciciosCompletados), 0) },
  ], [students, courses, t]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 3 }}>{t('teacher.estudiantes')}</Typography>
      
      {/* Selector de curso */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel id="course-select-label">{t('teacher.seleccionarCurso')}</InputLabel>
          <Select
            labelId="course-select-label"
            value={selectedCourse}
            label={t('teacher.seleccionarCurso')}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCourse(val);
              localStorage.setItem('teacher_selected_course', val);
              const name = courses.find((c) => c.id === val)?.title || '';
              localStorage.setItem('teacher_selected_course_name', name);
              window.dispatchEvent(new Event('teacher-course-changed'));
            }}
          >
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.title || c.name || c.id}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {studentsLoading && <CircularProgress size={24} />}
      </Stack>

      <Box sx={{ mb: 3 }}><StatsCards stats={stats} /></Box>
      
      {selectedCourse ? (
        <>
          <StudentFilters filters={filters} onChange={setFilters} />
          <StudentTable estudiantes={filteredStudents} />
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">{t('teacher.seleccionaCursoParaDesbloquear')}</Typography>
        </Box>
      )}
    </Box>
  );
}
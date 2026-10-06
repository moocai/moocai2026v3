import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { prefetchAllCourses, prefetchCourseDetail } from '../hooks/useCourses';

export function MainLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch a la cache de React Query (mateixes queryKeys que la portada,
    // el dashboard i CourseLessons) → una única petició per curs. Només si hi
    // ha sessió; els errors no s'escapen (abans una promesa sense `.catch`
    // deixava una excepció no capturada a cada visita).
    prefetchAllCourses(queryClient)
      .then((courses: any[]) => {
        if (!courses) return;
        courses.forEach((course: any) => {
          prefetchCourseDetail(queryClient, course.slug!).catch(() => {});
        });
      })
      .catch(() => {});
  }, [queryClient]);

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { prefetchAllCourses } from '../hooks/useCourses';

export function MainLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch de la llista de cursos (mateixa queryKey que la portada i el dashboard).
    // El detall complet de cada curs NO es precarrega: són 2 + N peticions per curs
    // (una per tema) a cada càrrega de qualsevol pàgina. Cada pàgina demana el que necessita.
    // Els errors no s'escapen (abans una promesa sense `.catch` deixava una excepció no capturada).
    prefetchAllCourses(queryClient).catch(() => {});
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

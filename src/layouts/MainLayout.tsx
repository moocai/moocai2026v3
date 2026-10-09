import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from '../components/Header';

// El layout no precarrega res: cada pàgina demana només les dades que mostra
// (la pantalla de login, per exemple, no necessita cap llista de cursos).
export function MainLayout() {
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

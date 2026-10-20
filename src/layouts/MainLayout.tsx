import { Outlet, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from '../components/Header';

// El layout no precarrega res: cada pàgina demana només les dades que mostra
// (la pantalla de login, per exemple, no necessita cap llista de cursos).
export function MainLayout() {
  // Si el rol actual és professor, la zona d'alumne no es veu: es torna al tauler de professor.
  // El professor veu la part d'alumne canviant el rol amb el botó del Header.
  if (localStorage.getItem('mooc_role') === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      {/* Les pàgines a pantalla completa (curs, problema, tauler...) ocupen just aquesta alçada i
          fan scroll per dins; aquí només es fa scroll si una pàgina és més alta, perquè no quedi
          contingut tallat i inaccessible */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

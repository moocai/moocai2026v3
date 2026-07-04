import {Outlet} from 'react-router-dom';
import {Box} from '@mui/material';
import {Header} from '../components/Header';

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

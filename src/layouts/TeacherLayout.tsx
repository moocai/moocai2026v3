import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, Stack, Avatar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
const logo = '/img/logo.webp';
import { Sidebar } from '../features/teacher/Sidebar';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { ChatWidget } from '../features/teacher/ChatWidget';
import { useThemeMode } from '../hooks/useTheme';

export function TeacherLayout() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode } = useThemeMode();
  const isFancy = mode === 'fancy';

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 900) setMobileOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: isFancy ? 'transparent' : 'background.default' }}>
      {mobileOpen && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 20, display: { md: 'none' } }} onClick={() => setMobileOpen(false)} />
      )}
      <Box sx={{
        width: isCollapsed ? 64 : 256,
        position: { xs: mobileOpen ? 'fixed' : 'static', md: 'static' },
        left: 0, top: 0,
        height: { xs: mobileOpen ? '100vh' : 'auto', md: 'auto' },
        zIndex: 30,
        display: { xs: mobileOpen ? 'block' : isCollapsed ? 'none' : 'block', md: 'block' },
        transition: 'width 0.3s', flexShrink: 0,
      }}>
        <Sidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} onNavigate={() => setMobileOpen(false)} />
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box component="header" sx={{
          height: 64, borderBottom: 1, borderColor: 'divider',
          display: 'flex', alignItems: 'center', px: { xs: 2, md: 3 }, bgcolor: isFancy ? 'rgba(0,0,0,0.8)' : 'background.paper',
          boxShadow: isFancy ? 'none' : '0 1px 40px #8400ff',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 'auto' }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}><MenuIcon /></IconButton>
            <Box component="img" src={logo} alt="" width={438} height={190} sx={{ height: { xs: 22, md: 32 }, width: 'auto' }} />
            <Stack direction="row" sx={{ alignItems: 'baseline' }}>
              <Typography variant="h6" component="span" sx={{ fontWeight: 900, color: 'text.primary' }}>MOOC</Typography>
              <Typography variant="h6" component="span" sx={{ fontWeight: 900, color: 'primary.main', ml: 0.3 }}>2026</Typography>
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeToggleButton />
            <IconButton
              onClick={() => navigate('/dashboards/student')}
              sx={{
                width: 40, height: 40,
                bgcolor: 'action.hover',
                border: 2,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.selected', borderColor: 'primary.main' },
              }}
              title="Vista de estudiante"
            >
              <SchoolIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            </IconButton>
            <IconButton
              onClick={() => navigate('/teacher/profile')}
              sx={{
                width: 40, height: 40,
                bgcolor: 'action.hover',
                border: 2,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.selected', borderColor: 'primary.main' },
              }}
            >
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
      <ChatWidget />
    </Box>
  );
}
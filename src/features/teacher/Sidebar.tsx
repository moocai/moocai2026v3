import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, Collapse } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import CodeIcon from '@mui/icons-material/Code';
import BookIcon from '@mui/icons-material/Book';
import MailIcon from '@mui/icons-material/Mail';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

interface MenuItem {
  href?: string;
  labelKey: string;
  icon: string;
  children?: { href: string; labelKey: string; icon: string }[];
}

const teacherMenu: MenuItem[] = [
  { href: '/teacher', labelKey: 'teacher.inicio', icon: 'home' },
  { href: '/teacher/students', labelKey: 'teacher.estudiantes', icon: 'users' },
  { labelKey: 'teacher.zonaEducativa', icon: 'book', children: [
    { href: '/teacher/exercises', labelKey: 'teacher.ejercicios', icon: 'code' },
    { href: '/teacher/exercises/list', labelKey: 'teacher.listaEjercicios', icon: 'clipboard' },
  ]},
  { href: '/teacher/hackathon', labelKey: 'teacher.hackathon', icon: 'code' },
  { href: '/teacher/courses', labelKey: 'teacher.cursos', icon: 'book' },
  { href: '/teacher/invite', labelKey: 'teacher.invitar', icon: 'mail' },
];

function SidebarIcon({ icon, isActive }: { icon: string; isActive: boolean }) {
  const props = { sx: { color: isActive ? 'primary.main' : 'text.secondary', fontSize: 20 } };
  switch (icon) {
    case 'home': return <HomeIcon {...props} />;
    case 'users': return <PeopleIcon {...props} />;
    case 'school': return <SchoolIcon {...props} />;
    case 'code': return <CodeIcon {...props} />;
    case 'book': return <BookIcon {...props} />;
    case 'clipboard': return <SchoolIcon {...props} />;
    case 'mail': return <MailIcon {...props} />;
    default: return <HomeIcon {...props} />;
  }
}

export function Sidebar({ isCollapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [submenuOpen, setSubmenuOpen] = useState(() => localStorage.getItem('teacher_submenu') === 'true');

  useEffect(() => {
    localStorage.setItem('teacher_submenu', String(submenuOpen));
  }, [submenuOpen]);

  const handleNav = (href: string) => {
    onNavigate?.();
    navigate(href);
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <Box sx={{ height: '100%', width: isCollapsed ? 64 : 256, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', p: 1.5, minHeight: 56 }}>
        {!isCollapsed && (
          <Box onClick={() => handleNav('/teacher')} sx={{ fontWeight: 700, fontSize: 18, textDecoration: 'none', color: 'text.primary', cursor: 'pointer' }}>
            {t('teacher.appName')}
          </Box>
        )}
        <IconButton onClick={onToggleCollapse} size="small">
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ flex: 1, overflow: 'auto', px: 0.5, py: 0 }}>
        {teacherMenu.map((item) => {
          if (item.children) {
            return (
              <Box key={item.labelKey}>
                <ListItemButton onClick={() => setSubmenuOpen(!submenuOpen)} sx={{ borderRadius: 1, mb: isCollapsed ? 1.5 : 0.5, justifyContent: isCollapsed ? 'center' : 'flex-start', py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
                    <SidebarIcon icon={item.icon} isActive={false} />
                  </ListItemIcon>
                  {!isCollapsed && (
                    <>
                      <ListItemText primary={t(item.labelKey)} sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }} />
                      {submenuOpen ? <ExpandLess /> : <ExpandMore />}
                    </>
                  )}
                </ListItemButton>
                <Collapse in={submenuOpen && !isCollapsed}>
                  <List disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton key={child.href} onClick={() => handleNav(child.href)} selected={isActive(child.href)} sx={{ borderRadius: 1, ml: 2, mb: 0.5, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <SidebarIcon icon={child.icon} isActive={isActive(child.href)} />
                        </ListItemIcon>
                        <ListItemText primary={t(child.labelKey)} sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }
          return (
            <ListItemButton key={item.href} onClick={() => handleNav(item.href!)} selected={isActive(item.href!)} sx={{ borderRadius: 1, mb: isCollapsed ? 1.5 : 0.5, justifyContent: isCollapsed ? 'center' : 'flex-start', py: 0.75 }}>
              <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
                <SidebarIcon icon={item.icon} isActive={isActive(item.href!)} />
              </ListItemIcon>
              {!isCollapsed && <ListItemText primary={t(item.labelKey)} sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }} />}
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <ListItemButton onClick={() => { localStorage.removeItem('currentStudent'); localStorage.removeItem('mooc_role'); navigate('/dashboards/student'); }} sx={{ borderRadius: 1, mx: 0.5, my: 0.5, justifyContent: isCollapsed ? 'center' : 'flex-start', py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
            <LogoutIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary={t('teacher.cerrarSesion')} sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }} />}
        </ListItemButton>
      </Box>
    </Box>
  );
}
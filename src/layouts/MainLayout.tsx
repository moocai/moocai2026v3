import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from '../components/Header';
import { courseService } from '../services/courseService';

export function MainLayout() {
  useEffect(() => {
    courseService.getAllCourses().then(courses => {
      courses.forEach(course => {
        courseService.getFullCourseDetail(course.slug!).catch(() => { /* precàrrega opcional */ });
      });
    }).catch(() => { /* precàrrega opcional: cada pàgina carrega el que necessita */ });
  }, []);

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

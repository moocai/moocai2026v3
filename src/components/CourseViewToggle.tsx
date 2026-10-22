import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCourseRole } from '../hooks/useCourseRole';

type View = 'student' | 'teacher';

interface CourseViewToggleProps {
  size?: 'small' | 'large';
  onChange?: () => void;
}

// Student/teacher view switch for the course being viewed. Only rendered on a
// course page, and only when the user is a professor in that course.
export function CourseViewToggle({ size = 'small', onChange }: CourseViewToggleProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const teacherMatch = matchPath('/teacher/:courseId/*', pathname);
  const studentMatch = matchPath('/courses/:courseId/*', pathname);
  const courseId = (teacherMatch ?? studentMatch)?.params.courseId;
  const view: View = teacherMatch ? 'teacher' : 'student';
  const { isProfessor } = useCourseRole(courseId);

  if (!courseId || !isProfessor) return null;

  const handleChange = (next: View) => {
    if (next !== view) navigate(next === 'teacher' ? `/teacher/${courseId}` : `/courses/${courseId}`);
    onChange?.();
  };

  const large = size === 'large';
  const inset = large ? 4 : 3;
  const radius = large ? '10px' : '6px';
  const buttonSx = (active: boolean) => ({ flex: 1, zIndex: 1, borderRadius: radius, fontWeight: 800, fontSize: large ? '0.85rem' : '0.7rem', textTransform: 'none', color: active ? '#fff' : 'text.secondary', minWidth: 0, '&:hover': { bgcolor: 'transparent' } });

  return (
    <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderRadius: large ? '12px' : '8px', p: large ? 0.5 : 0.3, position: 'relative', width: large ? '100%' : '130px', height: large ? '44px' : '32px' }}>
      <Box sx={{ position: 'absolute', top: inset, bottom: inset, left: view === 'student' ? inset : `calc(50% + ${inset - 2}px)`, width: `calc(50% - ${inset + 1}px)`, bgcolor: 'primary.main', borderRadius: radius, transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
      <Button disableRipple onClick={() => handleChange('student')} sx={buttonSx(view === 'student')}>{t('dashboard.role_student')}</Button>
      <Button disableRipple onClick={() => handleChange('teacher')} sx={buttonSx(view === 'teacher')}>{t('dashboard.role_teacher')}</Button>
    </Box>
  );
}

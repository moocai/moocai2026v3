import { AnimatePresence, motion } from 'framer-motion';
import { Box, Typography, Card, Stack, IconButton, Tooltip, useTheme } from '@mui/material';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Course, Student, Topic } from './types';
import { type MouseEvent } from 'react';
import { CourseIcon } from './CourseIcon';
import { CourseExpandedContent } from './CourseExpandedContent';

interface Props {
  course: Course;
  isExpanded: boolean;
  onToggle: () => void;
  selectedStudent: Student;
  getText: (field: any) => string;
  getCoursePoints: (course: Course, studentId: string) => number;
  onResetCourse: (e: MouseEvent, courseId: string) => void;
  dbProgress: Record<string, boolean>;
  getCourseTopics: (course: Course) => Topic[];
  onNavigate: (path: string) => void;
}

export function CourseCard({
  course,
  isExpanded,
  onToggle,
  selectedStudent,
  getText,
  getCoursePoints,
  onResetCourse,
  dbProgress,
  getCourseTopics,
  onNavigate,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box sx={{ position: 'relative' }}>
      
      <Card 
        component={motion.div}
        sx={{
          p: { xs: 2, md: 3 }, 
          cursor: 'default', 
          borderRadius: { xs: 1.5, md: 1 }, 
          bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : 'white', 
          border: '1px solid', 
          borderColor: isExpanded ? 'primary.main' : (theme.palette.mode === 'dark' ? '#fff' : '#000'), 
          transition: '0.2s', 
          minWidth: 0, 
          minHeight: { xs: 110, md: 120 }, 
          position: 'relative', 
          zIndex: isExpanded ? 50 : 0, 
          width: '100%', 
          overflow: 'hidden' 
        }}
      >
        <motion.div
          initial={false}
          animate={isExpanded ? { x: '560%', skewX: -25 } : { x: '-200%', skewX: -25 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '35%',
            height: '100%',
            background: 'linear-gradient(135deg, transparent, #8400ff46, transparent)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 900, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{getText(course.title)}</Typography>
            <Box sx={{ p: 0.5, bgcolor: 'primary.main' + '1A', borderRadius: '4px', flexShrink: 0, mt: { xs: 2, md: 0 }}}><CourseIcon title={course.title} /></Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.9rem' }}>{getCoursePoints(course, selectedStudent.id)} {t('dashboard.points')}</Typography>
            <Tooltip title={t('dashboard.reset_course_tooltip')}>
              <IconButton onClick={(e) => onResetCourse(e, course.id)} size="small" sx={{ color: 'red', '&:hover': { color: 'error.main' } }}><RotateCcw size={15} /></IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <Box component="button" type="button" disabled={course.disabled} onClick={() => onNavigate(`/courses/${course.id}`)} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: course.disabled ? 'default' : 'pointer', bgcolor: '#8400ff', border: 'none', borderRadius: '8px', px: 1, py: 0.25, color: '#fff', width: 'fit-content', opacity: course.disabled ? 0.5 : 1, '&:hover': { opacity: course.disabled ? 0.5 : 0.8 } }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{t('dashboard.syllabus')}</Typography>
              <ChevronRight size={15} />
            </Box>
            <Box component="button" type="button" onClick={(e) => {e.stopPropagation(); onToggle();}} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', bgcolor: 'transparent', border: '1px solid #8400ff', borderRadius: '8px', pl: 0.5, pr: 0.25, py: 0.25, color: theme.palette.mode === 'light' ? '#000' : 'text.secondary', width: 'fit-content', '&:hover': { opacity: 0.7 } }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{t('dashboard.labs')}</Typography>
              <ChevronRight size={15} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: '0.3s'}} />
            </Box>
          </Box>
        </Stack>
      </Card>
                    
      <AnimatePresence>
        {isExpanded && (
          <CourseExpandedContent
            course={course}
            dbProgress={dbProgress}
            getText={getText}
            getCourseTopics={getCourseTopics}
            onNavigate={onNavigate}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </Box>
  );
}
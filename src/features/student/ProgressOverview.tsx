import {Box, Typography, Card, Stack, useTheme} from '@mui/material';
import {useTranslation} from 'react-i18next';
import {Course} from './types';

interface Props {
  courses: Course[];
  getText: (field: any) => string;
  getCourseProgress: (course: Course, studentId: string) => number;
  getCoursePoints: (course: Course, studentId: string) => number;
  studentId: string;
}

export function ProgressOverview({ courses, getText, getCourseProgress, getCoursePoints, studentId }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const hoverBg = theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'action.hover';

  return (
    <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 2, md: 1 }, bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : 'white', border: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#fff' : '#000', display: { xs: 'none', md: 'block' }, maxWidth: '280px', width: '100%', mt: { xs: 0, md: '-105px !important' } }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>{t('dashboard.progress_detail')}</Typography>
      <Stack spacing={2}>
        {courses.map(course => (
          <Box key={course.id}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5}}>
              <Typography variant="caption" sx={{ fontWeight: 600 ,fontSize: '0.8rem'}}>{getText(course.title)}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main' , fontSize: '1rem'}}>{getCoursePoints(course, studentId)} {t('dashboard.points')}</Typography>
            </Box>
            {(() => {
              const pct = getCourseProgress(course, studentId);
              const pts = getCoursePoints(course, studentId);
              console.log('ProgressOverview', course.id, {pct, pts, studentId});
              return (
                <Box>
                  <Box sx={{ width: '100%', height: 8, borderRadius: 4, bgcolor: hoverBg, overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.max(pct, pts > 0 ? 5 : 0)}%`, height: '100%', bgcolor: '#8400ff', borderRadius: 4, transition: 'width 0.3s ease' }} />
                  </Box>
                </Box>
              );
            })()}
          </Box>
        ))}
      </Stack>
    </Card>
  );
}

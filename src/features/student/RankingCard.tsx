import {Box, Typography, Card, Avatar, Tabs, Tab, Stack, useTheme} from '@mui/material';
import {Trophy} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Course, Student} from './types';

interface Props {
  courses: Course[];
  rankingTab: number;
  onRankingTabChange: (tab: number) => void;
  rankedStudents: Student[];
  getText: (field: any) => string;
  getCoursePoints: (course: Course, studentId: string) => number;
  // getCourseProgress: (course: Course, studentId: string) => number; // ELIMINA O COMENTA AIXÒ
  selectedStudent: Student | null;
  allCourses: Course[];
}

export function RankingCard({ courses, rankingTab, onRankingTabChange, rankedStudents, getText, getCoursePoints, selectedStudent, allCourses }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ mb: { xs: 2, md: 2 }, alignItems: 'center', mt: { xs: 10, md: 12}}}>
        <Trophy size={22} color="#ffb700" />
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{t('dashboard.ranking_title')}</Typography>
      </Stack>
      <Card sx={{ borderRadius: { xs: 1, md: 1}, bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : 'white', border: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#fff' : '#000', overflow: 'hidden', minWidth: 0, width: '100%'}}>
        <Tabs value={rankingTab} onChange={(_, val) => onRankingTabChange(val)} variant="scrollable" sx={{ bgcolor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'action.hover', '& .MuiTabs-indicator': { bgcolor: 'primary.main' }}}>
          {courses.map(c => <Tab key={c.id} label={getText(c.title)} sx={{ fontWeight: 800, textTransform: 'none', minWidth: 0, whiteSpace: 'nowrap',ml: { xs: 0, md: 15 }, fontSize: { xs: '0.7rem', md: '0.875rem' }}} />)}
        </Tabs>
        <Box sx={{ p: { xs: 0.5, md: 4 }, height: { xs: '150px', md: '243px' }, overflowY: 'auto', overflowX: 'hidden' }}>
          <Stack spacing={{ xs: 0.5, md: 2 }}>
            {rankedStudents.map((s, idx) => {
              const isMe = s.id === selectedStudent?.id;
              return (
                <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, py: { xs: 0.5, md: 0 } }}>
                  <Typography sx={{ width: 18, fontWeight: 900, color: idx < 3 ? '#ffb700' : 'text.secondary', flexShrink: 0, fontSize: '0.7rem' }}>{idx + 1}</Typography>
                  <Avatar sx={{ width: { xs: 18, md: 32 }, height: { xs: 20, md: 32 }, bgcolor: isMe ? 'primary.main' : 'action.disabled', flexShrink: 0, fontSize: { xs: '0.4rem', md: '0.875rem' } }}>{s.name.charAt(0)}</Avatar>
                  <Typography sx={{ flex: 1, fontWeight: isMe ? 900 : 900, color: isMe ? 'primary.main' : 'text.primary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '1rem' }}>
                    {s.name} {isMe && `(${t('dashboard.you')})`}
                  </Typography>
                  <Typography sx={{ fontWeight: 900, color: 'primary.main', flexShrink: 0, fontSize: '0.8rem' }}>
                    {getCoursePoints(allCourses[rankingTab], s.id)} {t('dashboard.points')}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Card>
    </>
  );
}
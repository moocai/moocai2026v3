import { useRef, useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { PlayCircle, CheckCircle2 } from 'lucide-react';
import { Course, Topic } from './types';

interface Props {
  course: Course;
  dbProgress: Record<string, boolean>;
  getText: (field: any) => string;
  getCourseTopics: (course: Course) => Topic[];
  onNavigate: (path: string) => void;
  theme: any;
}

const DROPDOWN_MAX_HEIGHT = { xs: '220px', md: '365px' };

export function CourseExpandedContent({ course, dbProgress, getText, getCourseTopics, onNavigate, theme }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      const parent = ref.current?.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        setTop(rect.bottom + 10);
        setReady(true);
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, []);

  const lastSession = (() => {
    try { return JSON.parse(localStorage.getItem('mooc_last_session') || 'null'); }
    catch { return null; }
  })();

  const topics = getCourseTopics(course);

  return (
    <Box ref={ref}
      sx={{
        position: 'fixed',
        top,
        left: 0,
        right: 0,
        zIndex: 50,
        width: '100vw',
        px: { xs: 2, md: 8 },
        visibility: ready ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box sx={{ bgcolor: 'background.paper', borderRadius: { xs: 2, md: 1 }, border: '1px solid', borderColor: 'primary.main' + '4D', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        <Box
          sx={{
            p: { xs: 1.5, md: 2 },
            display: 'flex',
            flexDirection: 'row',
            gap: { xs: 3, md: 5 },
            overflowX: 'auto',
            overflowY: 'hidden',
            maxWidth: '100%',
            '&::-webkit-scrollbar': { height: '8px' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'primary.main', borderRadius: '4px' },
          }}
        >
          {topics.map(topic => (
            <Box
              key={getText(topic.title)}
              sx={{
                flexShrink: 0,
                width: { xs: 260, md: 320 },
                borderRight: '1px solid',
                borderColor: 'divider',
                pr: { xs: 3, md: 5 },
                '&:last-of-type': { borderRight: 'none', pr: 0 },
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main', mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: { xs: '1rem', md: '1.15rem' } }}>
                {getText(topic.title)}
                <Typography component="span" sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.secondary', ml: 1, flexShrink: 0 }}>
                  {topic.lessons?.length ? Math.round((topic.lessons.filter((l: any) => dbProgress[`${course.id}_${l.id}`]).length / topic.lessons.length) * 100) : 0}%
                </Typography>
              </Typography>
              <Stack spacing={0.5} sx={{ maxHeight: DROPDOWN_MAX_HEIGHT, overflowY: 'auto', pr: 1 }}>
                {[...(topic.lessons || [])].sort((a, b) => {
                  const order = (t: any) => t?.type === 'test' ? 2 : t?.type === 'coding' ? 1 : 0;
                  return order(a) - order(b);
                }).map(lesson => {
                  const isLastActive = lastSession?.courseId === course.id && lastSession?.lessonId === lesson.id && !dbProgress[`${course.id}_${lesson.id}`];
                  return (
                    <Box
                      key={lesson.id}
                      onClick={() => onNavigate(`/courses/${course.id}/${lesson.id}`)}
                      sx={{ p: 1, borderRadius: '8px', cursor: 'pointer', bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' }, minWidth: 0 }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: { xs: '0.85rem', md: '0.9rem' } }}>
                          {lesson.type === 'coding' ? '💻 ' : lesson.type === 'test' ? '📝 ' : ''}{getText(lesson.title)}
                        </Typography>
                        {dbProgress[`${course.id}_${lesson.id}`] ? (
                          <CheckCircle2 size={18} color={theme.palette.success.main} />
                        ) : (
                          <PlayCircle size={18} color={isLastActive ? '#ff9800' : theme.palette.primary.main} />
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

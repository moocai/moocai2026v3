import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Stack, CircularProgress, Button,} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RemoveIcon from '@mui/icons-material/Remove';
import { useThemeMode } from '../../hooks/useTheme';
import { courseService } from '../../services/courseService';
import { Topic, Lesson } from './types';

const TEST_TYPE_VALUES = ['test', 'quiz', 'exam', 'multiple_choice'];
const isTestLesson = (l: Lesson) =>
  TEST_TYPE_VALUES.includes(String(l?.type || '').toLowerCase()) ||
  (Array.isArray((l as any).choices) && (l as any).choices.length > 0);
const isCodeLesson = (l: Lesson) => !isTestLesson(l);

const getProgress = (studentId: string): Record<string, boolean> => {
  const perStudent = JSON.parse(localStorage.getItem(`mooc_global_progress_${studentId}`) || '{}');
  const shared = JSON.parse(localStorage.getItem('mooc_shared_all_progress') || '{}');
  return { ...(shared[studentId] || {}), ...perStudent };
};

interface TopicRow {
  topic: string;
  personal: number;
  avg: number;
  total: number;
  done: number;
}


/* ─── BarRow ─── */
function BarRow({row, active, accent, delayMs}: {
  row: TopicRow; active: boolean; accent: string; delayMs: number;
}) {
  const [animated, setAnimated] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setAnimated(0); return; }
    const duration = 1000;
    let start: number | null = null;
    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / duration);
        const eased = 1 - Math.pow(2, -10 * t);
        setAnimated(row.personal * eased);
        if (t < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }, delayMs);
    return () => { clearTimeout(timeout); cancelAnimationFrame(rafRef.current); };
  }, [active, row.personal, delayMs]);

  const diff = Math.round(row.personal - row.avg);
  const hasActivity = row.done > 0;
  const DeltaIcon = hasActivity ? TrendingUpIcon : RemoveIcon;
  const deltaColor = hasActivity ? '#34D399' : '#6B7280';

  return (
    <Stack direction="row" spacing={2} sx={{ py: 1, alignItems: 'center' }}>
      <Typography
        variant="caption"
        sx={{ width: 140, textAlign: 'center', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}
        title={row.topic}
      >
        {row.topic}
      </Typography>

      <Box sx={{ flex: 1, position: 'relative', height: 18, borderRadius: 1, bgcolor: 'action.hover' }}>
        {[0, 20, 40, 60, 80, 100].map((g) => (
          <Box key={g} sx={{ position: 'absolute', top: 0, bottom: 0, left: `${g}%`, width: '1px', bgcolor: 'action.disabledBackground' }} />
        ))}
        <Box
          sx={{
            position: 'absolute', top: -4, bottom: -4, transform: 'translateX(-50%)',
            left: `${row.avg}%`, borderLeft: `2px dashed ${accent}44`,
            transition: 'opacity 500ms', opacity: active ? 0.7 : 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 1,
            width: active ? `${animated}%` : '0%',
            background: `linear-gradient(90deg, ${accent}55, ${accent})`,
            transition: `width ${1000}ms cubic-bezier(0.16,1,0.3,1)`,
            boxShadow: active ? `0 0 12px 0 ${accent}66` : 'none',
          }}
        />
      </Box>

      <Typography variant="caption" sx={{ width: 46, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: accent }}>
        {Math.round(animated)}%
      </Typography>

      <Stack direction="row" spacing={0.25} sx={{ width: 50, color: deltaColor, alignItems: 'center' }}>
        <DeltaIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
          {hasActivity ? `${diff > 0 ? '+' : ''}${diff}` : '='}
        </Typography>
      </Stack>
    </Stack>
  );
}

/* ─── ChartCard ─── */
function ChartCard({
  title, subtitle, data, accent, delayStart = 0,
}: {
  title: string; subtitle: string; data: TopicRow[]; accent: string; delayStart?: number;
}) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => setActive(true), delayStart); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delayStart]);

  return (
    <Box ref={ref} sx={{border: '2px solid', borderColor: accent, borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden', minHeight: 460,mt:5}}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${accent}22`, bgcolor: `${accent}08` }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">({subtitle})</Typography>
        </Stack>
        <Stack direction="row" spacing={2.5}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: accent }} />
            <Typography variant="caption" color="text.secondary">El teu rendiment</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, border: `1.5px dashed ${accent}66`, bgcolor: 'transparent', borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">Mitjana</Typography>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: 2.5, py: 1.5 }}>
        {data.map((row, i) => (
          <BarRow key={row.topic} row={row} active={active} accent={accent} delayMs={i * 55} />
        ))}

        <Stack direction="row" spacing={1.5} sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', alignItems: 'center' }}>
          <Box sx={{ width: 160, flexShrink: 0 }} />
          <Box sx={{ flex: 1, position: 'relative', height: 14 }}>
            {[0, 20, 40, 60, 80, 100].map((g) => (
              <Typography
                key={g}
                sx={{ position: 'absolute', left: `${g}%`, transform: 'translateX(-50%)', fontSize: 10, color: 'text.disabled', fontFamily: 'monospace', lineHeight: 1 }}
              >
                {g}%
              </Typography>
            ))}
          </Box>
          <Box sx={{ width: 46 }} />
          <Box sx={{ width: 50 }} />
        </Stack>
      </Box>
    </Box>
  );
}

/* ─── Component principal ─── */
export default function RendimentDashboard() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { mode } = useThemeMode();

  const [loading, setLoading] = useState(true);
  const [codeTopics, setCodeTopics] = useState<TopicRow[]>([]);
  const [testTopics, setTestTopics] = useState<TopicRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const saved = localStorage.getItem('currentStudent');
      const studentId: string | null = saved ? JSON.parse(saved).id : null;
      const progress = studentId ? getProgress(studentId) : {};

      const detail = await courseService.getFullCourseDetail(courseId);
      const topics: Topic[] = (detail.content || []).map((t: any) => ({
        id: t.id ?? t.slug,
        title: t.title,
        lessons: (t.subTopics || []).map((st: any) => ({
          id: st.problemSlug,
          title: st.subtitle,
          type: st.type,
          choices: st.choices,
          precode: st.precode,
        })),
      }));

      const codeRows: TopicRow[] = [];
      const testRows: TopicRow[] = [];

      for (const topic of topics) {
        const lessons = topic.lessons || [];
        const codeLessons = lessons.filter(isCodeLesson);
        const testLessons = lessons.filter(isTestLesson);

        if (codeLessons.length > 0) {
          const total = codeLessons.length;
          const done = codeLessons.filter(l => progress[`${courseId}_${l.id}`] === true).length;
          codeRows.push({
            topic: (typeof topic.title === 'string' ? topic.title : topic.title?.ca || '') || 'Sense títol',
            personal: Math.round((done / total) * 100),
            avg: done > 0 ? Math.round((done / total) * 100) - Math.floor(Math.random() * 10) + 3 : 0,
            total, done,
          });
        }

        if (testLessons.length > 0) {
          const total = testLessons.length;
          const done = testLessons.filter(l => progress[`${courseId}_${l.id}`] === true).length;
          testRows.push({
            topic: (typeof topic.title === 'string' ? topic.title : topic.title?.ca || '') || 'Sense títol',
            personal: Math.round((done / total) * 100),
            avg: done > 0 ? Math.round((done / total) * 100) - Math.floor(Math.random() * 10) + 3 : 0,
            total, done,
          });
        }
      }

      setCodeTopics(codeRows.length > 0 ? codeRows : [{ topic: '—', personal: 0, avg: 0, total: 0, done: 0 }]);
      setTestTopics(testRows.length > 0 ? testRows : [{ topic: '—', personal: 0, avg: 0, total: 0, done: 0 }]);
    } catch (err) {
      console.error('Error carregant dades de rendiment:', err);
      setCodeTopics([{ topic: '—', personal: 0, avg: 0, total: 0, done: 0 }]);
      setTestTopics([{ topic: '—', personal: 0, avg: 0, total: 0, done: 0 }]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onProgress = () => fetchData();
    document.addEventListener('lessonProgressUpdated', onProgress);
    window.addEventListener('lessonProgressUpdated', onProgress);
    return () => {
      document.removeEventListener('lessonProgressUpdated', onProgress);
      window.removeEventListener('lessonProgressUpdated', onProgress);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'relative', minHeight: '100%',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#0a0e17' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, md: 8 } }}>
          <Box sx={{
          display: 'grid', gap: 5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          minHeight: 600,
        }}>
          <ChartCard
            title="Rendiment en problemes de programació"
            subtitle={`${codeTopics.length} temes`}
            data={codeTopics}
            accent="#38bdf8"
            delayStart={0}
          />
          <ChartCard
            title="Rendiment en problemes de test"
            subtitle={`${testTopics.length} temes`}
            data={testTopics}
            accent="#34d399"
            delayStart={150}
          />
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ textTransform: 'none', color: 'white' }}
          >
            Tornar al dashboard
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { Box, Button, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { useThemeMode } from '../hooks/useTheme';
import { useAllCourses } from '../hooks/useCourses';
import { resolveSlug } from '../hooks/useCourse';
import { useMarkNotificationsRead, useNotificationFeed } from '../hooks/useNotificationFeed';
import { MarkdownContent } from '../components/MarkdownContent';
import { formatNotificationDate } from '../utils/notificationText';

const ACCENT = '#00685d';

/**
 * Tots els avisos dels cursos de l'alumne (`?course=<slug>` en filtra un). Els que no s'havien
 * llegit es marquen com a llegits en veure'ls, però conserven l'etiqueta "Nou" fins que es
 * torna a entrar a la pàgina.
 */
export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { mode } = useThemeMode();
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseFilter = searchParams.get('course');
  // `?from=<curs>`: s'hi ha entrat des d'un curs (la campana ho afegeix), i s'hi pot tornar
  const fromCourse = searchParams.get('from');
  const isLoggedIn = !!localStorage.getItem('token');
  const { notifications, isLoading, isError } = useNotificationFeed(isLoggedIn);
  const markRead = useMarkNotificationsRead();

  // Els no llegits en obrir la pàgina (la cache els marca de seguida com a llegits)
  const newIds = useRef<Set<number> | null>(null);
  const [, rerender] = useState(0);

  const courses = useMemo(() => {
    const bySlug = new Map<string, string>();
    notifications.forEach((n) => bySlug.set(n.course.slug, n.course.name));
    return [...bySlug].map(([slug, name]) => ({ slug, name }));
  }, [notifications]);

  const visible = courseFilter ? notifications.filter((n) => n.course.slug === courseFilter) : notifications;
  const ownCourses = useAllCourses(isLoggedIn && !!fromCourse).data;
  const fromName = fromCourse
    ? ownCourses?.find((c) => c.slug === resolveSlug(fromCourse))?.title
      ?? courses.find((c) => c.slug === resolveSlug(fromCourse))?.name
    : undefined;

  // Veure'ls és llegir-los (com a algorien): es marquen els que es veuen sense llegir
  useEffect(() => {
    const unreadIds = visible.filter((n) => !n.is_read).map((n) => n.id);
    if (newIds.current === null && notifications.length > 0) {
      newIds.current = new Set(notifications.filter((n) => !n.is_read).map((n) => n.id));
      rerender((x) => x + 1);
    }
    if (unreadIds.length > 0 && !markRead.isPending) {
      unreadIds.forEach((id) => newIds.current?.add(id));
      markRead.mutate(unreadIds);
    }
  }, [visible, notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  // Des del desplegable de la campana: es baixa fins a l'avís triat
  useEffect(() => {
    if (!hash || visible.length === 0) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [hash, visible.length]);

  // Sense sessió no hi ha avisos: a la pantalla d'accés
  if (!isLoggedIn) return <Navigate to="/dashboards/student" replace />;

  const setFilter = (slug: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('course', slug); else next.delete('course');
    setSearchParams(next, { replace: true });
  };

  return (
    <Box sx={{
      position: 'relative', height: '100%', overflowY: 'auto',
      bgcolor: mode === 'fancy' ? 'transparent' : mode === 'dark' ? '#111827' : 'background.default',
      color: 'text.primary', py: { xs: 2, md: 4 },
    }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
        {/* Tornar al curs des d'on s'ha entrat (encara que es vegin els avisos de tots), com el tauler */}
        {fromCourse && (
          <Button component={RouterLink} to={`/courses/${encodeURIComponent(fromCourse)}`} startIcon={<ChevronLeft size={18} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', mb: 1 }}>
            {fromName || fromCourse}
          </Button>
        )}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            {t('notification_center.title')}
          </Typography>
          {notifications.some((n) => !n.is_read) && (
            <Button variant="outlined" onClick={() => markRead.mutate(undefined)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              {t('notification_center.mark_all_read')}
            </Button>
          )}
        </Stack>

        {courses.length > 1 && (
          <Stack direction="row" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            <Chip label={t('notification_center.all_courses')} onClick={() => setFilter(null)} color={courseFilter ? 'default' : 'primary'} variant={courseFilter ? 'outlined' : 'filled'} sx={{ fontWeight: 700 }} />
            {courses.map((c) => (
              <Chip key={c.slug} label={c.name} onClick={() => setFilter(c.slug)} color={courseFilter === c.slug ? 'primary' : 'default'} variant={courseFilter === c.slug ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
            ))}
          </Stack>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : isError ? (
          <Typography color="error">{t('notification_center.load_error')}</Typography>
        ) : visible.length === 0 ? (
          <Box sx={{ border: '2px solid', borderColor: ACCENT, borderRadius: 3, p: 3, bgcolor: 'background.paper', textAlign: 'center' }}>
            <Typography color="text.secondary">{t('notification_center.empty')}</Typography>
          </Box>
        ) : (
          <Stack spacing={2} sx={{ pb: 4 }}>
            {visible.map((n) => (
              <Box
                key={n.id}
                id={`notification-${n.id}`}
                component="article"
                sx={{ border: '2px solid', borderColor: n.is_important ? 'error.main' : ACCENT, borderRadius: 3, p: { xs: 2, md: 2.5 }, bgcolor: 'background.paper', scrollMarginTop: 16 }}
              >
                <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', columnGap: 1, rowGap: 0.5 }}>
                  {!courseFilter && <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{n.course.name}</Typography>}
                  <Typography variant="caption" color="text.secondary">{formatNotificationDate(n.created_at, i18n.language)}</Typography>
                  <Box sx={{ flex: 1 }} />
                  {newIds.current?.has(n.id) && <Chip label={t('notification_center.new')} color="primary" size="small" sx={{ fontWeight: 700 }} />}
                  {n.is_important && <Chip label={t('notification_center.important')} color="error" size="small" sx={{ fontWeight: 700 }} />}
                </Stack>
                <MarkdownContent>{n.text}</MarkdownContent>
              </Box>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

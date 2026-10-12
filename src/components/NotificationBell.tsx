import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Badge, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Popover, Stack, Typography, alpha } from '@mui/material';
import { useMarkNotificationsRead, useNotificationFeed } from '../hooks/useNotificationFeed';
import { MarkdownContent } from './MarkdownContent';
import { formatNotificationDate, markdownToPlainText } from '../utils/notificationText';

/** Avisos que es veuen al desplegable (els recents, llegits o no, com GitHub o Slack). */
const DROPDOWN_LIMIT = 8;
const SNIPPET_LENGTH = 140;
const ACCENT = '#00685d';

/**
 * Campana del menú: punt amb el nombre d'avisos sense llegir, desplegable amb els recents i
 * enllaç a la pàgina d'avisos. Els avisos importants sense llegir s'obren en un diàleg que no
 * es pot tancar sense confirmar-ne la lectura (com a algorien).
 */
export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { notifications } = useNotificationFeed(true);
  const markRead = useMarkNotificationsRead();

  const unread = notifications.filter((n) => !n.is_read);
  const recent = notifications.slice(0, DROPDOWN_LIMIT);
  // El més antic primer: s'han de llegir en l'ordre en què es van publicar
  const blocking = [...unread].reverse().find((n) => n.is_important);

  const open = (path: string) => {
    setAnchor(null);
    navigate(path);
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={unread.length ? `${t('notification_center.title')} (${t('notification_center.unread_count', { count: unread.length })})` : t('notification_center.title')}
        aria-haspopup="dialog"
        sx={{ color: 'text.primary', width: 40, height: 40, borderRadius: '10px', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
      >
        <Badge badgeContent={unread.length} color="error" max={9} overlap="circular">
          <Bell size={22} />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        // Per sobre del menú (AppBar amb zIndex 1400)
        sx={{ zIndex: 1500 }}
        slotProps={{ paper: { sx: { width: { xs: 'calc(100vw - 32px)', sm: 380 }, maxHeight: '70vh', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '2px solid', borderColor: ACCENT, bgcolor: 'background.paper' } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25 }}>
          <Typography sx={{ fontWeight: 800 }}>{t('notification_center.title')}</Typography>
          {unread.length > 0 && (
            <Button size="small" onClick={() => markRead.mutate(undefined)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              {t('notification_center.mark_all_read')}
            </Button>
          )}
        </Stack>
        <Divider />
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {recent.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, px: 2 }}>
              {t('notification_center.empty')}
            </Typography>
          ) : (
            recent.map((n) => (
              <Box
                key={n.id}
                component="button"
                type="button"
                onClick={() => open(`/notifications?course=${encodeURIComponent(n.course.slug)}#notification-${n.id}`)}
                sx={(theme) => ({
                  display: 'block', width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', font: 'inherit', color: 'inherit',
                  px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider',
                  bgcolor: n.is_read ? 'transparent' : alpha(theme.palette.primary.main, 0.08),
                  '&:hover': { bgcolor: 'action.hover' },
                })}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {!n.is_read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                  <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>{n.course.name}</Typography>
                  {n.is_important && <Chip label={t('notification_center.important')} color="error" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />}
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {formatNotificationDate(n.created_at, i18n.language, true)}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {markdownToPlainText(n.text).slice(0, SNIPPET_LENGTH)}
                </Typography>
              </Box>
            ))
          )}
        </Box>
        <Divider />
        <Button onClick={() => open('/notifications')} sx={{ textTransform: 'none', fontWeight: 700, py: 1.25, borderRadius: 0 }}>
          {t('notification_center.see_all')}
        </Button>
      </Popover>

      {/* Avís important sense llegir: sense `onClose`, ni Esc ni un clic fora el tanquen; només confirmar-lo */}
      <Dialog open={Boolean(blocking)} sx={{ zIndex: 1600 }} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: 3, border: '2px solid', borderColor: ACCENT } } }}>
        {blocking && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip label={t('notification_center.important')} color="error" size="small" sx={{ fontWeight: 700 }} />
                <Typography component="span" sx={{ fontWeight: 800 }}>{blocking.course.name}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">{formatNotificationDate(blocking.created_at, i18n.language)}</Typography>
            </DialogTitle>
            <DialogContent dividers>
              <MarkdownContent>{blocking.text}</MarkdownContent>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button variant="contained" disabled={markRead.isPending} onClick={() => markRead.mutate([blocking.id])} sx={{ textTransform: 'none', fontWeight: 700 }}>
                {t('notification_center.got_it')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService, type CourseNotification } from '../services/notificationService';

// Una sola cache per a la campana del menú i la pàgina d'avisos: marcar-ne un de llegit en
// un lloc es veu de seguida a l'altre.
export const NOTIFICATION_FEED_KEY = ['notification-feed'] as const;

// El servidor no avisa dels avisos nous (no hi ha push): es torna a preguntar cada minut i en
// tornar a la pestanya, que és quan l'alumne els pot veure.
const FEED_REFRESH_MS = 60 * 1000;

const NO_NOTIFICATIONS: CourseNotification[] = [];

export function useNotificationFeed(enabled: boolean) {
  const queryClient = useQueryClient();
  // Els avisos són de l'usuari: en entrar o sortir no es poden quedar els de la sessió anterior
  useEffect(() => {
    const onAuthChange = () => queryClient.removeQueries({ queryKey: NOTIFICATION_FEED_KEY });
    window.addEventListener('auth-state-change', onAuthChange);
    return () => window.removeEventListener('auth-state-change', onAuthChange);
  }, [queryClient]);

  const query = useQuery<CourseNotification[]>({
    queryKey: NOTIFICATION_FEED_KEY,
    queryFn: () => notificationService.getFeed(),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: enabled ? FEED_REFRESH_MS : false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const notifications = enabled ? query.data ?? NO_NOTIFICATIONS : NO_NOTIFICATIONS;
  return { ...query, notifications };
}

/** Marca avisos com a llegits (o tots, sense `ids`); la cache s'actualitza abans de la resposta. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) => notificationService.markRead(ids),
    onMutate: async (ids?: number[]) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_FEED_KEY });
      const previous = queryClient.getQueryData<CourseNotification[]>(NOTIFICATION_FEED_KEY);
      const marked = ids ? new Set(ids) : null;
      queryClient.setQueryData<CourseNotification[]>(NOTIFICATION_FEED_KEY, (list) =>
        list?.map((n) => (!marked || marked.has(n.id) ? { ...n, is_read: true } : n)),
      );
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATION_FEED_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATION_FEED_KEY }),
  });
}

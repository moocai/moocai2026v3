import { apiClient } from './httpClient';

/** Avís d'un curs, tal com el retorna l'API (`NotificationSerializer` d'algorien). */
export interface CourseNotification {
  id: number;
  course: { slug: string; name: string };
  /** Markdown escrit pel professorat */
  text: string;
  is_important: boolean;
  created_at: string;
  /** Si l'usuari actual ja l'ha llegit */
  is_read: boolean;
}

export const notificationService = {
  /** GET /notifications/ → avisos de tots els cursos de l'usuari, del més nou al més antic. */
  async getFeed(): Promise<CourseNotification[]> {
    const { data } = await apiClient.get('/notifications/');
    return Array.isArray(data) ? data : [];
  },

  /**
   * POST /notifications/mark-read/ → `{ marked_read }`. Amb `ids`, només aquests; sense,
   * tots els no llegits. El servidor ignora els d'altres cursos.
   */
  async markRead(ids?: number[]): Promise<number> {
    const { data } = await apiClient.post('/notifications/mark-read/', ids ? { ids } : {});
    return Number(data?.marked_read) || 0;
  },
};

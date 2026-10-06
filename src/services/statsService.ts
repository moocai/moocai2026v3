import { api } from './api';

export const statsService = {
  /**
   * GET /api/v1/public/stats/ -> { students: number } (endpoint públic, sense token).
   *
   * Decideix (TODO(stats)): el comptador compta el nombre d'alumnes actius de la
   * plataforma i és una xifra pública. El backend encara no exposa aquest
   * endpoint, així que la crida NOMÉS es fa quan `VITE_ENABLE_PUBLIC_STATS`
   * està activada (vegeu `usePublicStats`). Si el backend no el té, es retorna
   * `null` sense llançar: la UI pot amagar l'estadística en lloc de demanar-la
   * a cada visita de la portada.
   */
  async getStudentCount(): Promise<number | null> {
    try {
      const res = await api.get('/public/stats/');
      const data = res.data as { students?: number };
      return Number.isFinite(data.students) ? Number(data.students) : null;
    } catch {
      return null;
    }
  },
};
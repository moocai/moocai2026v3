const API_URL = import.meta.env.VITE_API_URL || '';
const TIMEOUT_MS = 3000;

export const statsService = {
  /** GET /api/v1/public/stats/ -> { students: number } (endpoint públic, sense token) */
  async getStudentCount(): Promise<number> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${API_URL}/api/v1/public/stats/`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Error carregant estadístiques (${res.status})`);
      const data: { students: number } = await res.json();
      return Number.isFinite(data.students) ? data.students : 0;
    } finally {
      clearTimeout(timer);
    }
  },
};
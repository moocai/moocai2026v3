const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const TIMEOUT_MS = 3000;

/** Cache curta al navegador: evita repetir la crida en cada renderització. */
const CACHE_KEY = 'mooc_public_stats';
const CACHE_TTL_MS = 2000;

export interface PublicStats {
  activeStudents: number;
}

function readCache(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return Number(value);
  } catch {
    return null;
  }
}

function writeCache(value: number) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), value }));
  } catch {
  }
}

export const statsService = {
  /**
   * GET /api/v1/public/stats/ -> { active_students: number }
   * Endpoint públic, sense token. Llançà si no hi ha resposta vàlida;
   * el caller és el que decideix el valor de reserva.
   */
  async getActiveStudents(): Promise<number> {
    const cached = readCache();
    if (cached !== null) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/public/stats/`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Error carregant estadístiques (${res.status})`);
      const data = await res.json();
      const value = Number(data?.active_students);
      if (!Number.isFinite(value)) throw new Error('Resposta amb format inesperat');
      writeCache(value);
      return value;
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * POST /api/v1/users/presence/ -> 204
   * Ping lleu que manté "l'usuari està connectat" al dia. L'app desa el progrés
   * a localStorage, així que sense aquest ping un alumne llegint teoria una
   * estona no faria mai una petició autenticada i sortiria del comptador.
   */
  async pingPresence(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      await fetch(`${API_BASE_URL}/api/v1/users/presence/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        signal: controller.signal,
      });
    } catch {
      // és un ping best-effort: si falla, el middleware ho cobreix igualment
    } finally {
      clearTimeout(timer);
    }
  },
};
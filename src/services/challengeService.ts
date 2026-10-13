import { apiClient } from './httpClient';

/** Mètriques dels reptes d'algorien (`Challenge.METRIC_CHOICES`). */
export type ChallengeMetric = 'mae' | 'mse' | 'rmse' | 'accuracy' | 'balanced_accuracy' | 'f1' | 'precision' | 'recall';

/** Mètriques d'error: com més baix, millor. La resta (classificació): com més alt, millor. */
export const LOWER_IS_BETTER: ReadonlySet<ChallengeMetric> = new Set(['mae', 'mse', 'rmse']);

/**
 * Repte de ML d'un curs (`GET /courses/{c}/challenges/`). L'alumnat rep un subconjunt:
 * sense `locked`, `is_archived` ni dates (i només veu els reptes desbloquejats).
 */
export interface Challenge {
  name: string;
  slug: string;
  metric: ChallengeMetric;
  /** Accepta entregues */
  current: boolean;
  is_exam: boolean;
  require_seb?: boolean;
  description_ca?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  /** Només professorat */
  locked?: boolean;
  is_archived?: boolean;
}

export interface ChallengeFile {
  id: number;
  name: string;
  hidden: boolean;
}

/** L'última entrega pròpia d'un repte. */
export interface MyChallengeSubmission {
  submitted_at: string;
  /** `null` als exàmens */
  public_score: number | null;
  /** Nota sobre 10 (exàmens), un cop corregit */
  professor_grade: number | null;
  /** Comentari del professorat (Markdown) */
  professor_comment: string;
}

export interface SubmissionLimit {
  limited: boolean;
  max_per_day: number;
  submissions_today: number;
  /** `null` si no hi ha límit */
  remaining: number | null;
}

/** Detall d'un repte (`GET /courses/{c}/challenges/{slug}/`). */
export interface ChallengeDetail extends Challenge {
  files: ChallengeFile[];
  /** `undefined` amb un backend antic que encara no els envia */
  my_submission?: MyChallengeSubmission | null;
  submission_limit?: SubmissionLimit;
  max_upload_size_mb?: number | null;
}

export interface LeaderboardEntry {
  pos: number;
  user_id: string;
  username: string;
  score: number | null;
}

export type BoardName = 'public' | 'private' | 'final';

/**
 * Classificacions d'un repte. Alumnat: mentre el repte és obert, només la pública
 * (top 5 + la pròpia entrada); un cop tancat, també la privada i la final.
 */
export type Leaderboards = Partial<Record<BoardName, LeaderboardEntry[]>>;

/** Estat d'entrega d'un alumne (professorat). */
export interface SubmissionStatusEntry {
  user_id: string;
  username: string;
  full_name: string;
  submitted: boolean;
  submitted_at: string | null;
  public_score: number | null;
  private_score: number | null;
  final_score: number | null;
}

const base = (courseSlug: string) => `/courses/${encodeURIComponent(courseSlug)}/challenges/`;
const one = (courseSlug: string, slug: string) => `${base(courseSlug)}${encodeURIComponent(slug)}/`;

export const challengeKeys = {
  list: (course: string) => ['challenges', course] as const,
  detail: (course: string, slug: string) => ['challenge', course, slug] as const,
  leaderboard: (course: string, slug: string) => ['challenge-leaderboard', course, slug] as const,
  status: (course: string, slug: string) => ['challenge-status', course, slug] as const,
};

export const challengeService = {
  /** GET /courses/{c}/challenges/ → reptes (no exàmens ni arxivats), en l'ordre del curs. */
  async list(courseSlug: string): Promise<Challenge[]> {
    const { data } = await apiClient.get(base(courseSlug));
    return Array.isArray(data) ? data : [];
  },

  async get(courseSlug: string, slug: string): Promise<ChallengeDetail> {
    const { data } = await apiClient.get(one(courseSlug, slug));
    return { ...data, files: Array.isArray(data?.files) ? data.files : [] };
  },

  async leaderboard(courseSlug: string, slug: string): Promise<Leaderboards> {
    const { data } = await apiClient.get(`${one(courseSlug, slug)}leaderboard/`);
    return data ?? {};
  },

  /** POST multipart: un CSV (`id`, `prediction`) o, als exàmens, un .ipynb / .zip. */
  async submit(courseSlug: string, slug: string, file: File): Promise<void> {
    const form = new FormData();
    form.set('file', file);
    await apiClient.post(`${one(courseSlug, slug)}submissions/`, form);
  },

  /** L'última entrega pròpia, com a fitxer. */
  async downloadMine(courseSlug: string, slug: string): Promise<Blob> {
    const { data } = await apiClient.get(`${one(courseSlug, slug)}students/me/submission/`, { responseType: 'blob' });
    return data;
  },

  /** Professorat: totes les entregues en un ZIP. */
  async downloadAll(courseSlug: string, slug: string): Promise<Blob> {
    const { data } = await apiClient.get(`${one(courseSlug, slug)}submissions/`, { responseType: 'blob' });
    return data;
  },

  /** Professorat: qui ha entregat i qui no. */
  async submissionStatus(courseSlug: string, slug: string): Promise<SubmissionStatusEntry[]> {
    const { data } = await apiClient.get(`${one(courseSlug, slug)}submissions/grades/`);
    return Array.isArray(data) ? data : [];
  },
};

/** Desa un Blob com a fitxer al navegador. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

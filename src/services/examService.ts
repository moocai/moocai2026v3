import { apiClient } from './httpClient';

/**
 * Examen d'un curs (`GET /courses/{c}/exams/`). Els de tipus `topic` són temes amb problemes
 * de codi i/o tests; els de tipus `challenge` són reptes on s'entrega un fitxer.
 */
export interface Exam {
  kind: 'topic' | 'challenge';
  slug: string;
  name: string;
  /** Obert: accepta entregues */
  current: boolean;
  /** Només el veu el professorat */
  locked: boolean;
  require_seb: boolean;
  /** Es pot obrir ara (l'alumnat: només mentre és obert, i des del Safe Exam Browser si el demana) */
  available: boolean;
  /** `null` als exàmens de repte */
  problem_counts: { coding: number; test: number } | null;
  max_score: number | null;
  /** Nota pròpia (als de repte, la del professorat un cop corregit). `null` per al professorat */
  my_score: number | null;
  /** Ha entregat alguna cosa. `null` per al professorat */
  submitted: boolean | null;
}

export const examKeys = {
  list: (course: string) => ['exams', course] as const,
};

export const examService = {
  /** GET /courses/{c}/exams/ → primer els exàmens de tema i després els de repte, els més nous primer. */
  async list(courseSlug: string): Promise<Exam[]> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/exams/`);
    return Array.isArray(data) ? data : (data?.results ?? []);
  },
};

/** Ruta de la pàgina d'un examen (els de repte s'obren a la pàgina del repte). */
export function examPath(courseId: string, exam: Pick<Exam, 'kind' | 'slug'>): string {
  return exam.kind === 'challenge'
    ? `/courses/${courseId}/challenges/${encodeURIComponent(exam.slug)}`
    : `/courses/${courseId}/exams/${encodeURIComponent(exam.slug)}`;
}

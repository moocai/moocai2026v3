import { apiClient } from './httpClient';

/** Enquesta d'un curs (`SurveySerializer` d'algorien). L'alumnat només rep les obertes. */
export interface Survey {
  slug: string;
  name: string;
  /** Text pla (el servidor el mostra respectant els salts de línia) */
  description: string | null;
  active: boolean;
}

const base = (courseSlug: string) => `/courses/${encodeURIComponent(courseSlug)}/surveys/`;

export const surveyService = {
  /** GET /courses/{slug}/surveys/ → enquestes en l'ordre del curs. */
  async list(courseSlug: string): Promise<Survey[]> {
    const { data } = await apiClient.get(base(courseSlug));
    return Array.isArray(data) ? data : [];
  },

  /** GET /courses/{slug}/surveys/{survey}/ (404 si està tancada) */
  async get(courseSlug: string, surveySlug: string): Promise<Survey> {
    const { data } = await apiClient.get(`${base(courseSlug)}${encodeURIComponent(surveySlug)}/`);
    return data;
  },

  /** POST /courses/{slug}/surveys/{survey}/answers/ amb `{ answer }`. La resposta és anònima. */
  async submitAnswer(courseSlug: string, surveySlug: string, answer: string): Promise<void> {
    await apiClient.post(`${base(courseSlug)}${encodeURIComponent(surveySlug)}/answers/`, { answer });
  },
};

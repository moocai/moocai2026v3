import { Course } from '../types';
import i18n from '../i18n';
import { getLocalizedText } from '../utils/formatters';
import { apiClient } from './httpClient';

/* ------------------------------------------------------------------ */
/* Servei                                                             */
/* ------------------------------------------------------------------ */

const fullCourseCache = new Map<string, any>();
let allCoursesCache: Course[] | null = null;
let publicCoursesCache: Course[] | null = null;

/** Normalitza el JSON de l'API al tipus `Course` de l'app. */
function toCourses(data: unknown): Course[] {
  const list = Array.isArray(data) ? data : ((data as { results?: unknown[] })?.results ?? []);
  return (list as any[]).map((c) => ({
    id: c.slug,
    slug: c.slug,
    title: c.name,
    description: '',
    image: '',
    level: '',
    duration: '',
    instructor: '',
    isPublic: c.is_public !== false,
    active: c.active !== false,
    professors: Array.isArray(c.professors) ? c.professors : [],
  }));
}

export const courseService = {
  
  /**
   * `GET /api/v1/courses/` és sensible al rol: professors veuen els seus,
   * alumnes els cursos actius matriculats i staff tots.
   */
  async getAllCourses(forceRefresh = false): Promise<Course[]> {
    // L'endpoint requereix sessió: sense token sempre respon 401. No es desa a la
    // memòria cau perquè, en fer login, la primera crida ja vagi al servidor.
    if (!localStorage.getItem('token')) return [];
    if (!forceRefresh && allCoursesCache) {
      return allCoursesCache;
    }
    const { data } = await apiClient.get('/courses/');
    const courses = toCourses(data);
    allCoursesCache = courses;
    return courses;
  },

  /** `GET /api/v1/public/courses/` — tots els cursos públics, sense autenticació. */
  async getPublicCourses(forceRefresh = false): Promise<Course[]> {
    if (!forceRefresh && publicCoursesCache) {
      return publicCoursesCache;
    }
    const { data } = await apiClient.get('/public/courses/');
    const courses = toCourses(data);
    publicCoursesCache = courses;
    return courses;
  },

  async getCourseBySlug(slug: string): Promise<any> {
    const { data } = await apiClient.get(`/courses/${slug}/`);
    return data;
  },

  async getCourseTopics(slug: string): Promise<any[]> {
    const { data } = await apiClient.get(`/courses/${slug}/topics/`);
    return Array.isArray(data) ? data : (data.results || []);
  },

  async getTopicBySlug(courseSlug: string, topicSlug: string): Promise<any> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/`);
    const lang = i18n.language?.split('-')[0] || 'en';
    if (data.theory_md) {
      data.theory_md = getLocalizedText(data.theory_md, lang as any);
    }
    return data;
  },

  async getTopicProblems(courseSlug: string, topicSlug: string): Promise<any[]> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/`);
    return Array.isArray(data) ? data : (data.results || []);
  },

  /** `POST` per enviar la solució del problema (codi o respostes de test) */
  async submitChallenge(courseSlug: string, topicSlug: string, problemSlug: string, data: { code?: string; answers?: string[]; language?: string }): Promise<any> {
    const { data: response } = await apiClient.post(
      `/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/`,
      data
    );
    return response;
  },

  async getChallenge(courseSlug: string, topicSlug: string, problemSlug: string): Promise<any> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/`);
    return data;
  },

  async getChallengeSubmissions(courseSlug: string, topicSlug: string, problemSlug: string): Promise<any[]> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/`);
    return Array.isArray(data) ? data : (data.results || []);
  },

  async getPeerSubmissions(courseSlug: string, topicSlug: string, problemSlug: string): Promise<any[]> {
    try {
      const { data } = await apiClient.get(
        `/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/peers/`
      );
      return Array.isArray(data) ? data : (data.results || []);
    } catch {
      return [];
    }
  },

  async getCourseLeaderboard(courseSlug: string, limit?: number): Promise<any> {
    const params = limit ? { limit } : {};
    const { data } = await apiClient.get(`/courses/${courseSlug}/leaderboard/`, { params });
    return data;
  },

  /** @deprecated Use submitChallenge instead */
  async submitSubmission(courseSlug: string, topicSlug: string, problemSlug: string, data: { code?: string; answers?: string[] }): Promise<any> {
    return this.submitChallenge(courseSlug, topicSlug, problemSlug, data);
  },

  async getFullCourseDetail(slug: string, forceRefresh = false): Promise<any> {
    if (!forceRefresh && fullCourseCache.has(slug)) {
      return fullCourseCache.get(slug);
    }
    try {
      const [courseData, topics] = await Promise.all([
        this.getCourseBySlug(slug),
        this.getCourseTopics(slug),
      ]);

      const content = await Promise.all(
        topics.map(async (topic: any) => {
          const problems = await this.getTopicProblems(slug, topic.slug);
          return {
            id: topic.slug,
            title: topic.name,
            subTopics: Array.isArray(problems) ? problems.map((p: any) => ({
              subtitle: p.title,
              text: p.statement_ca || p.statementHtml || '',
              problemSlug: p.slug,
              type: p.type,
              precode: p.precode,
              solution: p.system_solution?.code || '',
              score: p.score,
              difficulty: p.difficulty,
              choices: p.choices,
            })) : [],
          };
        })
      );

      const result = { 
        ...courseData, 
        id: courseData.slug, 
        title: courseData.name, 
        content 
      };
      fullCourseCache.set(slug, result);
      return result;
    } catch (err) {
      console.error("Error al carregar el detall del curs:", err);
      throw err;
    }
  },

  clearCache(slug?: string) {
    if (slug) {
      fullCourseCache.delete(slug);
    } else {
      fullCourseCache.clear();
      allCoursesCache = null;
    }
  },
};
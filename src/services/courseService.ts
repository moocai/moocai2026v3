import { Course } from '../types';
import i18n from '../i18n';
import { getLocalizedText } from '../utils/formatters';
import { apiClient } from './httpClient';
import { applyServerSolutions } from './topicTestAnswers';

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
    // Rol de l'usuari al curs ('student' | 'professor' | null). `undefined` si l'API no l'envia.
    myRole: c.my_role,
  }));
}

/** Problema de l'API → forma de `subTopics` que fan servir les pàgines */
export const mapProblem = (p: any) => ({
  subtitle: p.title,
  // `undefined` quan l'API no envia l'enunciat (llista del curs): el problema s'ha de demanar sencer
  text: 'statementHtml' in p || 'statement_ca' in p ? (p.statement_ca || p.statementHtml || '') : undefined,
  // Enunciat en Markdown per idioma (el mostra LessonPage en l'idioma de l'alumne)
  statement: 'statement_ca' in p || 'statement_es' in p || 'statement_en' in p
    ? { ca: p.statement_ca || '', es: p.statement_es || '', en: p.statement_en || '' }
    : undefined,
  problemSlug: p.slug,
  type: p.type,
  precode: p.precode,
  solution: p.system_solution?.code || '',
  // Solució de referència: el servidor només l'envia quan l'alumne la pot veure (problema
  // resolt o tema ja tancat; mai en un examen). `undefined` = no se sap (llista sense detall).
  systemSolution: 'system_solution' in p ? (p.system_solution?.code ?? null) : undefined,
  score: p.score,
  difficulty: p.difficulty,
  choices: p.choices,
  choiceType: p.choice_type,
  // Estat propi del problema al servidor (null si no s'ha enviat); `undefined` amb el backend antic
  mySolution: p.my_solution,
});

/** Tema de l'API (`GET …/topics/`) + els seus problemes → un element de `content`. */
const toContentTopic = (topic: any, problems: any[]) => ({
  id: topic.slug,
  title: topic.name,
  // Resum del servidor (recomptes i progrés propi); absents amb el backend antic
  problemCounts: topic.problem_counts,
  myProgress: topic.my_progress,
  hasLectureFiles: topic.has_lecture_files,
  // Tema en curs: fora d'aquest període (o en exàmens) els enviaments no sumen punts
  current: topic.current,
  isExam: topic.is_exam,
  subTopics: Array.isArray(problems) ? problems.map(mapProblem) : [],
});

const isNotFound = (err: any) => err?.response?.status === 404;

export const courseService = {
  
  /**
   * `GET /api/v1/courses/` és sensible al rol: professors veuen els seus,
   * alumnes els cursos actius matriculats i staff tots.
   * Sense sessió no es fa cap petició (l'API respon 401); la llista buida
   * no es cacheja perquè el login la torni a demanar.
   */
  async getAllCourses(forceRefresh = false): Promise<Course[]> {
    if (!localStorage.getItem('token')) {
      return [];
    }
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

  /** `GET /courses/{c}/files/{id}/download/`: un fitxer del curs (amb el token de la sessió). */
  async downloadFile(courseSlug: string, fileId: number | string): Promise<Blob> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/files/${fileId}/download/`, { responseType: 'blob' });
    return data;
  },

  /**
   * `GET /courses/{c}/problems/`: tots els problemes del curs (sense enunciats) amb l'estat
   * propi. `null` si el backend encara no té l'endpoint (404).
   */
  async getCourseProblems(slug: string): Promise<any[] | null> {
    try {
      const { data } = await apiClient.get(`/courses/${slug}/problems/`);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },

  /** `GET /courses/{c}/statistics/`: rendiment propi per tema i mitjana de la classe. */
  async getCourseStatistics(slug: string): Promise<{ coding_data: any[]; test_data: any[] }> {
    const { data } = await apiClient.get(`/courses/${slug}/statistics/`);
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

  /** Còpia de seguretat del servidor amb la data; `null` si no n'hi ha. */
  async getCodeBackupVersion(courseSlug: string, topicSlug: string, problemSlug: string): Promise<{ code: string; at: string | null } | null> {
    try {
      const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/backup/`);
      return typeof data?.code === 'string' ? { code: data.code, at: data.last_submitted_at ?? null } : null;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },

  /** Pistes d'IA que l'usuari ja ha demanat en aquest problema (la més recent primer). */
  async getHints(courseSlug: string, topicSlug: string, problemSlug: string): Promise<any[]> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/hints/`);
    return Array.isArray(data) ? data : (data?.results || []);
  },

  /** Demana una pista d'IA nova per al codi actual (consumeix una de les diàries). */
  async createHint(courseSlug: string, topicSlug: string, problemSlug: string, code: string): Promise<any> {
    const { data } = await apiClient.post(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/hints/`, { code });
    return data;
  },

  /** La submissió pròpia d'un problema de codi (estat, codi...); `null` si encara no n'hi ha. */
  async getOwnSubmission(courseSlug: string, topicSlug: string, problemSlug: string): Promise<any | null> {
    try {
      const list = await this.getChallengeSubmissions(courseSlug, topicSlug, problemSlug);
      return list[0] ?? null;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },

  async getChallengeSubmissions(courseSlug: string, topicSlug: string, problemSlug: string): Promise<any[]> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/`);
    // L'esquema diu llista, però és la submission pròpia: s'accepta també un objecte sol
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return data && typeof data === 'object' ? [data] : [];
  },

  /** Còpia de seguretat del codi (Python) de l'alumne en un problema; `null` si no n'hi ha. */
  async getCodeBackup(courseSlug: string, topicSlug: string, problemSlug: string): Promise<string | null> {
    try {
      const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/backup/`);
      return typeof data?.code === 'string' ? data.code : null;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },

  /** Desa al servidor el codi (Python) de l'alumne sense executar-lo. */
  async saveCodeBackup(courseSlug: string, topicSlug: string, problemSlug: string, code: string): Promise<void> {
    await apiClient.post(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/backup/`, { code });
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

  /**
   * Estructura del curs: temes i problemes (sense enunciats; cada pàgina demana el seu).
   * Són 3 peticions en paral·lel (curs, temes, problemes del curs), siguin quants siguin
   * els temes. Amb un backend sense `GET /courses/{c}/problems/` es torna a la manera
   * antiga: una petició de problemes per tema.
   * L'estat propi de cada problema (`my_solution`) es porta al magatzem de progrés local.
   */
  async getFullCourseDetail(slug: string, forceRefresh = false): Promise<any> {
    if (!forceRefresh && fullCourseCache.has(slug)) {
      return fullCourseCache.get(slug);
    }
    try {
      const [courseData, topics, courseProblems] = await Promise.all([
        this.getCourseBySlug(slug),
        this.getCourseTopics(slug),
        this.getCourseProblems(slug),
      ]);

      let content;
      if (courseProblems) {
        const byTopic = new Map<string, any[]>();
        for (const p of courseProblems) {
          if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
          byTopic.get(p.topic)!.push(p);
        }
        content = topics.map((topic: any) => toContentTopic(topic, byTopic.get(topic.slug) || []));
        applyServerSolutions(slug, courseProblems);
      } else {
        content = await Promise.all(
          topics.map(async (topic: any) => toContentTopic(topic, await this.getTopicProblems(slug, topic.slug))),
        );
      }

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
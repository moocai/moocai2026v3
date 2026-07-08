import axios from 'axios';
import { Course } from '../types';
import i18n from '../i18n';
import { getLocalizedText } from '../utils/formatters';

/* ------------------------------------------------------------------ */
/* Configuració d'URL (Blindada)                                     */
/* ------------------------------------------------------------------ */
// @ts-ignore - Vite replaces import.meta.env statically at build time
const API_BASE_URL = import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL || 'https://algorien.com';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ------------------------------------------------------------------ */
/* Servei                                                            */
/* ------------------------------------------------------------------ */

const fullCourseCache = new Map<string, any>();
let allCoursesCache: Course[] | null = null;

export const courseService = {
  
  async getAllCourses(forceRefresh = false): Promise<Course[]> {
    if (!forceRefresh && allCoursesCache) {
      return allCoursesCache;
    }
    const { data } = await apiClient.get('/public/courses/');
    // Comprovació per assegurar que rebem un array
    const list = Array.isArray(data) ? data : (data.results || []);
    
    const courses = list.map((c: any) => ({
      id: c.slug,
      slug: c.slug,
      title: c.name,
      description: '',
      image: '',
      level: '',
      duration: '',
      instructor: '',
    }));
    allCoursesCache = courses;
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

  async submitChallenge(courseSlug: string, topicSlug: string, problemSlug: string, data: { code?: string; answers?: string[] }): Promise<any> {
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

  async getChallengeGrades(courseSlug: string, topicSlug: string, problemSlug: string): Promise<any[]> {
    const { data } = await apiClient.get(`/courses/${courseSlug}/topics/${topicSlug}/problems/${problemSlug}/submissions/grades/`);
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
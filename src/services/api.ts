import axios from 'axios';

const getProgress = (studentId: string) =>
  JSON.parse(localStorage.getItem(`mooc_global_progress_${studentId}`) || '{}');

const setProgress = (studentId: string, data: Record<string, boolean>) =>
  localStorage.setItem(`mooc_global_progress_${studentId}`, JSON.stringify(data));

// @ts-ignore - Vite replaces import.meta.env statically at build time
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const api = {
  getStudentProgress: async (studentId: string) => {
    return getProgress(studentId);
  },

  postProgress: async (data: { studentId: string; courseId: string; lessonId: string; status: boolean }) => {
    const local = getProgress(data.studentId);
    local[`${data.courseId}_${data.lessonId}`] = data.status;
    setProgress(data.studentId, local);
    window.dispatchEvent(new Event('lessonProgressUpdated'));
    document.dispatchEvent(new Event('lessonProgressUpdated'));
    return { status: 200 };
  },

  resetCourse: async (studentId: string, courseId: string) => {
    const local = getProgress(studentId);
    Object.keys(local).forEach(key => {
      if (key.startsWith(`${courseId}_`)) delete local[key];
    });
    setProgress(studentId, local);

    // Netejar el codi de l'usuari per a totes les lliçons d'aquest curs
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`code_${studentId}_${courseId}_`)) {
        localStorage.removeItem(key);
      }
      if (key.startsWith(`mooc_submissions_${courseId}_`)) {
        localStorage.removeItem(key);
      }
    });

    // Netejar última sessió si era d'aquest curs
    try {
      const lastSession = JSON.parse(localStorage.getItem('mooc_last_session') || '{}');
      if (lastSession.courseId === courseId) {
        localStorage.removeItem('mooc_last_session');
      }
    } catch {}

    window.dispatchEvent(new Event('lessonProgressUpdated'));
    return { status: 200 };
  },

  inviteUser: async (email: string) => {
    const { data } = await apiClient.post('/users/invite/', { email });
    return data;
  }
};
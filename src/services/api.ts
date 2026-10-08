import { LAST_SESSION_KEY } from './topicTestAnswers';
import { apiClient } from './httpClient';

const getProgress = (studentId: string) =>
  JSON.parse(localStorage.getItem(`mooc_global_progress_${studentId}`) || '{}');

const setProgress = (studentId: string, data: Record<string, boolean>) =>
  localStorage.setItem(`mooc_global_progress_${studentId}`, JSON.stringify(data));

export const api = {
  // Aquest és el mètode que faltava per fer get genèrics (avatars, fitxers, etc.)
  get: async (url: string, config = {}) => {
    return apiClient.get(url, config);
  },

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

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`code_${studentId}_${courseId}_`)) {
        localStorage.removeItem(key);
      }
      if (key.startsWith(`mooc_submissions_${courseId}_`)) {
        localStorage.removeItem(key);
      }
    });

    try {
      const sessionKey = `${LAST_SESSION_KEY}_${studentId}`;
      const lastSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      if (lastSession.courseId === courseId) {
        localStorage.removeItem(sessionKey);
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
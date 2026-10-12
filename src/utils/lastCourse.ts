import { useEffect } from 'react';
import { getStudentId, isLoggedIn, userKey } from '../services/topicTestAnswers';

// L'últim curs on l'usuari ha fet alguna cosa (obrir-lo, un problema, un test), per tornar-hi
// en iniciar sessió. Es desa per usuari i per navegador (localStorage): en un altre dispositiu
// no se sap, i en iniciar sessió es va a "Els meus cursos".
const LAST_COURSE_KEY = 'mooc_last_course_activity';

/** Passat aquest temps sense tocar el curs, en iniciar sessió es va a "Els meus cursos". */
export const RECENT_COURSE_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export function recordCourseActivity(courseSlug: string) {
  if (!isLoggedIn() || getStudentId() === 'temp') return;
  try {
    localStorage.setItem(userKey(LAST_COURSE_KEY), JSON.stringify({ slug: courseSlug, at: Date.now() }));
  } catch { /* mode privat */ }
}

/** El curs de l'última activitat si és prou recent (de l'usuari amb sessió); si no, `null`. */
export function recentCourse(now = Date.now()): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(userKey(LAST_COURSE_KEY)) || 'null');
    if (typeof saved?.slug !== 'string' || typeof saved?.at !== 'number') return null;
    return now - saved.at <= RECENT_COURSE_MAX_AGE_MS ? saved.slug : null;
  } catch {
    return null;
  }
}

/** Registra l'activitat al curs `courseSlug` en obrir una pàgina seva. */
export function useRecordCourseActivity(courseSlug: string | undefined) {
  useEffect(() => {
    if (courseSlug) recordCourseActivity(courseSlug);
  }, [courseSlug]);
}

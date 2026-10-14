import { matchPath } from 'react-router-dom';

/** Alçada de la capçalera a totes les pàgines. */
export const HEADER_HEIGHT = 80;
/** Capçalera compacta a la pàgina d'un problema de codi: més espai per al codi. */
export const CODING_HEADER_HEIGHT = 48;

// Rutes de dos segments sota un curs que NO són un problema de codi (les pàgines del curs:
// estadístiques, enquestes, Drive, reptes…). Qualsevol altra és el slug d'un problema.
const NON_CODING_SEGMENTS = new Set(['stats', 'surveys', 'drive', 'challenges', 'exams']);

/**
 * És la pàgina d'un problema de codi (`/courses/:courseId/:lessonId`, o dins d'un examen
 * `/courses/:courseId/exams/:examSlug/:lessonId`)?
 */
export function isCodingRoute(pathname: string): boolean {
  if (matchPath('/courses/:courseId/exams/:examSlug/:lessonId', pathname)) return true;
  const match = matchPath('/courses/:courseId/:lessonId', pathname);
  return !!match && !NON_CODING_SEGMENTS.has(match.params.lessonId ?? '');
}

export const headerHeightFor = (pathname: string) => (isCodingRoute(pathname) ? CODING_HEADER_HEIGHT : HEADER_HEIGHT);

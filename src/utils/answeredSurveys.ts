import { userKey } from '../services/topicTestAnswers';

// Les respostes de les enquestes són anònimes: l'API no diu quines ha contestat cada alumne.
// Per poder marcar-les com a "Contestada" es recorden aquí, per usuari i navegador (en un altre
// dispositiu no hi surten). No revelen res, així que es queden en tancar la sessió.
const ANSWERED_SURVEYS_KEY = 'mooc_answered_surveys';

const id = (courseSlug: string, surveySlug: string) => `${courseSlug}/${surveySlug}`;

function read(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(userKey(ANSWERED_SURVEYS_KEY)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function isSurveyAnswered(courseSlug: string, surveySlug: string): boolean {
  return read().includes(id(courseSlug, surveySlug));
}

export function markSurveyAnswered(courseSlug: string, surveySlug: string): void {
  const list = read();
  if (list.includes(id(courseSlug, surveySlug))) return;
  try {
    localStorage.setItem(userKey(ANSWERED_SURVEYS_KEY), JSON.stringify([...list, id(courseSlug, surveySlug)]));
  } catch { /* mode privat */ }
}

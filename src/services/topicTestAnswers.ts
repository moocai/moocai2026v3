import { courseService } from './courseService';
import { TEST_ANSWERS_PREFIX } from './testAnswerStorage';

// Respostes dels tests de tema, compartides entre TopicTestPage i la llista de tests de
// CourseLessons. Es desen per usuari: { answers, correct, choices }. Com que només hi ha un
// intent, una resposta desada no canvia mai: si hi és, no cal preguntar al servidor. Per a
// usuaris sense sessió és l'única còpia (el servidor no desa res seu en cursos públics).

export type SavedAnswer = { answers: string[]; correct: boolean | null; choices: any[] };

export const getStudentId = (): string => {
  try {
    const parsed = JSON.parse(localStorage.getItem('currentStudent') || 'null');
    if (parsed?.id) return String(parsed.id);
  } catch { /* sessió corrupta: com si no n'hi hagués */ }
  return 'temp';
};

export const isLoggedIn = () => !!localStorage.getItem('token');

export const readJson = (key: string): Record<string, any> => {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
};

/**
 * Clau de localStorage pròpia de l'usuari actual (`<base>_<idAlumne>`), per a dades que no han
 * de passar d'un usuari a un altre del mateix navegador (p. ex. on s'havia quedat).
 */
export const userKey = (base: string) => `${base}_${getStudentId()}`;
export const LAST_SESSION_KEY = 'mooc_last_session';

export const getProgressKey = () => `mooc_global_progress_${getStudentId()}`;
const getAnswersKey = () => `${TEST_ANSWERS_PREFIX}${getStudentId()}`;
// Amb sessió però sense id d'alumne (p. ex. just després de registrar-se, abans d'iniciar sessió)
// les respostes es guarden només en memòria: si no, anirien al calaix anònim ('temp'),
// compartit per tothom qui faci servir aquest navegador sense sessió.
const canCache = () => !(isLoggedIn() && getStudentId() === 'temp');
let memoryAnswers: Record<string, SavedAnswer> = {};
if (typeof window !== 'undefined') window.addEventListener('auth-state-change', () => { memoryAnswers = {}; });

export const answerKey = (courseId: string, problemSlug: string) => `${courseId}_${problemSlug}`;

export const readAllSavedAnswers = (): Record<string, SavedAnswer> => (canCache() ? readJson(getAnswersKey()) : memoryAnswers);

/**
 * Resposta desada d'un test. Si es passen les opcions actuals del test, la resposta només
 * és vàlida si les seves ids hi són (p. ex. una resposta d'un fixture antic amb altres ids
 * es descarta i es torna a demanar al servidor).
 */
export const readSavedAnswer = (key: string, choices?: any[]): SavedAnswer | null => {
  const saved = readAllSavedAnswers()[key];
  if (!saved || !Array.isArray(saved.answers) || saved.answers.length === 0) return null;
  if (choices && choices.length > 0) {
    const ids = new Set(choices.map((c: any) => String(c.id)));
    if (!saved.answers.every((a: any) => ids.has(String(a)))) return null;
  }
  return saved;
};

const notify = () => window.dispatchEvent(new Event('lessonProgressUpdated'));

/** Desa respostes i manté el progrés global (true = correcte, 'attempted' = incorrecte). */
export const saveAnswers = (entries: Record<string, SavedAnswer>) => {
  if (Object.keys(entries).length === 0) return;
  if (!canCache()) {
    memoryAnswers = { ...memoryAnswers, ...entries };
    notify();
    return;
  }
  const answersKey = getAnswersKey();
  localStorage.setItem(answersKey, JSON.stringify({ ...readJson(answersKey), ...entries }));
  const progressKey = getProgressKey();
  const progress = readJson(progressKey);
  for (const [key, entry] of Object.entries(entries)) {
    if (entry.correct !== null) progress[key] = entry.correct ? true : 'attempted';
  }
  localStorage.setItem(progressKey, JSON.stringify(progress));
  notify();
};

// Progrés que ve del servidor (`my_solution` de cada problema). La UI llegeix el progrés de
// localStorage (`mooc_global_progress_<id>` i les respostes dels tests), així que aquí es porta
// l'estat del servidor a aquest magatzem: és la font de veritat i el magatzem en fa de cache.
// Només afegeix o millora (mai rebaixa): un estat local més nou que la dada en cache del
// servidor (p. ex. just després d'enviar) es manté.

/** Un problema tal com el retorna l'API (llista de tema o del curs), amb `my_solution`. */
type ApiProblem = { slug: string; type?: string; choices?: any[]; my_solution?: any };

/** Si l'API ja retorna `my_solution` (el backend antic no l'envia). */
export const hasServerSolutions = (problems: ApiProblem[]) =>
  problems.some((p) => p && Object.prototype.hasOwnProperty.call(p, 'my_solution'));

export function applyServerSolutions(courseId: string, problems: ApiProblem[]) {
  if (!isLoggedIn() || !hasServerSolutions(problems)) return;

  const answers: Record<string, SavedAnswer> = {};
  const progressKey = getProgressKey();
  const progress = readJson(progressKey);
  let progressChanged = false;

  for (const p of problems) {
    const mine = p.my_solution;
    if (!mine) continue;
    const key = answerKey(courseId, p.slug);
    if (p.type === 'test') {
      if (!Array.isArray(mine.choices) || readSavedAnswer(key, p.choices)) continue;
      answers[key] = { answers: mine.choices.map(String), correct: !!mine.correct, choices: p.choices || [] };
    } else if (mine.status === 'accepted' && progress[key] !== true) {
      progress[key] = true;
      progressChanged = true;
    } else if (mine.status && progress[key] == null) {
      progress[key] = 'attempted';
      progressChanged = true;
    }
  }

  if (progressChanged) {
    try { localStorage.setItem(progressKey, JSON.stringify(progress)); } catch { /* quota / mode privat */ }
  }
  if (Object.keys(answers).length > 0) saveAnswers(answers); // també avisa (lessonProgressUpdated)
  else if (progressChanged) window.dispatchEvent(new Event('lessonProgressUpdated'));
}

/**
 * Porta del servidor les respostes dels tests d'un tema que no tenim desades.
 * `problems` ha de ser la llista FRESCA de l'API. Si porta `my_solution`, n'hi ha prou;
 * amb el backend antic, un alumne només rep `is_correct` d'un test quan ja l'ha respost,
 * així que només es demana la resposta (GET submissions) d'aquests.
 */
export async function syncTopicAnswers(courseId: string, courseSlug: string, topicSlug: string, problems: any[]) {
  if (!isLoggedIn()) return;
  // L'API ja porta la resposta pròpia de cada test (`my_solution`): cap petició més.
  if (hasServerSolutions(problems)) {
    applyServerSolutions(courseId, problems);
    return;
  }
  const toFetch = problems.filter((p: any) => p.type === 'test'
    && (p.choices || []).some((c: any) => typeof c.is_correct === 'boolean')
    && !readSavedAnswer(answerKey(courseId, p.slug), p.choices));
  if (toFetch.length === 0) return;
  const subs = await Promise.all(toFetch.map((p: any) =>
    courseService.getChallengeSubmissions(courseSlug, topicSlug, p.slug).catch(() => [] as any[])));
  const found: Record<string, SavedAnswer> = {};
  toFetch.forEach((p: any, i: number) => {
    const own = (subs[i] || []).find((sub: any) => Array.isArray(sub?.choices) && sub.choices.length > 0);
    if (!own) return; // p. ex. un professor, que sempre rep `is_correct`
    const answers = own.choices.map((c: any) => String(typeof c === 'object' ? c?.id : c));
    const correctIds = (p.choices || []).filter((c: any) => c.is_correct).map((c: any) => String(c.id));
    const correct = correctIds.length === answers.length && answers.every((id: string) => correctIds.includes(id));
    found[answerKey(courseId, p.slug)] = { answers, correct, choices: p.choices };
  });
  saveAnswers(found);
}

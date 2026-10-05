import { useEffect, useState } from 'react';
import axios from 'axios';
import { courseService } from '../services/courseService';

/**
 * ÚNICA font de veritat dels punts.
 *  - Els punts reals són els del BACKEND (els mateixos que mostra el leaderboard).
 *  - Es guarden per curs a localStorage (`mooc_points_<studentId>`) cada cop que es
 *    llegeix el leaderboard (Dashboard) o es refresca després d'una activitat (LessonPage).
 *  - El header, el Dashboard i la pàgina d'activitat llegeixen/escriuen SEMPRE aquí.
 *  - Mentre no hi hagi cap dada del backend, s'usa el recompte local com a valor provisional.
 */
export const POINTS_PER_LESSON = 10;
export const POINTS_EVENT = 'pointsUpdated';

const storeKey = (id: string) => `mooc_points_${id}`;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type PointsStudent = { id: string; name: string };

export function getCurrentStudent(): PointsStudent | null {
  const s = readJSON<any>('currentStudent', null);
  if (!s?.id) return null;
  return { id: String(s.id), name: String(s.username ?? s.name ?? '') };
}

/** Recompte local (només activitats superades). Valor provisional. */
export function getLocalPoints(studentId: string): number {
  const perStudent = readJSON<Record<string, any>>(`mooc_global_progress_${studentId}`, {});
  const shared = readJSON<Record<string, any>>('mooc_shared_all_progress', {});
  const merged = { ...(shared[studentId] || {}), ...perStudent };
  return Object.values(merged).filter((v) => v === true).length * POINTS_PER_LESSON;
}

export function getBackendPoints(studentId: string): Record<string, number> {
  return readJSON<Record<string, number>>(storeKey(studentId), {});
}

/** Total del backend (suma de tots els cursos coneguts); si no n'hi ha cap, recompte local. */
export function getTotalPoints(studentId: string): number {
  const values = Object.values(getBackendPoints(studentId));
  return values.length ? values.reduce((a, b) => a + b, 0) : getLocalPoints(studentId);
}

export function setCoursePoints(studentId: string, courseSlug: string, points: number) {
  const map = getBackendPoints(studentId);
  if (map[courseSlug] === points) return;
  try {
    localStorage.setItem(storeKey(studentId), JSON.stringify({ ...map, [courseSlug]: points }));
  } catch { /* mode privat / quota */ }
  window.dispatchEvent(new Event(POINTS_EVENT));
}

const POINT_KEYS = ['points', 'score', 'total_points', 'total_score', 'stars', 'grade'];

function pickPoints(row: any): number {
  for (const k of POINT_KEYS) {
    const v = Number(row?.[k]);
    if (row?.[k] != null && !Number.isNaN(v)) return v;
  }
  return 0;
}

const norm = (v: any) =>
  String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Tots els valors (text/número) d'una fila, normalitzats, fins a 3 nivells de profunditat
function leaves(o: any, depth = 0): string[] {
  if (o == null || depth > 3) return [];
  if (typeof o === 'string' || typeof o === 'number') return [norm(o)];
  if (Array.isArray(o)) return o.flatMap((x) => leaves(x, depth + 1));
  if (typeof o === 'object') return Object.values(o).flatMap((x) => leaves(x, depth + 1));
  return [];
}

/**
 * Busca la fila de l'alumne al leaderboard.
 * 1) per id / username / nom exactes; 2) si no, per qualsevol camp de la fila que coincideixi
 *    amb l'id o el nom de l'alumne (ignorant majúscules, accents, espais i signes).
 */
export function findOwnPoints(list: any[], student: PointsStudent): number | null {
  const name = student.name.trim().toLowerCase();
  for (const row of list) {
    const user = row?.user ?? row;
    const ids = [user?.id, user?.user_id].filter((x) => x != null).map(String);
    const names = [user?.username, user?.name, row?.username].filter(Boolean).map((x: any) => String(x).trim().toLowerCase());
    if (ids.includes(student.id) || (name && names.includes(name))) return pickPoints(row);
  }
  const nid = norm(student.id);
  const nname = norm(student.name);
  for (const row of list) {
    const values = leaves(row);
    if ((nid.length >= 3 && values.includes(nid)) || (nname.length >= 3 && values.includes(nname))) return pickPoints(row);
  }
  return null;
}

/** Cridat pel Dashboard cada cop que carrega el leaderboard d'un curs. */
export function syncOwnPointsFromList(courseSlug: string, list: any[]) {
  const student = getCurrentStudent();
  if (!student) return;
  const own = findOwnPoints(list, student);
  if (own != null) setCoursePoints(student.id, courseSlug, own);
}

/**
 * Després d'una activitat superada: torna a demanar el leaderboard (amb reintents,
 * per si el backend triga a calcular) fins que els punts pugen, i els publica.
 */
export async function refreshCoursePoints(courseSlug: string, retries = 4, delayMs = 1000): Promise<number | null> {
  const student = getCurrentStudent();
  if (!student) return null;
  // Només els membres del curs poden llegir el leaderboard (en un curs públic sense
  // matrícula seria un 403). La llista de cursos propis ja és a la memòria cau.
  const myCourses = await courseService.getAllCourses().catch(() => []);
  if (!myCourses.some((c) => c.slug === courseSlug)) return null;
  const before = getBackendPoints(student.id)[courseSlug];
  let last: number | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res: any = await courseService.getCourseLeaderboard(courseSlug);
      const list = Array.isArray(res) ? res : (res?.results || []);
      const own = findOwnPoints(list, student);
      console.debug('[Punts] leaderboard després d\'enviar', { intent: i, courseSlug, punts: own, abans: before });
      if (own == null) console.debug('[Punts] No es troba l\'alumne al leaderboard', { student, courseSlug, sample: JSON.stringify(list.slice(0, 3)) });
      if (own != null) {
        last = own;
        setCoursePoints(student.id, courseSlug, own);
        if (before == null || own > before) return own;
      }
    } catch (err) {
      // Un 4xx (sense permís, curs inexistent...) no canviarà reintentant.
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status && status >= 400 && status < 500) return last;
      /* error de xarxa o 5xx: es reintenta */
    }
    if (i < retries) await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

/** Hook per al header (i qualsevol lloc que mostri els punts de l'alumne). */
export function usePoints(): number {
  const read = () => {
    const s = getCurrentStudent();
    return s ? getTotalPoints(s.id) : 0;
  };
  const [points, setPoints] = useState(read);
  useEffect(() => {
    const update = () => setPoints(read());
    update();
    window.addEventListener(POINTS_EVENT, update);
    window.addEventListener('lessonProgressUpdated', update);
    window.addEventListener('auth-state-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(POINTS_EVENT, update);
      window.removeEventListener('lessonProgressUpdated', update);
      window.removeEventListener('auth-state-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return points;
}
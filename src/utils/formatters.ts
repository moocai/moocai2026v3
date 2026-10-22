import { FALLBACK_LANGUAGES, currentLanguage, toSupportedLanguage, type SupportedLanguage } from '../i18n';

type I18nField = Partial<Record<SupportedLanguage, string | null>>;

/**
 * Text d'un camp traduït (`{ ca, es, en }`) en l'idioma de la interfície (o `lang`). Si no hi és,
 * el primer que hi hagi en l'ordre de reserva del servidor (anglès, català, castellà).
 */
export function getLocalizedText(
  field: string | I18nField | undefined | null,
  lang: string = currentLanguage(),
): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const wanted = toSupportedLanguage(lang) ?? currentLanguage();
  for (const code of [wanted, ...FALLBACK_LANGUAGES]) {
    const text = field[code];
    if (text) return text;
  }
  return '';
}

/** `'es-ES'` → `'es'`; un idioma no suportat → `fallback` (per defecte, el de la interfície). */
export function getBaseLanguage(
  locale: string | undefined,
  fallback: SupportedLanguage = currentLanguage(),
): SupportedLanguage {
  return toSupportedLanguage(locale) ?? fallback;
}

export function formatProgressPercent(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export function calculatePoints(completedLessons: number): number {
  return completedLessons * 10;
}

export function padNumber(num: number, length: number = 2): string {
  return String(num).padStart(length, '0');
}

export function formatTimestamp(timestamp: number, locale: string = currentLanguage()): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function makeProgressKey(courseId: string, lessonId: string): string {
  return `${courseId}_${lessonId}`;
}

export function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString();
}

export function formatearNota(nota: number): string {
  return `${nota.toFixed(1)}/10`;
}

export function calcularColorProgreso(valor: number): string {
  if (valor >= 80) return '#22c55e';
  if (valor >= 50) return '#eab308';
  return '#ef4444';
}

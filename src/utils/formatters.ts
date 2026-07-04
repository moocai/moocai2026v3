type I18nField = { ca: string; es: string; en: string };
type SupportedLang = 'ca' | 'es' | 'en';

export function getLocalizedText(
  field: string | I18nField | undefined | null,
  lang: SupportedLang = 'ca'
): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field.ca || field.es || field.en || '';
}

export function getBaseLanguage(
  locale: string | undefined,
  fallback: SupportedLang = 'ca'
): SupportedLang {
  const lang = locale?.split('-')[0] as SupportedLang;
  return lang || fallback;
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

export function formatTimestamp(timestamp: number, locale: string = 'ca'): string {
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

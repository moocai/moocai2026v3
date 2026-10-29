import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ca from './i18n/ca';
import es from './i18n/es';
import en from './i18n/en';

// Idioma de la interfície. Una sola font: `i18n.language` (i el que en depèn: textos, contingut
// del servidor via `Accept-Language`, `<html lang>`). L'ordre de preferència és el d'algorien:
//   1. L'idioma triat explícitament (selector de la capçalera o del perfil), desat a `mooc-language`
//      i, amb sessió, al compte.
//   2. L'idioma desat al compte (s'aplica en iniciar sessió; vegeu `services/language.ts`).
//   3. El primer idioma del navegador que la plataforma suporta.
//   4. L'anglès.

export const SUPPORTED_LANGUAGES = ['ca', 'es', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/** Idioma per defecte i ordre de reserva per a contingut i textos que falten (com el servidor). */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
export const FALLBACK_LANGUAGES: readonly SupportedLanguage[] = ['en', 'ca', 'es'];

/** Clau de l'idioma triat explícitament. */
export const LANGUAGE_PICK_KEY = 'mooc-language';
/** Clau de l'idioma desat al compte amb sessió (es buida en tancar la sessió). */
export const ACCOUNT_LANGUAGE_KEY = 'mooc-account-language';
/** Clau que feia servir el detector d'i18next (abans el selector de la capçalera hi desava). */
const LEGACY_KEY = 'i18nextLng';

/** `'es-ES'` → `'es'`; `null` si no és un idioma suportat. */
export function toSupportedLanguage(code: string | null | undefined): SupportedLanguage | null {
  const base = code?.toLowerCase().split('-')[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base ?? '') ? base as SupportedLanguage : null;
}

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** L'idioma triat explícitament en aquest navegador, si n'hi ha. */
export function explicitLanguage(): SupportedLanguage | null {
  return toSupportedLanguage(readStorage(LANGUAGE_PICK_KEY));
}

/** El primer idioma del navegador que la plataforma suporta. */
export function browserLanguage(): SupportedLanguage | null {
  const candidates = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language];
  for (const code of candidates) {
    const lang = toSupportedLanguage(code);
    if (lang) return lang;
  }
  return null;
}

/**
 * El selector de la capçalera desava l'idioma triat a la clau del detector d'i18next, on el
 * detector també desava el del navegador. Si no coincideix amb el del navegador, és que algú
 * el va triar: passa a ser l'idioma triat. La clau antiga no es torna a fer servir.
 */
function migrateLegacyPick() {
  const legacy = toSupportedLanguage(readStorage(LEGACY_KEY));
  try {
    if (legacy && !explicitLanguage() && legacy !== browserLanguage()) {
      localStorage.setItem(LANGUAGE_PICK_KEY, legacy);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* mode privat */ }
}

function initialLanguage(): SupportedLanguage {
  migrateLegacyPick();
  const loggedIn = !!readStorage('token');
  return explicitLanguage()
    ?? (loggedIn ? toSupportedLanguage(readStorage(ACCOUNT_LANGUAGE_KEY)) : null)
    ?? browserLanguage()
    ?? DEFAULT_LANGUAGE;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ca: { translation: ca },
      es: { translation: es },
      en: { translation: en },
    },
    lng: initialLanguage(),
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: [...FALLBACK_LANGUAGES],
    interpolation: {
      escapeValue: false,
    },
  });

/** L'idioma actual, sempre un dels suportats. */
export function currentLanguage(): SupportedLanguage {
  return toSupportedLanguage(i18n.resolvedLanguage || i18n.language) ?? DEFAULT_LANGUAGE;
}

const syncDocumentLanguage = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = currentLanguage();
};
syncDocumentLanguage();
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;

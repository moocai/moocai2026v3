import i18n, {
  ACCOUNT_LANGUAGE_KEY, DEFAULT_LANGUAGE, LANGUAGE_PICK_KEY, browserLanguage, currentLanguage,
  explicitLanguage, toSupportedLanguage, type SupportedLanguage,
} from '../i18n';
import { apiClient } from './httpClient';
import { courseService } from './courseService';
import { queryClient } from './sessionCache';
import { PROFILE_URL } from './profileService';

// Canvis d'idioma, en l'ordre de preferència descrit a `i18n.ts`: el triat explícitament
// guanya (i, amb sessió, es desa al compte, com el selector d'algorien); si no n'hi ha, el del
// compte; si no, el del navegador; si no, l'anglès.

function store(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch { /* mode privat */ }
}

/** Desa l'idioma al compte (`PATCH /users/me/settings/`); un error no desfà el canvi local. */
function saveToAccount(lang: SupportedLanguage) {
  if (!localStorage.getItem('token')) return;
  store(ACCOUNT_LANGUAGE_KEY, lang);
  void apiClient.patch(PROFILE_URL, { language: lang }).catch(() => { /* es tornarà a desar en triar-lo */ });
}

/** L'usuari tria un idioma (selector de la capçalera o del perfil). */
export function chooseLanguage(code: string) {
  const lang = toSupportedLanguage(code);
  if (!lang) return;
  store(LANGUAGE_PICK_KEY, lang);
  saveToAccount(lang);
  void i18n.changeLanguage(lang);
}

/**
 * Després d'iniciar sessió. Si en aquest navegador s'havia triat un idioma, guanya i es desa al
 * compte; si no, s'adopta el del compte (el servidor el té sempre, triat abans o el del
 * navegador del primer accés).
 */
export function applyAccountLanguage(accountLanguage: string | null | undefined) {
  const pick = explicitLanguage();
  const account = toSupportedLanguage(accountLanguage);
  if (pick) {
    if (pick !== account) saveToAccount(pick);
    else store(ACCOUNT_LANGUAGE_KEY, pick);
    return;
  }
  if (account) {
    store(ACCOUNT_LANGUAGE_KEY, account);
    if (account !== currentLanguage()) void i18n.changeLanguage(account);
  }
}

/** En tancar la sessió: sense compte, l'idioma torna a ser el triat o el del navegador. */
export function clearAccountLanguage() {
  store(ACCOUNT_LANGUAGE_KEY, null);
  const lang = explicitLanguage() ?? browserLanguage() ?? DEFAULT_LANGUAGE;
  if (lang !== currentLanguage()) void i18n.changeLanguage(lang);
}

// El servidor tradueix noms, enunciats i missatges segons l'idioma de la petició: el que ja
// s'havia portat era en l'idioma anterior, i es torna a demanar (les consultes actives, ara).
i18n.on('languageChanged', () => {
  courseService.clearCache();
  void queryClient.invalidateQueries();
});

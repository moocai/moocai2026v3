// Prefix de les claus de localStorage on es desen les respostes dels tests (per alumne).
// Mòdul sense dependències perquè el puguin fer servir httpClient i authService sense cicles.
export const TEST_ANSWERS_PREFIX = 'mooc_test_answers_';

// Esborranys de codi de cada problema (`code_<idAlumne>_<curs>_<problema>`, i `…_view` amb el cursor).
export const CODE_DRAFT_PREFIX = 'code_';

// Claus antigues que desaven el codi i el nom de cada alumne que enviava des d'aquest navegador.
// Ja no s'escriuen ni es llegien enlloc: només s'esborren.
const LEGACY_SUBMISSIONS_PREFIX = 'mooc_submissions_';

const PRIVATE_PREFIXES = [TEST_ANSWERS_PREFIX, CODE_DRAFT_PREFIX, LEGACY_SUBMISSIONS_PREFIX];

/**
 * Esborra les dades privades de TOTS els usuaris d'aquest navegador: respostes dels tests (diuen
 * quines opcions són correctes) i esborranys de codi (són les solucions). No es poden quedar quan
 * acaba una sessió, ni quan n'entra una altra (algú pot haver tancat el navegador sense sortir): el
 * següent alumne les podria llegir (p. ex. amb les eines de desenvolupador). Amb sessió es tornen a
 * portar del servidor (respostes: `my_solution`; codi Python: còpia de seguretat del servidor).
 *
 * El progrés, els punts i la ratxa es queden: no revelen res i n'hi ha que només existeixen aquí.
 */
export function clearPrivateLocalData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && PRIVATE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch { /* localStorage no disponible */ }
}

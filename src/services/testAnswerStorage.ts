// Prefix de les claus de localStorage on es desen les respostes dels tests (per alumne).
// Mòdul sense dependències perquè el puguin fer servir httpClient i authService sense cicles.
export const TEST_ANSWERS_PREFIX = 'mooc_test_answers_';

/**
 * Esborra les respostes desades de TOTS els usuaris d'aquest navegador. Inclouen quines opcions
 * són correctes, així que no poden quedar-se quan acaba una sessió: el següent alumne les podria
 * llegir (p. ex. amb les eines de desenvolupador) abans de respondre. Amb sessió es tornen a
 * portar del servidor, així que no es perd res.
 */
export function clearSavedTestAnswers(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TEST_ANSWERS_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch { /* localStorage no disponible */ }
}

import { useEffect } from 'react';

/**
 * Marca la pàgina com a no indexable mentre el component és muntat i en restaura
 * el valor anterior en desmuntar-se. Les rutes privades (perfil, avisos, professorat)
 * no han d'aparèixer als cercadors.
 *
 * El comptador és necessari perquè hi ha rutes privades niuades (p. ex. `/teacher/profile`
 * munta el `TeacherLayout` i la `ProfilePage` alhora): sense ell, el desmuntatge en ordre
 * invers podia deixar el `noindex` posat en tornar a una pàgina pública.
 */
let activeCount = 0;
let previousContent: string | null = null;
let createdMeta = false;

function getMeta(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'robots';
    document.head.appendChild(meta);
    createdMeta = true;
  }
  return meta;
}

export function useNoindex(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const meta = getMeta();
    if (activeCount === 0) {
      previousContent = createdMeta ? null : meta.content;
    }
    activeCount += 1;
    meta.content = 'noindex, nofollow';

    return () => {
      activeCount = Math.max(0, activeCount - 1);
      if (activeCount > 0) return;

      const current = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (previousContent === null) {
        current?.remove();
      } else if (current) {
        current.content = previousContent;
      }
      previousContent = null;
      createdMeta = false;
    };
  }, [enabled]);
}

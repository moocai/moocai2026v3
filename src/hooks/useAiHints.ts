import { useCallback, useEffect, useState } from 'react';
import { courseService } from '../services/courseService';
import { apiErrorMessages } from '../services/httpClient';
import { resolveSlug } from './useCourse';

export interface AiHint {
  id: number | string;
  hint_text: string;
  user_code?: string;
  created_at?: string;
}

/**
 * Pistes d'IA d'un problema (com a algorien): la llista de les ja demanades i la
 * petició d'una de nova amb el codi actual. Les quotes les controla el servidor:
 * `remaining` només se sap després de demanar-ne una (la resposta la porta).
 */
export function useAiHints(courseId?: string, topicSlug?: string, problemSlug?: string) {
  const [hints, setHints] = useState<AiHint[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const ready = !!courseId && !!topicSlug && !!problemSlug;

  // En canviar de problema es comença de nou
  useEffect(() => {
    setHints([]); setError(null); setGenerating(false);
  }, [courseId, topicSlug, problemSlug]);
  // Les que queden avui són per curs
  useEffect(() => { setRemaining(null); }, [courseId]);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoadingList(true);
    try {
      const fetched: AiHint[] = await courseService.getHints(resolveSlug(courseId!), topicSlug!, problemSlug!);
      // Es fusiona amb les que ja hi ha: una pista acabada de generar no s'ha de perdre si la
      // llista arriba després (el botó de l'editor obre la pestanya i demana la pista alhora)
      setHints((prev) => {
        const byId = new Map<string | number, AiHint>();
        [...fetched, ...prev].forEach((h) => { if (!byId.has(h.id)) byId.set(h.id, h); });
        return [...byId.values()].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
      });
    } catch {
      // Sense llista (p. ex. sense sessió): no és un error que calgui mostrar
    } finally {
      setLoadingList(false);
    }
  }, [ready, courseId, topicSlug, problemSlug]);

  const generate = useCallback(async (code: string, fallbackError: string) => {
    if (!ready || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await courseService.createHint(resolveSlug(courseId!), topicSlug!, problemSlug!, code);
      setHints((prev) => [{ id: data.hint_id ?? Date.now(), hint_text: data.hint, user_code: data.user_code, created_at: data.created_at }, ...prev]);
      if (typeof data.hints_remaining === 'number') setRemaining(data.hints_remaining);
    } catch (err: any) {
      // El servidor explica el motiu (límit diari, correu sense confirmar, IA no disponible...)
      if (err?.response?.data?.code === 'hint_limit_reached') setRemaining(0);
      setError(apiErrorMessages(err).join(' ') || fallbackError);
    } finally {
      setGenerating(false);
    }
  }, [ready, generating, courseId, topicSlug, problemSlug]);

  return { hints, loadingList, generating, error, remaining, load, generate };
}

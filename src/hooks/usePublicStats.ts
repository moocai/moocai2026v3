import { useQuery } from '@tanstack/react-query';
import { statsService } from '../services/statsService';

export const PUBLIC_STATS_KEY = ['public-stats'] as const;

// El backend no exposa encara GET /public/stats/. La crida només s'activa quan
// la variable d'entorn s'activa (VITE_ENABLE_PUBLIC_STATS=true), de manera que
// la portada no fa cap petició que retorni 404 mentre l'endpoint no existeix.
const STATS_ENABLED =
  import.meta.env.VITE_ENABLE_PUBLIC_STATS === 'true' ||
  import.meta.env.VITE_ENABLE_PUBLIC_STATS === '1';

export function usePublicStats() {
  return useQuery<number | null>({
    queryKey: PUBLIC_STATS_KEY,
    queryFn: () => statsService.getStudentCount(),
    enabled: STATS_ENABLED,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}
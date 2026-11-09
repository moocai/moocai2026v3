import { QueryClient } from '@tanstack/react-query';

/** El client de React Query de l'app (el fa servir `main.tsx`). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const resetters = new Set<() => void>();

/** Registra una memòria cau pròpia d'un servei per buidar-la quan canvia la sessió. */
export function onSessionChange(reset: () => void): void {
  resetters.add(reset);
}

/**
 * Buida tot el que s'ha portat del servidor amb la sessió anterior: el que veu un usuari depèn
 * de qui és (el professorat rep reptes i temes bloquejats, les respostes pròpies.), i si no
 * es buidés, qui entrés després al mateix navegador ho veuria fins que caduqués. Les consultes
 * actives es tornen a demanar amb la sessió nova.
 *
 * Amb `refetch = false` (sortida o 401) no es refan: el token ja no hi és i tornarien a
 * respondre 401. En entrar, es refan amb el token nou.
 */
export function resetSessionCaches(refetch = true): void {
  resetters.forEach((reset) => reset());
  if (refetch) {
    void queryClient.resetQueries();
  } else {
    queryClient.clear();
  }
}

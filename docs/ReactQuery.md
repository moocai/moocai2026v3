¿Qué es React Query?

Librería para manejar estado asíncrono del servidor en React. No es estado global (Redux/Zustand) ni reemplaza contextos para datos síncronos del cliente (auth, theme, i18n). Está diseñada específicamente para sincronizar frontend con API.

Conceptos clave

Queries (lectura): declaras una clave única y una función que trae datos. Si dos componentes piden la misma clave, comparten cache — una sola petición al backend.
Mutaciones (escritura): envías datos al servidor y, al éxito, invalidás la query relacionada para que los componentes que la usan se actualicen solos.
Estados por query: isLoading (primera carga, sin cache), isFetching (cualquier fetch, incluso en background), data (respuesta cacheada), error, isStale (datos obsoletos según tiempo configurado).

Ciclo de vida

Componente se monta → isLoading, se ejecuta la petición
Respuesta → data relleno, isLoading false, datos cacheados por clave
Pasa el staleTime → datos marcados obsoletos
Componente se remonta o ventana recupera foco → refetch silencioso en background
Si hay cache + refetch: UI muestra datos viejos instantáneamente, se actualiza sin flash de carga

Beneficios

Elimina useEffect + useState + localStorage para datos de servidor. Cada recurso (cursos, progreso, alumnos) se declara como una query, no como estado manual con efectos.
Cache compartido entre componentes. Dos páginas que muestran cursos leen del mismo cache. Mutas en una pantalla, la otra se actualiza sola vía invalidación.
Refetch automático. Al perder/recuperar foco, reconexión o tiempo — sin eventos manuales ni listeners.
Estados de carga/error unificados. isLoading, isError, data vienen de la query, no de useState dispersos.
Retries con backoff. Si la API devuelve 5xx, reintenta automáticamente sin código extra.
Stale-while-revalidate. Navegación entre páginas instantánea porque muestra cache mientras refresca en background.

Contras

Dependencia nueva (~35KB gzip). En un proyecto con MUI (~170KB) es ruido marginal, pero hay que añadirla.
Overhead inicial. Provider, configuración de defaults (staleTime, retries), entender conceptos como staleTime vs gcTime.
No sirve para estado del cliente. Auth, theme, i18n, modales, formularios siguen siendo useState/context. Convivirán dos sistemas.
Curva de aprendizaje. Invalidación, optimistic updates, dependencias en queryKeys — para casos simples no hay problema, para mutaciones avanzadas la complejidad sube.
Excesivo si nunca hay API real. Si el proyecto sigue 100% localStorage, añade complejidad muerta. Los efectos actuales funcionan.
Cache en RAM. Recargar la página pierde todo el cache. Si necesitas persistencia offline, requieres adaptador extra.

Veredicto

Si todo viene de API y no hay localStorage, habria que añadir React Query ahora. No hay debate.
El proyecto ya tiene la estructura (api.ts, servicios separados, tipos). Lo que hoy es localStorage.getItem pasa a ser useQuery con el queryFn llamando al servicio correspondiente. Cuando el backend real llegue, solo cambia la URL en VITE_API_URL — las queries ya están escritas.
Coste: una instalación, un provider, y refactorizar lecturas/escrituras. El refactor no es reescribir — es mapear cada useEffect + useState + localStorage por una useQuery/useMutation. La lógica de negocio queda igual.
Riesgo de no hacerlo ahora: cuando llegue la API tendremos que reescribir igual, pero con más prisa y probablemente con menos cuidado. Es trabajo duplicado.

---

Estat actual: **React Query ja está implementat al projecte.**

Fitxers on s'utilitza:

| Fitxer | Ús |
|---|---|
| `src/main.tsx` | Creació del `QueryClient` amb configuració global (`staleTime: 5min`, `gcTime: 30min`, `retry: 1`) i `QueryClientProvider` wrapper |
| `src/hooks/useCourse.ts` | `useQuery` per obtenir detall complet d'un curs (`queryKey: ['course', courseId]`), funció `prefetchCourse` amb `prefetchQuery` |
| `src/components/CourseCard.tsx` | `useQueryClient` per fer prefetch dels cursos al fer `mouseenter` a la Card |

No s'utilitzen `useMutation`, `invalidateQueries` ni `setQueryData` en cap altre lloc del projecte.


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

Estat actual: **React Query implementat; la portada, el dashboard i els cursos ja el fan servir.** El desplegament d'aquesta secció (llistes, detalls de curs i prefetch) és el follow-up React Query de **`docs/fix1.md`**.

**Última revisió: 6 d'octubre de 2026 (post `fix1` i `fix2`).**

### Configuració global — `src/main.tsx`

```ts
new QueryClient({
  staleTime: 5 * 60 * 1000,      // 5 min
  gcTime: 30 * 60 * 1000,       // 30 min
  retry: 1,
  refetchOnWindowFocus: false,
})
```

`QueryClientProvider` és el wrapper **superior** de tota l'app (per damunt de `BrowserRouter`).

### Ús real al codi

| Fitxer | Ús |
|---|---|
| `src/main.tsx` | `QueryClient` + `QueryClientProvider` (defaults globals) |
| `src/hooks/useCourse.ts` | `useCourse(courseId)` → `useQuery` amb `queryKey: ['course', courseId]`; `prefetchCourse()`. `staleTime: 30min`, `gcTime: 60min`, `retry: 1`, `enabled: !!courseId && courseId !== 'undefined'` |
| `src/hooks/useCourses.ts` | `useAllCourses()` → `['courses']`; `usePublicCourses()` → `['public-courses']`; `useCourseDetail(slug)` → `['course', slug]` (**mateixa key** que `useCourse`, així la cache es comparteix); `prefetchAllCourses()`. Llistes: `staleTime 5min`. Detalls: `staleTime 30min`, `gcTime 60min` |
| `src/hooks/usePublicStats.ts` | `usePublicStats()` → `['public-stats']`. Activada només quan `VITE_ENABLE_PUBLIC_STATS=true` (el backend encara no exposa `GET /public/stats/`). `staleTime 10min`, `gcTime 30min`, `retry: 2`; el `queryFn` va per `api.get` (`httpClient`) |
| `src/components/CourseCard.tsx` | `useQueryClient()` + `prefetchCourse()` a l'`onMouseEnter` de la Card |
| `src/components/Hero.tsx` | `usePublicStats()` → comptador d'alumnes de la portada (reactivat; vegeu `TODO(stats)`) |
| `src/layouts/MainLayout.tsx` | `useQueryClient` + `prefetchAllCourses` → omple la cache de React Query amb la llista de cursos |
| `src/pages/Home.tsx` | `useAllCourses(isLoggedIn)` en lloc de `useState`+`useEffect`; `invalidateQueries(['courses'])` en `authChange`/`storage`/`visibilitychange` |
| `src/pages/dashboards/StudentDashboard.tsx` | `useAllCourses()` + `usePublicCourses()` + `useQueries(['course', slug])` per als detalls (dedup amb la resta); `invalidateQueries` de llistes i detalls en `auth-state-change` |
| `src/pages/courses/CourseLessons.tsx` | `useCourse(courseId)` — substitueix el `useState`+`useEffect` original |
| `src/pages/courses/LessonPage.tsx` | `useCourse(courseId)` — idem |
| `src/pages/courses/TopicTestPage.tsx` | `useCourse(courseId)` — idem |

`useCourse` resol els ids de curs clonat (`clone-<timestamp>`) a l'slug original via `localCourseService.getById().originalSlug` abans de cridar el servei.

### S'utilitza ara
- `useQueries` (StudentDashboard, un detall per curs) i `invalidateQueries` (Home i StudentDashboard).
- Des de **`docs/fix2.md`**, `httpClient` dispara `auth-state-change` quan un **401 caducat** tanca la sessió: `StudentDashboard` reacciona invalidant llistes i detalls i cridant `courseService.clearCache()`, de manera que les dues caches es reinicien juntes.
- `useMutation` i `setQueryData` **no apareixen encara** al projecte; `useSuspenseQuery`, `useInfiniteQuery` i els *devtools* tampoc.

### Prefetch — `src/layouts/MainLayout.tsx`

Només es precarrega la **llista** de cursos:

```ts
prefetchAllCourses(queryClient).catch(() => {});
```

Abans també es precarregava el detall complet de cada curs (`prefetchCourseDetail`), però això són 2 + N peticions per curs (una per tema) a cada càrrega de qualsevol pàgina. Ara cada pàgina demana el detall quan el necessita, i continua compartint la cache `['course', slug]` (React Query deduplica per queryKey).

`TopicTestPage` no carrega el detall del curs: demana el curs (`['course-info', slug]`, per al títol) i els problemes del seu tema (`['topic-problems', slug, topic]`, sempre fresca). El tema li arriba per `?topic=`; sense, el treu de `['course', slug]` si ja és a la cache.

### Cache duplicada
Encara hi ha **dues caches** de curs:

1. Cache de React Query (`queryKey: ['course', slug]`), amb `staleTime` de 30 min.
2. Cache manual de `courseService`: `fullCourseCache` (Map per slug), `allCoursesCache` i `publicCoursesCache`.

Per això, als canvis de sessió el `StudentDashboard` crida `courseService.clearCache()` **i** `invalidateQueries` perquè totes dues quedin sincronitzades. La cache manual es pot eliminar quan les llistes passin del tot per `useAllCourses`/`usePublicCourses`.


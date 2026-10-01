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

**Última revisió: 1 d'octubre de 2026.**

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
| `src/hooks/useCourse.ts` | `useCourse(courseId)` → `useQuery` amb `queryKey: ['course', courseId]`; `prefetchCourse()` → `prefetchQuery`. Amb `staleTime: 30min`, `gcTime: 60min`, `retry: 1`, `enabled: !!courseId && courseId !== 'undefined'` |
| `src/components/CourseCard.tsx` | `useQueryClient()` + `prefetchCourse()` a l'`onMouseEnter` de la Card |
| `src/pages/courses/CourseLessons.tsx` | `useCourse(courseId)` — substitueix el `useState`+`useEffect` original |
| `src/pages/courses/LessonPage.tsx` | `useCourse(courseId)` — idem |
| `src/pages/courses/ExamPage.tsx` | `useCourse(courseId)` — idem |

`useCourse` resol els ids de curs clonat (`clone-<timestamp>`) a l'slug original via `localCourseService.getById().originalSlug` abans de cridar el servei.

### No s'utilitza
- `useMutation`, `invalidateQueries` i `setQueryData` **no apareixen enlloc** del projecte.
- `useSuspenseQuery`, `useInfiniteQuery` i els *devtools* tampoc.

### Bypass de React Query — `src/layouts/MainLayout.tsx`

El layout fa prefetch **fora de React Query**:

```ts
useEffect(() => {
  getAllCourses().then(courses => {
    courses.forEach(course => courseService.getFullCourseDetail(course.slug!));
  });
}, []);
```

Això omple la **cache en memòria de `courseService`** (`fullCourseCache`), no la de React Query. Conseqüència: la primera visita a un curs encara retorna `isLoading` de React Query malgrat que el servei ja té la dada; l'avantatge real és que `getFullCourseDetail` no torna a petar la API. Per tenir una cache única caldria `queryClient.prefetchQuery` en lloc de la crida directa al servei.

### Cache duplicada
Hi ha **dues caches** de curs que no es sincronitzen:

1. Cache de React Query (`queryKey: ['course', id]`), amb `staleTime` de 30 min.
2. Cache manual de `courseService`: `fullCourseCache` (Map per slug), `allCoursesCache` i `publicCoursesCache`.

Per això `courseService.clearCache(slug?)` **no invalida** res a React Query, i `clearCache()` sense slug tampoc neteja `publicCoursesCache`.


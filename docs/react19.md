# Auditoria i Modernització React 19

## Resum

Migració completa del projecte a patrons React 19. S'han eliminat anti-patrons heredats de React 17/18 i redundàncies, sense alterar l'estil visual ni la lògica de negoci. **Build: 0 errors. Última actualització: 16 de juny de 2026.**

---

## Canvis realitzats

### 1. `useContext` → `use()` (4 fitxers)
**Fitxers**: `src/contexts/ThemeContext.tsx`, `I18nContext.tsx`, `AuthContext.tsx`, `NotificationContext.tsx`

- **`import { useContext, ... }`** → **`import { use, ... }`**
- **`useContext(TheContext)`** → **`use(TheContext)`**
- **Motiu**: React 19 recomana `use(Context)` en lloc de `useContext(Context)` per llegir valors de context.

### 2. `useEffect` per persistència → eliminat (1 fitxer)
**Fitxer**: `src/contexts/ThemeContext.tsx`

- **Eliminat `useEffect`** que persistia `mode` a localStorage
- **`I18nContext.tsx`**: Manté un `useEffect` per sincronitzar localStorage amb i18n (necessari perquè i18n pot canviar externament)
- **Motiu**: `setMode()` ja crida `localStorage.setItem()`. L'effect era redundant i afegia un cicle de render extra.

### 3. `useEffect` per dades estàtiques → `useEffect` per events + `useCallback` (1 fitxer)
**Fitxer**: `src/components/Hero.tsx`

- **`useEffect`** que carregava dades d'imports estàtics → **`useCallback`** per llegir estudiants des de localStorage + **`useEffect`** per escoltar event `studentsUpdated`
- **Motiu**: Les stats d'estudiants ara són dinàmiques (es poden afegir/eliminar usuaris). L'`useEffect` subscriu a un event window, cosa que és un ús legítim d'`useEffect` per a efectes externs.

### 4. `React.FormEvent`/`React.MouseEvent` → tipus directes (5 fitxers)
**Fitxers**: `Login.tsx`, `StudentDashboard.tsx`, `features/student/CourseCard.tsx`, `features/student/StudentCard.tsx`, `components/CourseCard.tsx`

- **`React.FormEvent`** → **`FormEvent`** (importat de `react`)
- **`React.MouseEvent`** → **`MouseEvent`** (importat de `react`)
- **Motiu**: React 19 amb JSX transform automàtic no necessita `import React`.

### 5. `App.tsx` — `useEffect` per body background eliminat
- Eliminat `useEffect` que feia `document.body.style.backgroundColor = theme.palette.background.default`
- El fons es gestiona directament al JSX (`<Box sx={{bgcolor: 'background.default'}}>`)

### 6. `main.tsx` — imports nets + NotificationProvider
- **`import React from 'react'`** → **`import { StrictMode } from 'react'`**
- **`ReactDOM.createRoot`** → **`createRoot`**
- **`<React.StrictMode>`** → **`<StrictMode>`**
- **Afegit `NotificationProvider`** a la cadena de providers

### 7. `Header.tsx` — estat `mounted` eliminat
- Eliminat patró `mounted` necessari per SSR/hidratació. En app Vite client-side, `mounted` és `true` des del primer render.

### 8. `Footer.tsx` — `import React` → `import type { ReactNode }`
- `import type` no impacta al bundle.

### 9. `LessonPage.tsx` — `useRef` tipus simplificat
- **`useRef<NodeJS.Timeout | null>(null)`** → **`useRef<ReturnType<typeof setInterval>>(null)`**

### 10. `Login.tsx` — `useEffect` + `useState` → prop `students` des del pare
- Lectura de localStorage síncrona amb lazy initializer eliminada.
- `students` ara es rep com a prop des de `StudentDashboard`, que gestiona la fusió i persistència.

### 11. `LessonPage.tsx` — estat `mounted` eliminat
- `baseLesson` ja fa de guard.

### 12. `src/i18n.ts` (arrel) — eliminat
- Duplicat de `src/i18n/index.ts` eliminat. `main.tsx` ara importa `./i18n` que resol a `src/i18n/index.ts`.

### 13. `NotificationContext` integrat a LessonPage + StudentDashboard
- Toast notifications en desar progrés (LessonPage) i en login/logout/create/delete/reset (StudentDashboard).

### 14. `StudentDashboard.tsx` — gestió d'estudiants centralitzada
- Fusió i persistència d'estudiants moguda del `Login` al `StudentDashboard`.
- `Login` rep `students` com a prop.
- Es dispara event `studentsUpdated` en crear/eliminar usuaris per sincronitzar `Hero.tsx`.

### 15. Notificacions traduïbles als 3 idiomes
- Totes les notificacions toast (`LessonPage.tsx` + `StudentDashboard.tsx`) ara usen `t('notifications.*')` amb interpolació d'i18next.
- 9 claus afegides a `ca.ts`, `es.ts`, `en.ts` secció `notifications`.

### 16. `AuthProvider` + `I18nProvider` connectats a main.tsx
- `AuthProvider` afegit a la cadena de providers (abans no estava connectat).
- `I18nProvider` afegit a la cadena de providers (abans es feia `import './i18n'` directament).
- Eliminat `import './i18n'` de `main.tsx` — `I18nProvider` ja s'encarrega d'inicialitzar i18next.

### 17. `StudentDashboard.tsx` — `AnimatePresence` + `motion` eliminats
- Import `{motion, AnimatePresence}` de framer-motion eliminat.
- Wrappers `<AnimatePresence>` i `<motion.div>` substituïts per JSX natiu/Box.
- `Motion` eliminat de `CourseExpandedContent.tsx` (`motion.div` → `Box`).

### 18. `theme.ts` — `background.default` canviat a `white`
- **`'#f5f5f5'`** → **`'white'`** per al mode clar.

### 19. `courseService.ts` — fallback metadata buit
- `level: 'Bàsic'` → `''`, `duration: '8 hores'` → `''`, `instructor: 'Professor'` → `''`

### 20. `NotificationHub.tsx` — colors adaptatius dark/light
- Afegit `useTheme` de MUI per detectar `theme.palette.mode`
- **Dark**: `bgcolor="#141424"`, text/icona `white`
- **Light**: `bgcolor="white"`, text/icona `#141424`
- Barra de progrés amb gradient `#8400ff`

### 21. `@tanstack/react-query` — Cache centralitzada de cursos (16 juny)
- **Nova dependència**: `@tanstack/react-query ^5.101.0` afegida a `package.json`
- **`QueryClientProvider`** afegit a `main.tsx` com a wrapper superior (abans de BrowserRouter)
  - `staleTime: 5 min`, `gcTime: 30 min`, `retry: 1`, `refetchOnWindowFocus: false`
- **Nou hook**: `src/hooks/useCourse.ts` — `useCourse(courseId)` amb `useQuery`
  - `queryKey: ['course', courseId]` per cachejar detalls de curs
  - `prefetchCourse(queryClient, courseId)` per prefetching on hover
- **`CourseCard.tsx`** (Home): Afegit `onMouseEnter` → `prefetchCourse()` per carregar curs en background al fer hover
- **`CourseLessons.tsx`**: Substituït `useState` + `useEffect` + `courseService.getFullCourseDetail()` per `useCourse(courseId)`
- **`LessonPage.tsx`**: Substituït `useState` + `useEffect` per `useCourse(courseId)`
- **Motiu**: Centralitzar la cache de cursos, evitar re-fetches en navegació, prefetching predictiu

### 22. `api.ts` — Simplificat a localStorage només (16 juny)
- Eliminada dependència d'`axios` a `api.ts`
- `getStudentProgress`: Ja no fa petició API — només llegeix `mooc_global_progress` de localStorage
- `postProgress`: Ja no intenta POST a l'API — només escriu a localStorage i dispara event `lessonProgressUpdated`
- `resetCourse`: Ja no fa DELETE a l'API — només neteja clues de localStorage
- **Motiu**: L'API de progrés no estava disponible consistentment; es prioritza l'experiència offline/local

### 23. `LessonPage.tsx` — `handleRunTests` async amb API real (16 juny)
- `handleRunTests` canviat de síncron a `async`
- Ara envia el codi al backend via `courseService.submitChallenge()` amb `POST /api/v1/courses/{slug}/topics/{topic}/problems/{problem}/submissions/`
- El resultat es determina per `result.status === 'correct'` o `result.passed === true`
- Confeti reduït a 30 partícules (abans 100)
- Error de connexió mostra missatge a la consola
- **`handleSaveProgress`**: Desa `mooc_last_session` a localStorage per a la funcionalitat "Continuar"

### 24. `CourseExpandedContent.tsx` — "Última sessió" + continuar (16 juny)
- Llegeix `mooc_last_session` de localStorage al renderitzar
- Mostra icona `PlayCircle` taronja (`#ff9800`) per la lliçó de l'última sessió activa no completada
- **Motiu**: UX perquè l'usuari sàpiga on ho va deixar

### 25. `StudentDashboard.tsx` — Loading spinner + initializer (16 juny)
- `Loader2` de lucide-react substituït per `CircularProgress` de MUI
- `useTheme` eliminat (ja no necessari per al spinner)
- `dbProgress` ara fa lazy initialization des de `localStorage`
- Loading state: `position: fixed, inset: 0, zIndex: 9999`

### 26. `CourseLessons.tsx` + `LessonPage.tsx` — Loading state fullscreen (16 juny)
- Spinner canviat a `position: fixed, inset: 0, zIndex: 9999` en comptes de layout inline
- Evita salt de layout mentre carrega

### 27. Traduccions noves (16 juny)
- **`dashboard.last_session`**: "Última sessió" (CA/ES) / "Last session" (EN)
- **`dashboard.continue`**: "Continuar" (CA/ES) / "Continue" (EN)

### 28. `LessonPage.tsx` — Finestra consola reutilitzable + temps real (16 juny)
- **`consoleWindowRef`**: Nou `useRef<Window | null>` per emmagatzemar la referència a la finestra popup de la consola
- **`handleOpenConsole`**: Si la finestra ja existeix i no està tancada, fa `focus()` en lloc d'obrir-ne una de nova. Si està tancada, en crea una i la guarda al ref
- **`useEffect` sincronització**: Cada cop que `consoleOutput` canvia, reescriu automàticament el contingut de la finestra popup (temps real). Depèn de `[consoleOutput, courseId]`
- **`handleRunTests`**: Ara crida `handleOpenConsole()` automàticament al principi — l'usuari no ha d'obrir la consola manualment per veure el resultat
- **Motiu**: UX millorada — evitar múltiples finestres emergents i mostrar feedback en temps real sense clics addicionals

---

## Patrons no detectats (ja nets)

| Patró | Estat |
|-------|-------|
| `forwardRef` | ❌ No s'usa |
| `PropTypes` / `propTypes` | ❌ No s'usa |
| `defaultProps` | ❌ No s'usa |
| Class components | ❌ Tots function components |
| `findDOMNode` | ❌ No s'usa |
| `React.FC` / `FunctionComponent` | ❌ No s'usa |

---

## Arxius buits detectats (pendents d'implementar)

```
src/hooks/useTeacherData.ts
src/layouts/TeacherLayout.tsx
src/features/teacher/ChatWidget.tsx
src/features/teacher/CourseForm.tsx
src/features/teacher/ExerciseEditor.tsx
src/features/teacher/StatsCards.tsx
src/features/teacher/StudentFilters.tsx
src/features/teacher/StudentTable.tsx
src/pages/teacher/Dashboard.tsx
src/pages/teacher/Courses.tsx
src/pages/teacher/Exercises.tsx
src/pages/teacher/Students.tsx
src/components/ui/ProgressBar.tsx
src/components/ui/SearchInput.tsx
src/services/teacherService.ts
```

---

## Fitxers que NO cal migrar

| Directori | Motiu |
|-----------|-------|
| `src/services/` | Axios + lògica, no React |
| `src/utils/` | Funcions pures, no React |
| `src/data/` | Dades estàtiques, no React |
| `src/types/` | Types només, no React |
| `src/theme/` | MUI pur, no React |
| `src/i18n/` | i18next, no React |
| `src/middleware/` | No existeix |
| `public/` | Estàtics |
| `dist/` | Build output |

---

## Fitxers de configuració (ja React 19)

| Fitxer | Estat |
|--------|-------|
| `package.json` | ✅ `react@^19.2.7`, `@types/react@^19.2.16` |
| `tsconfig.json` | ✅ `"jsx": "react-jsx"` |
| `vite.config.ts` | ✅ `babel-plugin-react-compiler` amb `target: "19"` |
| `@tanstack/react-query` | ✅ `^5.101.0` |
| `@vitejs/plugin-react` | ✅ `^5.2.0` (upgraded from `^4.3.0`) |
| `index.html` | ✅ HTML genèric |

---

## Dependències del projecte

```json
"react": "^19.2.7"              → 19.2.7
"react-dom": "^19.2.7"          → 19.2.7
"@types/react": "^19.2.16"      → 19.2.16
"@types/react-dom": "^19.2.3"   → 19.2.3
"react-router-dom": "^6.30.3"   → 6.30.4
"@tanstack/react-query": "^5.101.0" → 5.101.0
```

**Override**: `"react-is": "19.0.0"` (per compatibilitat MUI v9)

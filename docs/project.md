# MOOC React 2026
**Última actualització: 1 d'octubre de 2026**

> Aquest document descriu **l'estat real del codi** a la data indicada. Les seccions marcades amb ⚠️ recullen deute tècnic o discrepàncies detectades llegint el codi, no suposicions.

## 1. Descripció del Projecte

**MOOC React 2026** (`mooc-2026-vite`) és una plataforma d'aprenentatge online (MOOC) multiidioma construïda amb React 19 i Vite 6. Té dues cares ben diferenciades:

- **Alumne**: navega cursos, llegeix teoria, resol reptes de programació i tests en un editor **Monaco** integrat (amb render en viu de React), segueix el seu progrés i consulta un rànquing.
- **Professor**: disposa d'un layout propi (`/teacher`) amb tauler, editor d'exercicis, llistat d'exercicis i tests, generador de cursos locals, invitacions i classificació.

La persistència del progrés és **local (`localStorage`)**; el contingut ve d'una API externa allotjada a `https://algorien.com` (no hi ha backend propi al repositori). Hi ha **dos fluxos d'autenticació en paral·lel** que cal no confondre (vegeu §8 i §15).

---

## 2. Tecnologies i Dependències

Versions reals de `package.json`:

| Categoria | Llibreria | Versió | Ús |
|-----------|-----------|--------|-----|
| **Framework** | React / react-dom | ^19.2.7 | Components i hooks |
| **Build** | Vite | ^6.0.0 | Dev server i bundling |
| **Router** | react-router-dom | **^7.18.4** | Navegació SPA (v7; **ja no** fa servir future flags v6) |
| **UI** | @mui/material · @mui/icons-material | ^9.0.0 | Components Material Design + icones |
| **Estils** | @emotion/react · @emotion/styled | ^11.14.0 / ^11.14.1 | CSS-in-JS |
| **Icons alt.** | lucide-react | ^0.577.0 | Icones (Home, professor, lesson, etc.) |
| **Cache/Query** | @tanstack/react-query | ^5.101.0 | Cache de cursos i prefetching |
| **Editor** | **@monaco-editor/react · monaco-editor** | **^4.7.0 / ^0.57.0** | Editor VS Code (LessonPage, ExerciseEditor) |
| **Animacions** | framer-motion · @react-spring/web | ^12.38.0 / ^10.1.0 | Animacions (Header) i toastos |
| **i18n** | i18next · react-i18next · i18next-browser-languagedetector | ^26.0.6 / ^17.0.4 / ^8.2.1 | Multiidioma (CA, ES, EN) |
| **HTTP** | axios | ^1.15.0 | Peticions REST |
| **Confetti** | canvas-confetti | ^1.9.2 | Animació en completar |
| **Markdown** | react-markdown · remark-gfm | ^10.1.0 / ^4.0.1 | Render de teoria |
| **Tipus** | TypeScript | ^5.5.0 | Tipat estàtic |
| **Dev** | @vitejs/plugin-react · @types/node · @types/react(-dom) · postcss · autoprefixer · tailwindcss | ^5.2.0 / ^25.6.0 / ^19.2.16 / ^19.2.3 / ^8.4.0 / ^10.4.0 / ^3.4.0 | Configuració build |

### ⚠️ Dependències declarades però NO utilitzades
- **`babel-plugin-react-compiler`**: és a `dependencies` però **no està configurat enlloc**. `vite.config.ts` només fa servir `@vitejs/plugin-react` amb `react()` i sense opcions de Babel. El projecte **no** compila amb el React Compiler.
- **Tailwind i derivats** (`tailwindcss`, `postcss`, `autoprefixer`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `tw-animate-css`): declarats, però **no hi ha `tailwind.config.*` ni `postcss.config.*`** i no s'usa cap classe de Tailwind a `src/`. Són dependències mortes.
- **`clsx`** i **`tailwind-merge`** tampoc no s'importen enlloc.

### Override
```json
"overrides": { "react-is": "19.0.0" }
```
(Necessari per compatibilitat de MUI v9 amb React 19.)

---

## 3. Estructura Real del Projecte

```
moocai2026/
├── index.html                        # lang="es", carrega /data.js, /src/main.tsx
├── package.json                      # scripts: dev / build (tsc -b && vite build) / preview
├── vite.config.ts                    # alias @→./src, proxy /api→algorien.com, port 5173, polling
├── tsconfig.json                     # strict + noUnusedLocals + noUnusedParameters, jsx react-jsx
├── netlify.toml                      # build→dist, redirect /api/*→algorien.com, SPA fallback
│
├── docs/                             # Aquest directori (project, apis, canvis, monaco, react19, ReactQuery, spring3)
│
├── public/
│   ├── data.js                       # Fixture global antic (window.EXAM_DATA), 569 B
│   └── img/                          # logo.webp, favicon.png, Python.svg, React.svg, SB.svg, ml.svg
│
└── src/
    ├── main.tsx                      # Punt d'entrada (stack de providers, §4)
    ├── App.tsx                       # Router (17 rutes, §5)
    ├── index.css                     # Scrollbar (var --scrollbar-thumb: #8400ff)
    ├── App.css                       # ⚠️ ORFE — boilerplate del starter Vite, no s'importa
    ├── env.d.ts                      # Declaracions d'assets (*.css, *.svg, *?worker)
    ├── i18n.ts                       # ✅ Config i18next ACTIVA (fallback 'ca')
    │
    ├── i18n/                         # Recursos de traducció
    │   ├── ca.ts, es.ts, en.ts       # 11 seccions cadascun
    │   └── index.ts                  # ⚠️ MORT — duplicat exacte de src/i18n.ts, sense importadors
    │
    ├── components/
    │   ├── Header.tsx                # AppBar sticky + usePoints + role switcher + menú mòbil
    │   ├── Hero.tsx                  # Landing: typewriter + stats (default export)
    │   ├── Footer.tsx                # Només s'usa a Home (no a MainLayout)
    │   ├── CourseCard.tsx            # Card de curs (Home) amb prefetch on hover
    │   ├── ParticlesBackground.tsx   # Canvas de partícules (default export, prop opacityMultiplier)
    │   ├── ThemeToggleButton.tsx     # light/dark/fancy
    │   ├── LanguageSwitcher.tsx      # CA/ES/EN (crida i18n directament, bypassa I18nContext)
    │   ├── UserAvatarMenu.tsx        # ⚠️ Nom enganyós: és només un Avatar, sense menú
    │   ├── ConsolePanel.tsx          # Consola d'output (usada per ExerciseEditor)
    │   ├── ReactLivePreview.tsx      # Preview React en viu (transpila TSX amb el worker de Monaco)
    │   └── ui/
    │       ├── Card.tsx              # Card/CardHeader/CardTitle/CardDescription/CardContent
    │       ├── badge.tsx             # Badge (no usat) + BadgeEstado (StudentTable)
    │       ├── NotificationHub.tsx   # Pila de toastos (react-spring)
    │       ├── ProgressBar.tsx       # Barra 8px (StudentTable)
    │       └── SearchInput.tsx       # TextField de cerca (StudentFilters)
    │
    ├── contexts/
    │   ├── AuthContext.tsx           # ⚠️ Provider muntat, però useAuth() no es consumeix enlloc
    │   ├── ThemeContext.tsx          # 3 modes + ParticlesBackground
    │   ├── I18nContext.tsx           # idioma (clau mooc-language)
    │   └── NotificationContext.tsx   # toastos (2s)
    │
    ├── data/
    │   └── courses.ts                # Mapa imatge de curs (només 2 entrades: python-public-test, python-test)
    │
    ├── features/
    │   ├── student/
    │   │   ├── types.ts              # Student, Lesson, Topic, Course (shape propi)
    │   │   ├── Login.tsx             # Login + registre + "forgot" (UI), consumeix register API
    │   │   ├── RendimentDashboard.tsx# /courses/:courseId/stats (gràfics de barres)
    │   │   ├── CourseCard.tsx        # 
    │   │   ├── CourseExpandedContent.tsx # 
    │   │   ├── CourseIcon.tsx        # 
    │   │   ├── ProgressOverview.tsx  # 
    │   │   ├── RankingCard.tsx       # 
    │   │   ├── ScrollIndicator.tsx   # 
    │   │   ├── StudentCard.tsx       # 
    │   │   └── StudentProfileCard.tsx# 
    │   └── teacher/
    │       ├── Sidebar.tsx           # Menú lateral col·lapsable (+ popover)
    │       ├── ChatWidget.tsx        # Xat mock (contacts = [] → sempre buit)
    │       ├── CodePreview.tsx       # Executa código amb new Function + ReactLivePreview
    │       ├── CourseForm.tsx        # Form de curs (etiquetas en castellà hardcoded)
    │       ├── ExerciseEditor.tsx    # Editor d'exercicis (Monaco + intèrpret Python)
    │       ├── StatsCards.tsx        # Grid de targetes d'estadística
    │       ├── StudentFilters.tsx    # Filtres (només UI, el pare no els aplica)
    │       ├── StudentTable.tsx      # Taula d'alumnes
    │       └── TeacherLeaderboard.tsx# Classificació del professor
    │
    ├── hooks/
    │   ├── useCourse.ts              # React Query: useCourse + prefetchCourse
    │   ├── useI18n.ts                # Re-export d'I18nContext
    │   └── useTheme.ts               # Re-export de ThemeContext
    │
    ├── layouts/
    │   ├── MainLayout.tsx            # Header + Outlet + prefetch de cursos
    │   └── TeacherLayout.tsx         # Sidebar + header + ChatWidget + Outlet
    │
    ├── pages/
    │   ├── Home.tsx
    │   ├── ProfilePage.tsx           # /profile i /teacher/profile
    │   ├── courses/
    │   │   ├── CourseLessons.tsx     # Tabs Teoria/Programació/Tests/Fitxers + rail flotant
    │   │   ├── LessonPage.tsx        # Monaco + Solució Profe + preview React + panell IA
    │   │   ├── ExamPage.tsx          # /courses/:courseId/exam/:challengeSlug
    │   │   ├── AiHelpPanel.tsx       # Revisió IA via fetch directe
    │   │   └── ${courseId}/${lesson.id}/LessonTopic.tsx  # ⚠️ Path literal amb ${...}
    │   ├── dashboards/
    │   │   └── StudentDashboard.tsx  # Login, resum, 5 cards, classificació
    │   └── teacher/
    │       ├── TeacherIndex.tsx      # Shim → <TeacherDashboard/>
    │       ├── Dashboard.tsx         # ⚠️ Export NOMENAT TeacherDashboard
    │       ├── Students.tsx          # ⚠️ Llista buida hardcoded
    │       ├── Courses.tsx           # Cursos locals + API
    │       ├── Exercises.tsx         # ⚠️ Sempre usa cursos[0]
    │       ├── ExerciseList.tsx      # ⚠️ Sempre usa cursos[0]
    │       ├── Test.tsx              # ⚠️ Sempre usa cursos[0]; dangerouslySetInnerHTML
    │       ├── Hackathon.tsx         # ⚠️ Placeholder estàtic
    │       └── InviteStudents.tsx    # POST /users/invite/
    │
    ├── services/
    │   ├── api.ts                    # HÍBRID: localStorage (progrés) + POST /users/invite/ · timeout 3000
    │   ├── authService.ts            # login/logout/register/getToken (sense timeout)
    │   ├── courseService.ts          # Cursos + submissions + overview · timeout 10000
    │   ├── localCourseService.ts     # Cursos locals (mooc_local_courses), sense HTTP
    │   ├── profileService.ts         # Perfil, avatars, orgs (sense timeout)
    │   ├── register.ts               # GET+POST /users/register/ (FormData)
    │   └── teacherService.ts         # ⚠️ BUID (0 bytes), importat enlloc
    │
    ├── theme/
    │   └── theme.ts                  # getTheme(mode) → primary #8400ff, secondary #ec4899
    │
    ├── types/
    │   └── index.ts                  # 18 interfícies/tipus globals (molts duplicats, §10)
    │
    └── utils/
        ├── formatters.ts             # getLocalizedText, formatearFecha/Nota, calcularColorProgreso...
        ├── utils.ts                  # sx() — ⚠️ ORFE
        ├── validators.ts             # 5 validadors — ⚠️ ORFE (ningú els importa)
        ├── monaco.ts                 # Loader, temes, opcions TS, autocompletat Python
        └── monacoCore.ts             # Entry propi de Monaco (editor.api + contribucions + Python/TS)
```

**Fitxer mort (0 bytes):** `src/services/teacherService.ts`. *(`src/hooks/useTeacherData.ts` també era buit, però s'ha esborrat.)*
**Fitxers orfes (no importats):** `src/App.css`, `src/i18n/index.ts`, `src/utils/utils.ts`, `src/utils/validators.ts`, i les 6 peces de `features/student/` marcades ⚠️.

---

## 4. Provider Stack (`src/main.tsx`)

```
StrictMode
  └── QueryClientProvider            (staleTime 5min, gcTime 30min, retry 1, refetchOnWindowFocus false)
      └── BrowserRouter
          └── StyledEngineProvider (injectFirst)
              └── ThemeProvider   (ThemeContext)
                  └── I18nProvider (I18nContext)
                      └── AuthProvider (AuthContext)
                          └── NotificationProvider (NotificationContext)
                              └── App (Routes)
```

- `main.tsx` importa `./index.css`. **No** importa i18n directament: ho fa `I18nContext` via `import i18n from '../i18n'` → resol a **`src/i18n.ts`** (el fitxer guanya sobre el directori amb `moduleResolution: bundler`).
- `AuthProvider` està muntat però el seu hook `useAuth()` **no es consumeix enlloc**. `NotificationProvider` renderitza `NotificationHub` globalment.

---

## 5. Rutes (`src/App.tsx`) — 17 rutes

| # | Path | Component | Layout |
|---|------|-----------|--------|
| 1 | `/` | `Home` | (cap) |
| 2 | `/courses/:courseId` | `CourseLessons` | `MainLayout` |
| 3 | `/courses/:courseId/:lessonId` | `LessonPage` | `MainLayout` |
| 4 | `/courses/:courseId/:lessonId/topic` | `LessonTopic` | `MainLayout` |
| 5 | `/courses/:courseId/exam/:challengeSlug` | `ExamPage` | `MainLayout` |
| 6 | `/courses/:courseId/stats` | `RendimentDashboard` | `MainLayout` |
| 7 | `/dashboards/student` | `StudentDashboard` | `MainLayout` |
| 8 | `/profile` | `ProfilePage` | `MainLayout` |
| 9 | `/teacher` | `TeacherIndex` (→ `TeacherDashboard`) | `TeacherLayout` |
| 10 | `/teacher/students` | `Students` | `TeacherLayout` |
| 11 | `/teacher/courses` | `Courses` | `TeacherLayout` |
| 12 | `/teacher/exercises` | `Exercises` | `TeacherLayout` |
| 13 | `/teacher/exercises/list` | `ExerciseList` | `TeacherLayout` |
| 14 | `/teacher/test` | `Test` | `TeacherLayout` |
| 15 | `/teacher/hackathon` | `Hackathon` | `TeacherLayout` |
| 16 | `/teacher/invite` | `InviteStudents` | `TeacherLayout` |
| 17 | `/teacher/profile` | `ProfilePage` | `TeacherLayout` |

⚠️ **No hi ha cap guarda de ruta** a `/teacher`: qualsevol pot navegar-hi. L'únic senyal de rol és `localStorage.mooc_role`, que escriu el commutador de rol del `Header`.

⚠️ La ruta 4 s'importa des d'un directori amb nom literal ``${courseId}/${lesson.id}`` (`App.tsx:6`), fruit d'una interpolació enganxada per error. Funciona perquè el nom del fitxer hi coincideix.

### Layouts
- **`MainLayout`**: `Header` + `Outlet` dins `height: 100dvh; overflow: hidden`. En muntar fa prefetch de `getAllCourses()` i `getFullCourseDetail()` de cada curs. **No** renderitza `Footer`.
- **`TeacherLayout`**: `Sidebar` col·lapsable (64/256px) + header de 64px amb logo i `ThemeToggleButton` + `<ChatWidget />` global. Sense dades pròpies.

---

## 6. Pàgines principals

### `CourseLessons` (`/courses/:courseId`)
Tabs `Teoria | Programació | Tests | Fitxers` (font única `TAB_ITEMS`) amb barra pròpia dins cada box, rail flotant vertical quan la barra surt de pantalla, selector d'àmbit (públic/privat/assignats) i targetes. Usa `useCourse` (React Query). No fa servir Monaco.

### `LessonPage` (`/courses/:courseId/:lessonId`)
La pàgina central. Editor **Monaco** amb:
- **Multi-model** per llenguatge: fitxers `python.py` i `React.tsx` (`file:///lesson/<curs>/<lliço>/...`), tabs de fitxer.
- **Solució Profe**: pestanya bloquejada fins que l'alumne supera l'exercici; llavors es mostra un **`DiffEditor`** entre `teacherSolution` i el codi de l'alumne (colze a colze a desktop, unificat a mòbil).
- **Preview React en viu** (`ReactLivePreview`): transpila el TSX amb el worker de TypeScript de Monaco (`getEmitOutput`) i el renderitza amb `createRoot`.
- Tabs `Enunciat | Professor | Alumnes | IA`; `AiHelpPanel` per revisió IA.
- `ConsolePanel`, badge de diagnòstics (`onValidate`), confetti, autoguardat i `mooc_last_session`.

Endpoints: `submitChallenge`, `getPeerSubmissions`, `getChallenge`, i `api.postProgress`.

### `ExamPage` (`/courses/:courseId/exam/:challengeSlug`)
Tests de resposta única o múltiple (`RadioGroup`/`FormGroup`). Carrega via `useCourse` o `getChallenge`, llegeix submissions prèvies i envia amb `submitChallenge({ answers })`. El panell de resultat deriva de `result.correct` i de la llista `choices`.

### `RendimentDashboard` (`/courses/:courseId/stats`)
Dos gràfics de barres (codi / test) per tema, amb línia discontínua "Mitjana". **Totes les dades vénen de `localStorage`** via `getFullCourseDetail` (només el catàleg). ⚠️ La "mitjana" és **fabricada** amb `Math.random()` (`RendimentDashboard.tsx:217,228`), no ve de cap endpoint de notes.

### `StudentDashboard` (`/dashboards/student`)
Login (component `Login`), resum del curs en 5 targetes (progrés general, problemes de codi per tema, tests per tema, classificació top-3, més estadístiques) i "Continua estudiant". La classificació es carrega de `getStudentsOverview` i es mapeja amb `toRanking`.

### `ProfilePage` (`/profile`, `/teacher/profile`)
4 targetes: preferències d'idioma, organitzacions, detalls del compte (amb canvi de contrasenya) i avatar. Usa `profileService`. El camp `username` és de només lectura (el `PATCH` no l'accepta). ⚠️ L'organització seleccionada és visual: no s'envia enlloc.

### Teacher
- **Dashboard**: selector de curs (desbloqueja la resta), accions ràpides i `TeacherLeaderboard`.
- **Exercises / ExerciseList / Test**: ⚠️ totes tres fixen `cursos[0].slug!` i ignoren el curs seleccionat a `teacher_selected_course`.
- **Exercises → ExerciseEditor**: editor Monaco + `CodePreview` (React, executa amb `new Function`) o placeholder (Python). Intèrpret de Python propi per a `for/while/if/print` i builtins bàsics. Desa a `teacher_exercise_${id}`.
- **Courses**: cursos locals (`localCourseService`) + API; permet clonar i esborrar. ⚠️ "Crear curs" descarta el formulari (`onSubmit = () => setOpen(false)`).
- **Test**: renderitza HTML de l'API amb `dangerouslySetInnerHTML` i permet revelar la resposta correcta.
- **Students**: ⚠️ array buit hardcoded, zero crides de servei.
- **Hackathon**: ⚠️ placeholder estàtic.

---

## 7. Hooks

| Hook | Descripció |
|------|------------|
| `useCourse(courseId)` | React Query. `queryKey: ['course', id]`, `staleTime: 30min`, `gcTime: 60min`, `retry: 1`, `enabled` si `courseId` és vàlid. Resol ids `clone-*` a l'slug original via `localCourseService`. |
| `prefetchCourse(queryClient, courseId)` | `prefetchQuery` del detall de curs (hover a `CourseCard`). |
| `useTheme()` | Re-export de `{ ThemeProvider, useThemeMode }`. |
| `useI18n()` | Re-export de `{ I18nProvider, useI18n }`. |

(`useTeacherData` va existir com a fitxer buit a `src/hooks/`; s'ha esborrat.)

---

## 8. Serveis

### `api.ts` — **híbrid** (localStorage + 1 crida HTTP)
Client axios `baseURL: ${VITE_API_URL}/api/v1`, `Authorization: Token <token>`, **`timeout: 3000`**.

| Mètode | Transport | Detall |
|--------|-----------|--------|
| `getStudentProgress(studentId)` | localStorage | Llegeix ``mooc_global_progress_${studentId}`` |
| `postProgress({studentId, courseId, lessonId, status})` | localStorage | Escriu `${courseId}_${lessonId}` i dispara `lessonProgressUpdated` (window + document) |
| `resetCourse(studentId, courseId)` | localStorage | Esborra progrés, `code_*` i `mooc_submissions_*` del curs |
| `inviteUser(email)` | **POST** `/users/invite/` | Body `{ email }` |

### `authService.ts` — login real de l'alumne
Sense `axios.create` → **sense timeout**, sense interceptor (per tant el `logout` no envia token).
- `login(username, password)` → **POST** `/users/auth/login/` (JSON `{ username, password }`); desa `token`.
- `logout()` → POST `/users/auth/logout/` (sense body); neteja `token` i `currentStudent`.
- `register(payload)` → delega a `register.ts`.
- `getToken()`.

### `courseService.ts` — contingut de cursos
Client `timeout: 10000`, JSON, `Token`, amb caches en memòria (`fullCourseCache`, `allCoursesCache`, `publicCoursesCache`).

| Mètode | Endpoint |
|--------|----------|
| `getAllCourses()` | GET `/courses/` (sensible al rol) |
| `getPublicCourses()` | GET `/public/courses/` |
| `getCourseBySlug(slug)` | GET `/courses/{slug}/` |
| `getCourseTopics(slug)` | GET `/courses/{slug}/topics/` |
| `getTopicBySlug(c, t)` | GET `/courses/{c}/topics/{t}/` |
| `getTopicProblems(c, t)` | GET `/courses/{c}/topics/{t}/problems/` |
| `submitChallenge(c, t, p, body)` | POST `/courses/{c}/topics/{t}/problems/{p}/submissions/` |
| `getChallenge(c, t, p)` | GET `.../problems/{p}/` |
| `getChallengeSubmissions(c, t, p)` | GET `.../submissions/` |
| `getPeerSubmissions(c, t, p)` | GET `.../submissions/peers/` (torna `[]` si falla) |
| `getStudentsOverview(c)` | GET `/courses/{c}/students/overview/` |
| `getFullCourseDetail(slug)` | Composa curs + temes + problemes (2 + T crides) |
| `clearCache(slug?)` | ⚠️ no neteja `publicCoursesCache` |

### `localCourseService.ts` — cursos locals (sense HTTP)
Clau `mooc_local_courses`: `getAll`, `getById`, `save`, `remove`, `cloneFrom`.

### `profileService.ts` — perfil (sense timeout)
`fetchProfile()` GET `/users/me/settings/` · `updateProfile()` **PATCH** (mateixa URL) · `fetchOrganizations()` GET `/orgs/` · `fetchMyAvatar()` GET `/users/me/avatar/` · `updateMyAvatar(file)` **PATCH** (FormData `avatar`) · `extractProfileErrors()`.

### `register.ts` — alta d'usuari
`loadRegistrationData()` GET `/users/register/` (sense auth) · `registerUser(payload)` **POST** `/users/register/` amb **FormData** (`first_name`, `last_name`, `email`, `username`, `password1`, `password2`; opcionals `organization`, `default_avatar`, `avatar`). Desa `token` si el retorn en porta.

### `teacherService.ts` — ⚠️ buit (0 bytes)

---

## 9. Autenticació i rols — dos fluxos en paral·lel

1. **`AuthContext`** (`AuthProvider` + `useAuth()`): llegeix `currentStudent` i `token` de localStorage; exposa `login`/`logout`. ⚠️ `useAuth()` **no es consumeix enlloc** i `AuthContext.login` no omple `user`, de manera que `isAuthenticated` no s'activa mai per aquesta via.
2. **Flux real**: `StudentDashboard.handleLogin` crida `authService.login()` directament i desa `currentStudent` a localStorage. El `Header` llegeix `token`/`currentStudent` de localStorage directament.

La navegació a `/teacher` es fa des del commutador de rol del `Header` (`mooc_role`). **No hi ha validació real del token** en engegar.

---

## 10. Tipus (⚠️ duplicats)

`src/types/index.ts` (18 exports) i `src/features/student/types.ts` (4) defineixen els mateixos conceptes amb formes diferents:

| Concepte | `types/index.ts` | `features/student/types.ts` | Local a hooks/components |
|---|---|---|---|
| `Course` | `title: string` + camps obligatoris | `title: any`, `isPublic/active/professors` | `useCourse.ts` i `components/CourseCard.tsx` en tenen versions pròpies |
| `Lesson` | `title: string` | `title: any` | `useCourse.ts` |
| `Student` | `id: string \| number` | `id: string` | — |

Els tipus **professor** són en castellà (`Curso`, `Estudiante`, `Ejercicio`, `Equipo`, `Hackathon`, `MensajeChat`, `ContactoChat`). Hi ha **dos `Organization`** diferents (`register.ts` i `profileService.ts`).

`courseService.toCourses()` retorna `types.Course` però hi assigna `isPublic/active/professors`, que **no existeixen** en aquesta interfície (sí a la de `features/student`).

---

## 11. Utilitats

### `formatters.ts` (10 exports)
`getLocalizedText`, `getBaseLanguage`, `formatProgressPercent`, `calculatePoints`, `padNumber`, `formatTimestamp`, `makeProgressKey`, `formatearFecha`, `formatearNota`, `calcularColorProgreso`.
⚠️ Només `getLocalizedText`, `formatearFecha`, `formatearNota` i `calcularColorProgreso` s'usen. Els altres 6 són morts.

### `validators.ts` i `utils.ts`
⚠️ **Orfes**: ningú no els importa. `sx()` i els 5 validadors no s'executen enlloc.

### `monaco.ts` i `monacoCore.ts`
Carregador local (sense CDN), temes `mooc-light/dark/fancy`, opcions d'editor (`fontSize: 18`, `lineHeight: 24`), setup de TypeScript/JSX i provider d'autocompletat de Python. Vegeu `docs/monaco.md`.

---

## 12. Tema (`src/theme/theme.ts`)

`getTheme(mode)` retorna un `Theme` MUI. No exporta cap objecte de paleta.

| | light | dark | fancy |
|---|---|---|---|
| `palette.mode` | light | dark | **dark** |
| `primary.main` | `#8400ff` | `#9f5fff` | `#8400ff` |
| `secondary.main` | `#ec4899` | `#ec4899` | `#ec4899` |
| `background.default` | `white` | `#111827` | `#141414` |
| `background.paper` | `white` | `#1f2937` | `#141414` |

`shape.borderRadius: 12` (MuiCard l'apuja a 16), font `Inter, Roboto, Helvetica, Arial, sans-serif` (no es carrega cap webfont). Mode fancy = dark + `ParticlesBackground` + `body` transparent.

⚠️ El color de marca `#8400ff` està **hardcoded a ~25 fitxers** i no sempre coincideix amb `primary.main` del mode actiu (en dark és `#9f5fff`). Fora del tema també apareix `#00685d` (StudentDashboard) i `#0a0e17` (RendimentDashboard).

---

## 13. Internacionalització

- **3 idiomes**: `ca` (fallback), `es`, `en`.
- **11 seccions** a cada fitxer: `auth`, `dashboard`, `home`, `hero`, `footer`, `course`, `common`, `profile`, `notifications`, `teacher`, `lesson`.
- Config activa: **`src/i18n.ts`** (importada per `I18nContext` i `courseService`). `src/i18n/index.ts` és un duplicat mort.
- `LanguageDetector` desa a la clau `i18nextLng`, mentre que `I18nContext` usa `mooc-language` → **dues claus per a l'idioma**. A més, `LanguageSwitcher` crida `i18n.changeLanguage` directament i no passa per `I18nContext`, així que no actualitza `mooc-language`.

### Defectes de traducció coneguts
- `Footer.tsx:46` crida `t('Accedir')` (clau literal sense prefix); no existeix → es mostra "Accedir".
- `ca.ts` diu "Contrassenya (10 digits)" però `isValidPin` exigeix 4.
- Diversos textos de professor estan hardcoded en castellà (`CourseForm`, `ChatWidget`, alertes d'`InviteStudents`).
- `StudentDashboard` usa `<...>` amb valor per defecte en català (`t('dashboard.code_correct', 'Problemes de programació')`) per a claus que no existeixen als fitxers d'idioma.

---

## 14. Configuració del Build

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run preview
```

### Vite (`vite.config.ts`)
| Opció | Valor |
|-------|-------|
| Alias | `@` → `./src` |
| Proxy | `/api` → `https://algorien.com` (changeOrigin) |
| Port | `5173`, `watch.usePolling: true` |
| Build | `sourcemap: true`, `reportCompressedSize: true`, `cssCodeSplit: true` |
| optimizeDeps.include | `@mui/material`, `@mui/material/styles`, `@emotion/react`, `@emotion/styled`, `framer-motion` |

### TypeScript (`tsconfig.json`)
`target ES2020`, `module ESNext`, `moduleResolution: bundler`, `strict`, **`noUnusedLocals`**, **`noUnusedParameters`**, `noFallthroughCasesInSwitch`, `jsx: react-jsx`, `noEmit`, `paths { "@/*": ["./src/*"] }`, `types: ["node"]`, `include: ["src"]`.

### Desplegament (`netlify.toml`)
`command: npm run build` → `publish: dist`, `NODE_OPTIONS=--max_old_space_size=4096`; redirect `/api/*` → `https://algorien.com/api/:splat` (200) i fallback SPA `/*` → `/index.html`.

### Variables d'entorn
⚠️ **No hi ha cap fitxer `.env`** al repositori. Per tant `import.meta.env.VITE_API_URL` és sempre `undefined` → `|| ''` → totes les URLs de servei són **relatives** (`/api/v1/...`), que en dev passen pel proxy de Vite i en producció pel redirect de Netlify.

---

## 15. Flux de Dades

### Fonts
1. **API REST** `https://algorien.com/api/v1` (via proxy/redirect).
2. **localStorage** (claus principals, agrupades):
   - Sessió: `token`, `currentStudent`, `mooc_role`.
   - Progrés: `mooc_global_progress_${id}` (mapa `${courseId}_${lessonId}`), `mooc_shared_all_progress`.
   - Codi i submissions: `code_${userId}_${courseId}_${lessonId}` (+ `_view`), `mooc_submissions_${courseId}_${lessonId}`.
   - Sessió/UX: `mooc_last_session`, `mooc_dashboard_last_course`, `mooc_tab_${slug}`, `mooc_expanded_${slug}`, `mooc_done_order_${slug}`, `mooc_streak_${id}`.
   - Config: `mooc-theme-mode`, `mooc-language` (+ `i18nextLng`).
   - Professor: `mooc_local_courses`, `mooc_local_students`, `mooc_deleted_ids`, `teacher_selected_course(_name)`, `teacher_selected_topic`, `teacher_selected_exercise`, `teacher_submenu`, `teacher_exercise_${id}`.
3. **`src/data/courses.ts`** — mapa d'imatges (només 2 entrades).

### Esdeveniments com a bus d'estat
`lessonProgressUpdated` (progrés), `auth-state-change` (sessió/perfil), `studentsUpdated` (Hero), `teacher-course-changed` (Sidebar), i els natius `storage` i `visibilitychange`. ⚠️ `Header` encara dispara un `authChange` llegat que ningú escolta.

---

## 16. Estat Actual del Projecte

### ✅ Implementat
- Landing (Hero typewriter + stats + grid de cursos + features + Footer).
- Navegador de curs de 4 pestanyes amb rail flotant i reordenació de lliçons completades.
- **Editor Monaco** amb multi-fitxer (Python/React), temes propis, validació, **DiffEditor "Solució Profe"** i **preview React en viu**.
- Tests (`ExamPage`) de resposta única/múltiple amb feedback i nota.
- Rànquing d'alumne (`students/overview`) i dashboard amb 5 targetes.
- Panell de rendiment per tema (`/stats`).
- Perfil complet (avatar, contrasenya, idioma, organizacions visuals).
- **Secció professor sencera**: layout, sidebar, tauler, editor d'exercicis, llistats, tests, classificació, cursos locals, invitacions.
- Multiidioma (CA/ES/EN), 3 modes de tema, toastos, partícules.
- `netlify.toml` i proxy Vite.
- Capa React Query per al detall de curs + prefetch.

### ⚠️ Deute tècnic / pendents
- Fitxer buit: `services/teacherService.ts`. (`hooks/useTeacherData.ts` era buit però ja s'ha esborrat.)
- Fitxers orfes: `App.css`, `i18n/index.ts`, `utils/utils.ts`, `utils/validators.ts` i 6 peces de `features/student/`.
- `useAuth()` no s'usa; `AuthContext.login` no s'actualitza.
- `babel-plugin-react-compiler` i tot Tailwind declarats però inactius.
- Duplicació de tipus (`Course`/`Lesson`/`Student`/`Organization`) i de config i18n.
- `Exercises`/`ExerciseList`/`Test` ignoren el curs seleccionat (fixen `cursos[0]`).
- `Students` buit hardcoded; `Hackathon` estàtic; "Crear curs" és un no-op.
- `RendimentDashboard` fabrica la "mitjana" amb `Math.random()`.
- `Test.tsx` i `CodePreview`/`ExerciseEditor` executen/serveixen codi/HTML sense sanejament.
- Sense guarda de ruta a `/teacher`; sense validació de token a l'engegada.
- `Footer` només a Home; `LanguageSwitcher` no persisteix a `mooc-language`.
- Clau i18n `dashboard.code_correct`/`tests_correct` inexistents als fitxers (es veuen en català).

---

## 17. APIs Utilitzades

Vegeu `docs/apis.md` per a la referència completa. Resum:

- **Auth/usuari** (`authService`, `register`, `profileService`): login, logout, register, settings (GET/PATCH), avatar (GET/PATCH), orgs, invite.
- **Cursos** (`courseService`): cursos, temes, problemes, submissions (enviar/consultar/notes/peers), overview d'alumnes.
- **Tercers**: React Query, react-router v7, i18next, framer-motion, react-spring, axios, canvas-confetti, MUI v9, Monaco, react-markdown, lucide-react, Canvas API, `window.dispatchEvent`.

---

## 18. Scripts i Overrides

| Script | Comanda |
|--------|---------|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |

```json
"overrides": { "react-is": "19.0.0" }
```

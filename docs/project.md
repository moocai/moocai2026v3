# MOOC React 2026
**Última actualització: 19 de juny de 2026**

## 1. Descripció del Projecte

**MOOC React 2026** (`mooc-2026-vite`) és una plataforma d'aprenentatge online (MOOC) moderna i multiidioma construïda amb React 19. Permet als estudiants navegar per cursos, veure contingut teòric, resoldre reptes de programació en un editor de codi interactiu, seguir el seu progrés (persistit a localStorage) i consultar un rànquing. Es connecta a una API backend (`algorien.com`) per al contingut dels cursos, però utilitza `localStorage` per a la persistència del progrés. La secció de professorat està esbossada però no implementada.

---

## 2. Tecnologies i Dependències

| Categoria | Llibreria | Versió | Ús |
|-----------|-----------|--------|-----|
| **Framework** | React | ^19.2.7 | Components i hooks |
| **Build** | Vite | ^6.0.0 | Dev server i bundling |
| **UI** | @mui/material | ^9.0.0 | Components Material Design + CssBaseline |
| **Estils** | @emotion/react, @emotion/styled | ^11.14.0 / ^11.14.1 | CSS-in-JS |
| **Icons** | @mui/icons-material + lucide-react | ^9.0.0 / ^0.577.0 | Icones |
| **Routing** | react-router-dom | ^6.30.3 | Navegació SPA (v7 future flags) |
| **Cache/Query** | @tanstack/react-query | ^5.101.0 | Cache de dades de curs i prefetching |
| **Animacions** | framer-motion + @react-spring/web | ^12.38.0 / ^10.1.0 | Animacions declaratives |
| **Internacionalització** | i18next + react-i18next + i18next-browser-languagedetector | ^26.0.6 / ^17.0.4 / ^8.2.1 | Multiidioma (CA, ES, EN) |
| **HTTP** | axios | ^1.15.0 | Peticions a API REST |
| **Confetti** | canvas-confetti | ^1.9.2 | Animació en completar lliçons |
| **React Compiler** | babel-plugin-react-compiler | ^1.0.0 | Optimització React 19 |
| **Markdown** | react-markdown + remark-gfm | ^10.1.0 / ^4.0.1 | Renderitzat Markdown |
| **Util** | clsx, class-variance-authority, tailwind-merge, tailwindcss-animate, tw-animate-css | ^2.1.1 / ^0.7.1 / ^3.5.0 / ^1.0.7 / ^1.4.0 | Classes condicionals |
| **Tipus** | TypeScript | ^5.5.0 | Tipat estàtic |
| **Dev** | @vitejs/plugin-react, postcss, autoprefixer, tailwindcss, @types/node, @types/canvas-confetti | ^5.2.0 / ^8.4.0 / ^10.4.0 / ^3.4.0 / ^25.6.0 / ^1.6.0 | Configuració build |

---

## 3. Estructura Completa del Projecte

```
mooc-2026-vite/
├── index.html                        # HTML entry point
├── package.json                      # Dependències i scripts (dev, build, preview)
├── vite.config.ts                    # Vite config: @ alias, proxy /api → algorien.com, polling
├── tsconfig.json                     # TypeScript strict, @/* path alias, JSX react-jsx
├── vite-env.d.ts                     # Vite client types
│
├── dist/                             # Producció build output
│
├── docs/
│   ├── project.md                    # Documentació del projecte
│   ├── react19.md                    # Audit migració React 19
│   ├── ReactQuery.md                 # Anàlisi React Query
│   ├── spring3.md                    # Proposta Sprint 3
│   └── apis.md                       # API Reference
│
├── public/
│   ├── img/                          # Logo, favicon, SVGs dels cursos
│   ├── _redirects                    # SPA redirect per Netlify
│   └── robots.txt                    # SEO
│
└── src/
    ├── main.tsx                      # Punt d'entrada (providers stack)
    ├── App.tsx                       # Router (Routes + MainLayout wrapper)
    ├── App.css                       # (No importat - legacy)
    ├── index.css                     # Scrollbar styling
    ├── i18n.ts                       # Configuració i18next (importat per I18nContext)
    ├── env.d.ts                     # Declaracions tipus fitxers estàtics
    │
    ├── components/                   # Components reutilitzables
    │   ├── Header.tsx                # Nav sticky amb menú mòbil overlay
    │   ├── Hero.tsx                  # Hero landing: typewriter + stats + particles
    │   ├── Footer.tsx                # Multi-columna
    │   ├── CourseCard.tsx            # Targeta curs amb hover prefetch
    │   ├── ParticlesBackground.tsx   # Fons interactiu Canvas (partícules + connexió)
    │   ├── ThemeToggleButton.tsx     # Toggle light/dark/fancy
    │   ├── LanguageSwitcher.tsx      # CA/ES/EN
    │   └── ui/
    │       ├── Card.tsx              # Wrapper MUI Card (blur, hover effects)
    │       ├── badge.tsx             # Badge standard/outline (MUI Chip)
    │       ├── NotificationHub.tsx   # Toast UI: useTransition, useSpring, Alert MUI
    │       ├── ProgressBar.tsx       # (BUIT)
    │       └── SearchInput.tsx       # (BUIT)
    │
    ├── contexts/
    │   ├── AuthContext.tsx           # Autenticació (login/logout/token/user)
    │   ├── ThemeContext.tsx          # 3 modes: light/dark/fancy (+ ParticlesBackground)
    │   ├── I18nContext.tsx           # Idioma (CA/ES/EN, localStorage)
    │   └── NotificationContext.tsx   # Toast notifications (2s auto-dismiss)
    │
    ├── data/
    │   ├── courses.ts                # Image mappings: python-public-test, React, springboot, MachineLearning
    │   └── students.ts              # 3 estudiants predefinits (Marc/1, Jordi/2, Miquel/3)
    │
    ├── features/
    │   ├── student/
    │   │   ├── types.ts              # Student, Lesson, Topic, Course interfaces
    │   │   ├── Login.tsx             # Login + create/delete user (role toggle)
    │   │   ├── StudentCard.tsx       # Targeta login per PIN + delete flow
    │   │   ├── StudentProfileCard.tsx # Avatar, nom, punts, logout
    │   │   ├── CourseCard.tsx        # Card dashboard expansible
    │   │   ├── CourseExpandedContent.tsx # Tabs syllabus/activities + lliçons
    │   │   ├── CourseIcon.tsx        # Icona Lucide dinàmica per curs
    │   │   ├── ProgressOverview.tsx  # LinearProgress per curs
    │   │   ├── RankingCard.tsx       # Rànquing amb Tabs per curs
    │   │   └── ScrollIndicator.tsx   # Indicador scroll mòbil
    │   │
    │   └── teacher/                  # (TOT BUIT)
    │       ├── ChatWidget.tsx, CourseForm.tsx, ExerciseEditor.tsx
    │       ├── StatsCards.tsx, StudentFilters.tsx, StudentTable.tsx
    │
    ├── hooks/
    │   ├── useCourse.ts              # TanStack Query: useCourse + prefetchCourse
    │   ├── useI18n.ts                # Re-exporta I18nProvider + useI18n
    │   ├── useTheme.ts              # Re-exporta ThemeProvider + useThemeMode
    │   └── useTeacherData.ts         # (BUIT)
    │
    ├── i18n/
    │   ├── index.ts                  # Config i18next duplicada (no importada)
    │   ├── ca.ts                     # Català (auth, dashboard, home, hero, footer, course, common, lesson, notifications)
    │   ├── es.ts                     # Castellà
    │   └── en.ts                     # Anglès
    │
    ├── layouts/
    │   ├── MainLayout.tsx            # Flex column: 100dvh, Header + Outlet (flex:1, overflow:hidden)
    │   └── TeacherLayout.tsx         # (BUIT)
    │
    ├── pages/
    │   ├── Home.tsx                  # Landing: Hero, cursos (API), features animades
    │   ├── courses/
    │   │   ├── CourseLessons.tsx     # 3 columnes: syllabus accordion + contingut + "On this page"
    │   │   ├── LessonPage.tsx        # Editor codi interactiu (run tests, console, confetti)
    │   │   └── ${courseId}/
    │   │       └── ${lesson.id}/
    │   │           └── LessonTopic.tsx # Vista teòrica + sidebar + challenge
    │   ├── dashboards/
    │   │   └── StudentDashboard.tsx   # Login, perfil, progrés, cursos, rànquing
    │   └── teacher/                   # (TOT BUIT)
    │       ├── Courses.tsx, Dashboard.tsx, Exercises.tsx, Students.tsx
    │
    ├── services/
    │   ├── api.ts                    # Gestió progrés localStorage (mock API)
    │   ├── authService.ts            # Auth API calls (login/logout/getMe)
    │   ├── courseService.ts          # Course CRUD amb axios (getAllCourses, getFullCourseDetail, submitSubmission)
    │   └── teacherService.ts         # (BUIT)
    │
    ├── theme/
    │   └── theme.ts                  # getTheme(mode): primary #8400ff, secondary #ec4899
    │
    ├── types/
    │   └── index.ts                  # Interfícies globals (Course, Lesson, Student, etc.)
    │
    └── utils/
        ├── formatters.ts             # getLocalizedText, formatProgressPercent, calculatePoints, makeProgressKey
        ├── utils.ts                  # sx() per composar estils MUI
        └── validators.ts             # validatePin, isValidPin, isValidEmail, validateCodeSolution
```

---

## 4. Provider Stack (main.tsx)

```
QueryClientProvider
  └── BrowserRouter (v7_startTransition, v7_relativeSplatPath)
      └── StyledEngineProvider (injectFirst)
          └── ThemeProvider (ThemeContext)
              └── I18nProvider (I18nContext)
                  └── AuthProvider (AuthContext)
                      └── NotificationProvider (NotificationContext)
                          └── App (Routes)
```

- **React Query**: staleTime 5min, gcTime 30min, retry 1, refetchOnWindowFocus false
- **Theme**: 3 modes (light, dark, fancy) — fancy afegeix `ParticlesBackground`
- **I18n**: CA (fallback), ES, EN, amb LanguageDetector automàtic
- **Auth**: Inicialitza des de localStorage, valida token via API al mount

---

## 5. Rutes (App.tsx)

| Path | Componente | Layout | Descripció |
|------|-----------|--------|------------|
| `/` | `Home` | Cap | Landing page (hero, cursos, features) |
| `/courses/:courseId` | `CourseLessons` | MainLayout | 3-columnes: syllabus, contingut, anchors |
| `/courses/:courseId/:lessonId` | `LessonPage` | MainLayout | Editor codi interactiu |
| `/courses/:courseId/:lessonId/topic` | `LessonTopic` | MainLayout | Vista teòrica lliçó |
| `/dashboards/student` | `StudentDashboard` | MainLayout | Panell complet d'estudiant |

---

## 6. Components per Fitxer

### Components Reutilitzables (`src/components/`)

| Fitxer | Exportacions | Funcions clau |
|--------|-------------|---------------|
| `Header.tsx` | `Header` | scrollToDynamic, handleLogout, checkAuth, menú mòbil overlay amb AnimatePresence. Botó "My Progress": bgcolor `action.hover` en dark, `alpha(primary, 0.08)` en light. AppBar bgcolor per mode: fancy → `black`, dark → `#1f2937`, light → `white` (via `useThemeMode`) |
| `Hero.tsx` | (default) | Typewriter animat (4 paraules), stats dinàmiques (recompte estudiants via localStorage + event studentsUpdated), scroll chevrons |
| `Footer.tsx` | `Footer` | FooterLink intern, any dinàmic, 4 columnes (logo, explore, community, connect) |
| `CourseCard.tsx` | `CourseCard` | handleEnroll, getLocalizedText, disabled overlay "PROPERAMENT", motion animations, hover prefetch |
| `ParticlesBackground.tsx` | (default) | Classe Particle (draw/update), connect, detecció dark/light mode. Accepta prop `opacityMultiplier` (default 1) que escala l'opacitat de partícules i línies. `{ alpha: true }` al context 2D |
| `ThemeToggleButton.tsx` | `ThemeToggleButton` | Alterna modes light → dark → fancy (Sun/Moon/Sparkles icons) |
| `LanguageSwitcher.tsx` | `LanguageSwitcher` | Canvia idioma via i18n.changeLanguage |

### Components UI (`src/components/ui/`)

| Fitxer | Exportacions | Descripció |
|--------|-------------|------------|
| `Card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | MUI wrappers amb blur, border, hover |
| `badge.tsx` | `Badge` (standard/outline) | Basat en MUI Chip |
| `NotificationHub.tsx` | `NotificationHub` | Toast UI: useTransition/useSpring, MUI Alert, tancament manual i auto (2s) |
| `ProgressBar.tsx` | — | (BUIT) |
| `SearchInput.tsx` | — | (BUIT) |

### Contexts (`src/contexts/`)

| Fitxer | Provider | Hook | Funcions | Estat |
|--------|----------|------|----------|-------|
| `AuthContext.tsx` | `AuthProvider` | `useAuth()` | `login(credentials)`, `logout()` | `user`, `token`, `isAuthenticated`, `loading` |
| `ThemeContext.tsx` | `ThemeProvider` | `useThemeMode()` | `toggleTheme()`, `setMode(mode)` | `mode` (light / dark / fancy) |
| `I18nContext.tsx` | `I18nProvider` | `useI18n()` | `setLanguage(lang)` | `language` (ca / es / en) |
| `NotificationContext.tsx` | `NotificationProvider` | `useNotifications()` | `addNotification(msg, severity)` | `toasts` (array intern) |

**Notes:**
- Tots els contextos usen `use(Context)` de React 19 (en lloc de `useContext`)
- ThemeContext renderitza `ParticlesBackground` en mode fancy. En mode fancy, també sobreescriu `document.body.style.backgroundColor = 'transparent'` per evitar que CssBaseline el tapin
- I18nContext importa `i18n` des de `src/i18n.ts`
- Tots persisteixen a localStorage: `mooc-theme-mode`, `mooc-language`, `token`, `currentStudent`

### Features Student (`src/features/student/`)

| Fitxer | Exportacions | Descripció |
|--------|-------------|------------|
| `types.ts` | `Student`, `Lesson`, `Topic`, `Course` | Interfícies del mòdul student |
| `Login.tsx` | `Login` | Role toggle (student/teacher), create-user, grid StudentCards (rep students com a prop) |
| `StudentCard.tsx` | `StudentCard` | Login per PIN, delete confirmation amb animació error shake |
| `StudentProfileCard.tsx` | `StudentProfileCard` | Avatar + nom + punts + logout, LinearProgress loading bar. bgcolor: dark → `#1f2937`, light → `white` |
| `CourseCard.tsx` | `CourseCard` | Card dashboard expansible amb disabled overlay. bgcolor: dark → `#1f2937`, light → `white` |
| `CourseExpandedContent.tsx` | `CourseExpandedContent` | Tabs syllabus/activities, llista lliçons amb icones (BookOpen, CheckCircle, PlayCircle) |
| `CourseIcon.tsx` | `CourseIcon` | Icona Lucide (Terminal, Globe, Cpu, Layers, Database, Code2) per nom de curs |
| `ProgressOverview.tsx` | `ProgressOverview` | Barres LinearProgress per curs amb percentatge. bgcolor: dark → `#1f2937`, light → `white` |
| `RankingCard.tsx` | `RankingCard` | Tabs per curs, llistat ordenat per progrés, usuari actiu destacat, Trophy icons. bgcolor: dark → `#1f2937`, light → `white` |
| `ScrollIndicator.tsx` | `ScrollIndicator` | 3 chevrons animats (només mòbil) — **no importat actualment** |

### Features Teacher (`src/features/teacher/`)

TOTS ELS FITXERS estan BUITS: `ChatWidget.tsx`, `CourseForm.tsx`, `ExerciseEditor.tsx`, `StatsCards.tsx`, `StudentFilters.tsx`, `StudentTable.tsx`

---

## 7. Pàgines

### Home (`src/pages/Home.tsx`)
- Carrega cursos via `courseService.getAllCourses()` amb loading/error
- 6 feature cards animades (containerVariants + cardVariants amb stagger i direccional)
- Visibility change listener

### CourseLessons (`src/pages/courses/CourseLessons.tsx`)
- Layout 3 columnes: syllabus accordion (motion slide-in seqüencial) + contingut (breadcrumb, course info, subTopics amb code examples react-markdown) + "On this page" anchor links
- Drawer mòbil per syllabus
- Escolta event `lessonProgressUpdated` per refrescar progrés
- `?lessonId=` query param per obrir lliçó directament
- Scrollbar estilitzada al sidebar

### LessonPage (`src/pages/courses/LessonPage.tsx`)
- **Editor de codi interactiu** amb:
  - `textarea` amb estil monospace (Fira Code)
  - Auto-save cada 10s si l'usuari està escrivint
  - Botó "Run" que envia codi a la API via `courseService.submitChallenge()` (com a fitxer CSV `multipart/form-data`)
  - Finestra de consola popup reutilitzable (`consoleWindowRef`) per Python
  - Resultat modal en passar (mostra "ALTRES ESTUDIANTS")
  - Fail: inline console panel a sota de l'editor
  - Confetti (`canvas-confetti`) en completar
  - +10 punts per lliçó completada (persistit a localStorage `points_{userId}`)
- **Layout**: Desktop = 3 columnes (enunciat 20%, editor 40-80%, consola 40%); Mobile = stack vertical
- **Python**: consola popup externa + inline fail panel (no consola columna 3)
- **No Python**: consola com a columna 3
- `mooc_last_session` guarda última sessió activa
- Notificacions toast via `NotificationContext`

### LessonTopic (`src/pages/courses/${courseId}/${lesson.id}/LessonTopic.tsx`)
- Sidebar llista lliçons (filtrada a l'actual)
- Explicació teòrica amb react-markdown
- Challenge box
- Exercise instructions
- Navegació prev/next/go-to-activity

### StudentDashboard (`src/pages/dashboards/StudentDashboard.tsx`)
- Login/create-user flow (Login component)
- Profile card (StudentProfileCard)
- Progress overview (ProgressOverview)
- Course grid expansible (CourseCard)
- Ranking per tabs (RankingCard)
- Integra dades API + progress sync local
- Dispara `studentsUpdated` event en crear/eliminar usuaris (per sincronitzar Hero)
- Passa `students` com a prop a `Login`
- Layout: `height: 100%` dins del flex container de MainLayout, sense scroll vertical/horitzontal
- **Colors per mode dark**: fons `#111827`, cards amb `#1f2937` (via nested MuiThemeProvider que sobreescriu `background.paper`)
- **Mode fancy**: fons transparent + `<ParticlesBackground opacityMultiplier={0.4} />`
- Eliminat `ScrollIndicator` (no s'usava)

---

## 8. Serveis

### `api.ts` — Mock localStorage API
| Mètode | Descripció |
|--------|------------|
| `getStudentProgress(studentId)` | Retorna tot el progrés (`mooc_global_progress`) |
| `postProgress({studentId, courseId, lessonId, status})` | Desa progrés + event `lessonProgressUpdated` |
| `resetCourse(studentId, courseId)` | Reinicia progrés + codi + submissions + last_session d'un curs |

### `authService.ts` — Auth API
| Mètode | Endpoint | Fallback local |
|--------|----------|---------------|
| `login({email, code})` | POST `/api/users/auth/login/` | No (error si API no disponible) |
| `logout()` | POST `/api/users/auth/logout/` | Sempre neteja localStorage |
| `getMe()` | GET `/api/users/me/settings/` | Sí (llegeix `currentStudent`) |
| `getCurrentUser()` | — | Sí (només localStorage) |

### `courseService.ts` — Course API
Base URL: `VITE_API_URL` env var o `https://algorien.com/api/v1`
- Interceptor: afegeix `Authorization: Token {token}` automàtic
- Timeout: 10s
- `submitChallenge` envia el codi com a `File` (`submission.csv`) dins un `FormData` amb clau `file` (`Content-Type: multipart/form-data` gestionat automàticament per axios)

| Mètode | Endpoint |
|--------|----------|
| `getAllCourses()` | GET `/public/courses/` |
| `getCourseBySlug(slug)` | GET `/courses/{slug}/` |
| `getCourseTopics(slug)` | GET `/courses/{slug}/topics/` |
| `getTopicProblems(courseSlug, topicSlug)` | GET `.../{courseSlug}/topics/{topicSlug}/problems/` |
| `submitChallenge(courseSlug, challengeSlug, code)` | POST `.../challenges/{challengeSlug}/submissions/` (envia `code` com a `File` via `FormData` amb clau `file`) |
| `submitSubmission(courseSlug, challengeSlug, code)` | **Deprecated** — delega a `submitChallenge` |
| `getFullCourseDetail(slug)` | Agrega course + topics + problems en una sola crida |

---

## 9. Hooks

| Hook | Descripció |
|------|------------|
| `useCourse(courseId)` | React Query: `['course', courseId]`, staleTime 30min, gcTime 60min, enabled si courseId vàlid |
| `prefetchCourse(queryClient, courseId)` | Prefetch de dades de curs (per hover a CourseCard) |
| `useTheme()` | Re-exporta `{ ThemeProvider, useThemeMode }` |
| `useI18n()` | Re-exporta `{ I18nProvider, useI18n }` |
| `useTeacherData()` | (BUIT) |

---

## 10. Utilitats

### `formatters.ts`
| Funció | Descripció |
|--------|------------|
| `getLocalizedText(field, lang)` | Resol text multiidioma (objecte {ca, es, en} o string) |
| `getBaseLanguage(locale, fallback)` | Extreu 'ca'/'es'/'en' d'un locale |
| `formatProgressPercent(done, total)` | Percentatge arrodonit |
| `calculatePoints(completed)` | `completed * 10` |
| `padNumber(num, length)` | Padding numèric |
| `formatTimestamp(timestamp, locale)` | Data localitzada |
| `makeProgressKey(courseId, lessonId)` | `"{courseId}_{lessonId}"` |

### `validators.ts`
| Funció | Descripció |
|--------|------------|
| `validatePin(student, pin)` | Compara `student.code === pin` |
| `validateRequiredFields(fields)` | Tots els camps no buits |
| `isValidPin(pin)` | Regex `^\d{4}$` |
| `isValidEmail(email)` | Regex bàsic d'email |
| `validateCodeSolution(userInput, expected)` | Substring matching (whitespace-normalitzat) |

### `utils.ts`
- `sx(...styles)`: Composa múltiples objectes `sx` de MUI

---

## 11. Flux de Dades

### Fonts de Dades
1. **`src/data/`** — Image mappings (`courses.ts`), 3 estudiants predefinits (`students.ts`)
2. **API REST** — `https://algorien.com` (proxy Vite `/api`). `courseService.ts` amb axios (token aut o timeout 10s)
3. **localStorage** — 11+ claus:
   - `mooc_global_progress`: `{courseId_lessonId: true}`
   - `code_{userId}_{courseId}_{lessonId}`: Codi guardat
   - `points_{userId}`: Punts acumulats (10 per lliçó)
   - `currentStudent`: Estudiant sessió activa
   - `mooc_local_students`: Estudiants creats localment
   - `mooc_deleted_ids`: IDs eliminats
   - `mooc_submissions_{courseId}_{lessonId}`: Submissions
   - `mooc_last_session`: Última sessió `{courseId, lessonId, courseTitle, lessonTitle, timestamp}`
   - `mooc-theme-mode`: Tema (light/dark/fancy)
   - `mooc-language`: Idioma (ca/es/en)
   - `token`: Token API

### Flux Progrés (LessonPage)
```
handleRunTests()
  ├── Obre/focusa consola popup (isPythonCourse)
  ├── Envia codi a API via courseService.submitChallenge() (com a fitxer CSV dins FormData)
  ├── Si result.status === 'correct' || result.passed === true:
  │     ├── confetti()
  │     ├── handleSaveProgress(true) → +10 punts
  │     └── showResultModal(true)
  ├── Si fail: status = 'fail', mostra console inline
  └── useEffect sincronitza consoleOutput a la finestra popup

handleSaveProgress(isAutoSaveOnPass)
  ├── Desa codi a localStorage
  ├── Marca lliçó completada a mooc_global_progress
  ├── Desa mooc_last_session
  ├── Suma 10 punts a points_{userId}
  ├── api.postProgress() → localStorage + dispatch lessonProgressUpdated
  └── addNotification(progress_saved)
```

### Flux Autenticació
```
AuthContext.init()
  ├── Llegeix token + currentStudent de localStorage
  ├── Si token: valida via authService.getMe()
  └── Si error: neteja localStorage, user=null

StudentDashboard / Login (login local per PIN)
  ├── handleLogin(student, pin): comprova student.code === pin
  └── Desa a localStorage (currentStudent), dispatch 'auth-state-change'
```

---

## 12. Configuració del Build

```bash
npm install          # Instal·lar dependències
npm run dev          # Executar desenvolupament (http://localhost:5173)
npm run build        # Producció (tsc -b && vite build)
npm run preview      # Previsualitzar build
```

### Vite Config
| Opció | Valor |
|-------|-------|
| Path alias | `@` → `./src` |
| Proxy | `/api` → `https://algorien.com` (changeOrigin) |
| Server port | `5173` |
| watch.usePolling | `true` |
| Build sourcemap | `true` |
| build.cssCodeSplit | `true` |
| build.reportCompressedSize | `true` |
| optimizeDeps.include | @mui/material, @mui/material/styles, @emotion/react, @emotion/styled, framer-motion |

### TypeScript Config
- Target: ES2020, Module: ESNext
- Strict mode
- Path alias: `@/*` → `./src/*`
- JSX: react-jsx

---

## 13. Tema (theme.ts)

| Propietat | Valor |
|-----------|-------|
| Colors primaris | `#8400ff` (porpra) |
| Colors secundaris | `#ec4899` (rosa) |
| Fons dark/fancy | `#141414` |
| Fons light | `white` |
| Font | Inter, Roboto, Helvetica, Arial, sans-serif |
| Border radius | 12 (buttons), 16 (cards) |
| textTransform | 'none' (MuiButton) |

3 modes: `light`, `dark`, `fancy` (fancy = dark + ParticlesBackground + text colors #e4e4e4). En mode fancy, ThemeContext sobreescriu `document.body.style.backgroundColor = 'transparent'` per evitar que CssBaseline tapin les partícules. StudentDashboard usa un MuiThemeProvider niu que sobreescriu `background.paper` a `#1f2937` en mode dark.

---

## 14. Traduccions

| Fitxer | Línies | Seccions |
|--------|--------|----------|
| `ca.ts` | 132 | auth, dashboard, home, hero, footer, course, common, lesson (syllabus, run, debug, objective, challenge, points, etc.), **notifications (9 claus)** |
| `es.ts` | 138 | Mateixes seccions |
| `en.ts` | 134 | Mateixes seccions |

### Notificacions (9 claus multiidioma)
- `progress_saved`, `progress_error`, `account_created`, `user_deleted`, `incorrect_pin`, `welcome`, `session_closed`, `course_reset`, `course_reset_error`
- Interpolació i18next: `{{name}}`, `{{role}}`

---

## 15. Estat Actual del Projecte

### ✅ Implementat
- Landing page completa (Hero typewriter + stats dinàmiques + course grid + features + footer)
- 3-column lesson browser (syllabus accordion animat + contingut Markdown + "On this page" anchors, drawer mòbil)
- Editor de codi interactiu (LessonPage): run tests, console popup, confetti, auto-save, submissions, +10 punts
- Vista teòrica (LessonTopic): sidebar, explicació Markdown, challenge, navegació prev/next
- StudentDashboard complet: login PIN, create/delete students, perfil, progrés, cursos expansibles, rànquing
- Multiidioma (CA, ES, EN) amb i18next + browser detector
- 3 modes de tema (light, dark, fancy) amb localStorage
- Toast notifications amb react-spring
- ParticlesBackground en mode fancy
- API integration (courseService) amb React Query caching + hover prefetch
- Persistència localStorage: progrés, codi, punts, usuaris, tema, idioma, última sessió
- React 19 patterns: `use()` en lloc de `useContext()`, FormEvent imports, cap `import React`
- MainLayout: flex column amb `height: 100dvh`, Header + Outlet amb `flex: 1, overflow: hidden` (sense scroll vertical a les pàgines filles)
- Notificacions traduïdes als 3 idiomes
- mooc_last_session per recordar última lliçó
- Scrollbar estilitzada
- Spinners fullscreen (fixed, inset:0, zIndex:9999)
- Header "My Progress" bgcolor adaptatiu: `action.hover` en dark, `alpha(primary, 0.08)` en light
- Esquema de colors per mode dark al dashboard: fons `#111827`, cards `#1f2937`; mode fancy: fons transparent amb partícules; mode light: fons/blancs per defecte
- Header AppBar bgcolor per mode: fancy → `black`, dark → `#1f2937`, light → `white`
- `ParticlesBackground` accepta prop `opacityMultiplier` per controlar opacitat per instància

### ❌ Per Implementar
- Pàgines teacher: `Courses.tsx`, `Dashboard.tsx`, `Exercises.tsx`, `Students.tsx`
- Components teacher: `ChatWidget.tsx`, `CourseForm.tsx`, `ExerciseEditor.tsx`, `StatsCards.tsx`, `StudentFilters.tsx`, `StudentTable.tsx`
- `useTeacherData.ts`, `teacherService.ts`, `TeacherLayout.tsx`
- `ProgressBar.tsx`, `SearchInput.tsx`

### ⚠️ Observacions
- `AuthContext` connectat a main.tsx, però StudentDashboard i Header encara fan servir localStorage directament (no `useAuth()`)
- `authService.login()` NO té fallback local — error si API no disponible
- `api.ts` és només localStorage (sense axios)
- `courseService.ts` NO té fallback a `data/courses.ts` — error si API no disponible
- `src/i18n/index.ts` és duplicat de `src/i18n.ts` i no s'importa (deixat de migració)
- `src/App.css` existeix però no s'importa
- Inconsistència color de fons: MUI theme `#141414` vs ParticlesBackground `#0a0a0a` vs scrollbar `#0a0a0a`. **Parcialment resolt**: en mode fancy, `body` i wrapper `App` es posen `transparent` perquè es vegi el canvas. El dark mode del dashboard usa `#111827` (fons) i `#1f2937` (cards)
- `"react-is": "19.0.0"` override a package.json per compatibilitat MUI v9
- `Hero.tsx` mostra recompte dinàmic d'estudiants (escolta event `studentsUpdated`)
- `Login.tsx` rep `students` com a prop (no fusiona internament)
- `StudentDashboard` dispara `studentsUpdated` en crear/eliminar usuaris; `height: 100%` dins del flex container, sense scroll
- `LessonTopic.tsx` té `localCourses` no definit (potencial bug)
- `LessonPage.tsx` crida `courseService.submitChallenge()`, que envia el codi com a `File` (`submission.csv`) dins un `FormData` (`multipart/form-data`)
- `submitSubmission` queda com a wrapper **deprecated** cap a `submitChallenge`

---

## 16. APIs Utilitzades

### API REST — Backend `https://algorien.com` (proxy Vite: `/api`)

| Mètode | Endpoint | Ús | Servei |
|--------|----------|-----|--------|
| POST | `/api/users/auth/login/` | Login usuari | `authService.ts` |
| POST | `/api/users/auth/logout/` | Logout usuari | `authService.ts` |
| GET | `/api/users/me/settings/` | Dades usuari actual | `authService.ts` |
| GET | `/api/v1/public/courses/` | Llistat públic cursos | `courseService.ts` |
| GET | `/api/v1/courses/{slug}/` | Detalls d'un curs | `courseService.ts` |
| GET | `/api/v1/courses/{slug}/topics/` | Lliçons d'un curs | `courseService.ts` |
| GET | `/api/v1/courses/{slug}/topics/{topic}/problems/` | Problemes d'un tema | `courseService.ts` |
| POST | `/api/v1/courses/{slug}/challenges/{challenge}/submissions/` | Enviar solució challenge (com a `File` dins `FormData`) | `courseService.ts` |

### APIs de Tercers / Llibreries

| API / Llibreria | Ús |
|----------------|-----|
| **@tanstack/react-query** | Cache + prefetching (useQuery, QueryClientProvider) |
| **react-router-dom** | SPA routing (Links, Routes, useNavigate, useParams, useLocation) |
| **i18next + react-i18next** | Traduccions (useTranslation, i18n.changeLanguage) |
| **framer-motion** | Animacions (motion.div, AnimatePresence, whileInView, whileHover) |
| **@react-spring/web** | Animacions toast (useTransition, useSpring) |
| **axios** | HTTP client |
| **canvas-confetti** | Confetti en completar lliçons |
| **MUI v9** | Sistema components (ThemeProvider, CssBaseline, Box, Card, Button, Accordion, etc.) |
| **localStorage API** | Persistència: progrés, codi, punts, usuaris, tema, idioma, submissions, última sessió |
| **Canvas API** | Fons interactiu partícules (ParticlesBackground) |
| **window.dispatchEvent** | Comunicació entre components (`auth-state-change`, `lessonProgressUpdated`, `studentsUpdated`) |
| **babel-plugin-react-compiler** | Optimització React 19 |

---

## 17. Package.json — Scripts i Overrides

### Scripts
| Script | Comando |
|--------|---------|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |

### Overrides
```json
"overrides": {
  "react-is": "19.0.0"
}
```
(Necessari per compatibilitat MUI v9 amb React 19)

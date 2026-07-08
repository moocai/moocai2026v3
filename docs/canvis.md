# 07/07/2026

## Header.tsx (`src/components/Header.tsx`)
- **Fons opac**: canviat `rgba(0,0,0,0.8)` a `#000000` perquè el text del scroll no es vegi a través del header.
- **Eliminat botó "El meu Progrés"**: l'Avatar ara fa de navegació al dashboard.
- **Afegit `UserAvatarMenu`**: l'Avatar obre un menú desplegable amb configuració ràpida.
- **Eliminat toggle de rol redundant**: el selector Student/Teacher ja no es mostra al nav superior, ara és dins del menú d'usuari.
- **Avatar a la dreta del tot**: mogut després del ThemeToggleButton.
- **Neteja d'imports**: eliminat `alpha` (ja no s'usa).

## UserAvatarMenu.tsx (`src/components/UserAvatarMenu.tsx`) — NOU
- Avatar 40×40 amb fletxa `ChevronDown` a sota indicant que és un menú desplegable.
- Menú MUI (`Menu`) amb 3 seccions separades per `Divider`:
  - **Tema**: 3 botons (Sol ☀️, Lluna 🌙, Estrelles ✨) amb `setMode()`, estil igual que `ThemeToggleButton`.
  - **Idioma**: CA / ES / EN amb `i18n.changeLanguage()`, estil consistent.
  - **Rol**: Student / Teacher amb toggle animat, navega automàticament al dashboard corresponent.
  - **Tancar sessió**: botó vermell a sota de tot.
- Botó `X` (vermell) a dalt a la dreta per tancar el menú. Les opcions **no** tanquen el menú en seleccionar-les.

## StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)
- **Eliminada `StudentProfileCard`**: l'Avatar amb el menú d'usuari ara està al Header, ja no cal la targeta de perfil al dashboard.
- Eliminat l'import de `StudentProfileCard` ja no utilitzat.

## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)
- **Tabs eliminats**: s'ha tret el sistema de pestanyes (Temari / Laboratoris / Tests) del sidebar.
- **Vista única**: tots els subtopics (teoria + coding 💻 + tests 📝) es mostren dins d'un sol acordió per lliçó.
- **Scrollbar**: afegit estil `&::-webkit-scrollbar` amb `width: 3` a les 3 àrees scrollables (sidebar, columna central, panell dret).
- **Altura del sidebar**: canviat `maxHeight` a `calc(100vh - 120px)` per deixar espai al final.
- **Font size unificat**: tots els subtopics a `{ xs: '0.85rem', md: '0.95rem' }` amb `fontWeight: 600`.
- **Percentatge completat per tema**: afegit `getLessonProgress()` que calcula % de subtopics (coding+test) resolts. Es mostra com a número al costat del títol de cada acordió.
- **Font size subtopics incrementat**: de `0.85rem/0.95rem` a `0.9rem/1.05rem`.

## Header.tsx (`src/components/Header.tsx`)
- **Amagar Language/Theme quan loguejat**: `LanguageSwitcher` i `ThemeToggleButton` s'amaguen al nav desktop si l'usuari està loguejat (ja que estan dins del `UserAvatarMenu`). Si no ho està, es mostren normalment.

## Home.tsx (`src/pages/Home.tsx`)
- **Redirecció automàtica al dashboard**: si `currentStudent` existeix a localStorage i la navegació NO prové d'un clic al logo o botó Cursos (`location.state?.fromNav`), redirigeix a `/dashboards/student`.
- **Sense redirecció si ve del Header**: el logo i el botó "Cursos" del Header passen `state={{ fromNav: true }}` per evitar la redirecció i mostrar la Home normalment.

<br>

## courseService.ts (`src/services/courseService.ts`)
### Endpoints canviats: de `/challenges/` a `/topics/{topicSlug}/problems/{problemSlug}/`
- **`submitChallenge(courseSlug, topicSlug, problemSlug, data)`** — abans enviava CSV via FormData, ara POST amb JSON body a `/courses/{courseSlug}/topics/{topicSlug}/problems/{problemSlug}/submissions/`. `data` és `{ code?: string; answers?: string[] }`:
  - Coding: `{ "code": "..." }`
  - Test: `{ "answers": ["<choice_id>", ...] }`
  - Cursos públics: usuaris no autenticats poden enviar, el codi s'executa i es retorna resultat, però **no es persisteix** (submission_count = 0).
- **`getChallengeSubmissions(courseSlug, topicSlug, problemSlug)`** — abans `(courseSlug, challengeSlug)`, ara GET a `/courses/{courseSlug}/topics/{topicSlug}/problems/{problemSlug}/submissions/`.
- **`getChallengeGrades(courseSlug, topicSlug, problemSlug)`** — abans `(courseSlug, challengeSlug)`, ara GET a `/courses/{courseSlug}/topics/{topicSlug}/problems/{problemSlug}/submissions/grades/`.
- **`getPeerSubmissions(courseSlug, topicSlug, problemSlug)`** — abans `(courseId, lessonId)` (usava `lessonId` per topic i problem, incorrecte), ara rep `topicSlug` i `problemSlug` separats a `/courses/{courseSlug}/topics/{topicSlug}/problems/{problemSlug}/submissions/peers/`.
- **`getChallenge(courseSlug, topicSlug, problemSlug)`** — abans `(courseSlug, challengeSlug)`, ara GET a `/courses/{courseSlug}/topics/{topicSlug}/problems/{problemSlug}/` (obté detalls d'un problema).
- **`submitSubmission` (deprecated)**: signatura actualitzada a `(courseSlug, topicSlug, problemSlug, data)`.

### Caché en memòria
- **`getAllCourses(forceRefresh?)`**: afegit caché intern (`allCoursesCache`) per no repetir la crida a l'API en navegacions subsegüents.
- **`getFullCourseDetail(slug, forceRefresh?)`**: afegit caché intern (`fullCourseCache`) clau = slug. Retorna instantàniament en segones crides.
- **`clearCache(slug?)`**: buida el caché de cursos i/o detalls.

## MainLayout.tsx (`src/layouts/MainLayout.tsx`)
- **Precàrrega de cursos en muntar-se**: `useEffect` crida `getAllCourses().then(...)` i per cada curs llança `getFullCourseDetail` en background per tenir les dades al caché abans que l'usuari navegui al dashboard.

## Home.tsx (`src/pages/Home.tsx`)
- **Precàrrega de detalls**: després de carregar la llista de cursos, llança `getFullCourseDetail` per cada curs en background (sense await) per popular el caché.

## LessonPage.tsx (`src/pages/courses/LessonPage.tsx`)
- **`handleRunTests`**: ara extreu `topic.id` del `course.content` i el passa com a `topicSlug` a `submitChallenge`.
- **`loadPeerSolutions`**: ara extreu `topic.id` del `course.content` i passa `topicSlug` + `lessonId` (problemSlug) a `getPeerSubmissions`.
- **Eliminat fallback local en error**: el `catch` de `handleRunTests` ja no guarda el progrés a localStorage si el servidor falla. Ara el catch està buit (`catch (_) {}`).

## ExamPage.tsx (`src/pages/courses/ExamPage.tsx`)
- **useEffect**: ara troba `topic.id` del `course.content` abans de cridar `getChallengeSubmissions`. També passa `topicSlug` a `getChallenge` (fallback).
- **`handleSubmit`**: ara troba `topic.id` del `course.content` i passa `topicSlug` a `submitChallenge` i `getChallengeSubmissions`.

## UserAvatarMenu.tsx (`src/components/UserAvatarMenu.tsx`)
- **Avatar**: click ara navega directament a `/dashboards/student` enlloc d'obrir el menú.
- **ChevronDown**: la fletxeta a sota de l'Avatar fa ara d'`IconButton` i és l'única que obre el menú desplegable (rol, idioma, logout).
- **Theme eliminat**: els botons de tema s'han tret del menú (ara estan sempre al header).

## Header.tsx (`src/components/Header.tsx`)
- **Ordre menú mòbil canviat**: ara és 1) Usuari + Rol (Avatar/nom/toggle), 2) Cursos, 3) Language, 4) Sortir.
- **Avatar al menú mòbil**: clicant a l'Avatar + nom navega al dashboard.
- **Theme sempre visible**: `ThemeToggleButton` es mostra sempre al header tant si està loguejat com si no.
- **Language només al UserAvatarMenu**: `LanguageSwitcher` només es mostra al header per usuaris no loguejats; els loguejats el tenen dins del `UserAvatarMenu`.

## CourseExpandedContent.tsx (`src/features/student/CourseExpandedContent.tsx`)
- **Dropdown full-width**: canviat de `position: absolute` amb amplada fixa a `position: fixed` amb `width: 100vw`. Calcula `top` dinàmicament amb `getBoundingClientRect` del pare i es reajusta en scroll/resize.
- **Icons per tipus**: les lessons mostren 💻 (coding) o 📝 (test) segons el `type`.
- **Ordre lessons**: teoria primer, després coding, després test.
- **Percentatge per topic**: mostra el % de lessons completades al costat del títol de cada topic.

## StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)
- **`getCourseTopics`**: afegit `type: st.type` al mapping per propagar el tipus de subtopic.

## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)
- **Percentatge completat per tema**: afegit `getLessonProgress()` que calcula % de subtopics (coding+test) resolts. Es mostra com a número al costat del títol de cada acordió.
- **Font size subtopics incrementat**: de `0.85rem/0.95rem` a `0.9rem/1.05rem`.

<br>

# 08/07/2026

## courseService.ts (`src/services/courseService.ts`)
- **`getTopicBySlug(courseSlug, topicSlug)`**: nou endpoint `GET /api/v1/courses/{course_slug}/topics/{topic_slug}/`. Retorna les dades del topic incloent `theory_md`. Utilitza `getLocalizedText` per resoldre l'idioma de l'usuari (amb fallback a anglès).

## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)
- **Teoria des del nou endpoint**: s'importa `courseService` i es fa fetch de la teoria via `getTopicBySlug` només per al topic actiu (`activeId`).
- **LEFT SIDEBAR**: afegit botó 📖 **Teoria** amb el mateix estil que els sub-topics. Quan el topic està actiu: text **white** amb `bgcolor: alpha('#8400ff', 0.1)`. Al fer clic, fa scroll a la teoria de la columna central.
- **CENTRAL COLUMN**: la teoria es renderitza completa amb `ReactMarkdown` (amb els mateixos estils que el contingut existent). Només es mostra la teoria del topic seleccionat, sense activitats.

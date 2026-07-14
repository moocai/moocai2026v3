# 09/07/2026

## StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)
- **`code_problems` card**: ara mostra els **topics** del curs (els temes), filtrant el progrés només per exercicis de codi (`isCodeLesson`).
- **`test_exercises` card**: ara mostra els **subtopics individuals** (`flatLessons.filter(isTestLesson)`), en lloc de topics buits.
- **`continue_studying` section**: filtra per mostrar **només exercicis intentats** (`dbProgress[course.id_lesson.id]`). Si no n'hi ha cap, mostra "Encara no has fet cap exercici."
- **Fix `setActionLoading`**: afegida la coma que faltava a `[, setActionLoading]` (estava `[setActionLoading]`, agafant el valor booleà enlloc del setter).
- **Tots els textos via i18n**: eliminats tots els `|| 'fallback hardcoded'` de les crides `t()`. Cada text va ara exclusivament per traducció.
- **TopicBar clickable**: cada barra de topic navega a `CourseLessons` amb `?lessonId={topic.id}` per obrir l'acordió correcte.
- **Test exercises clickable**: cada subtopic de test navega directament a `ExamPage` via `/courses/{slug}/exam/{lessonId}`.
- **Rutes corregides**: `navigate('/curs/...')` → `navigate('/courses/...')` per coincidir amb les rutes de `App.tsx`.
- **`> ` indicator**: afegit `> ` a la dreta del label del TopicBar per indicar que és clickable.

## types.ts (`src/features/student/types.ts`)
- **Topic.id**: afegit camp `id?: string` a la interfície `Topic`.
- **Lesson**: afegits camps `choices`, `precode`, `difficulty`, `score`.

## i18n (`src/i18n/ca.ts`, `src/i18n/es.ts`, `src/i18n/en.ts`)
- **14 noves claus** afegides a `dashboard`: `overall_progress`, `code_problems`, `test_exercises`, `view_stats`, `more_stats`, `coming_soon`, `continue_studying`, `no_lessons`, `no_attempted_lessons`, `view_full_course`, `no_courses`, `no_data`, `add_course`.

## UserAvatarMenu.tsx (`src/components/UserAvatarMenu.tsx`)
- **Avatar ja no navega al dashboard**: eliminat `onClick={() => navigate('/dashboards/student')}`. L'Avatar ara té `cursor: 'default'`. El menú desplegable (chevron) continua funcionant.

## Header.tsx (`src/components/Header.tsx`)
- **Botó "Dashboard" al nav desktop**: afegit entre "Cursos" i el toggle d'idioma/tema, visible només si l'usuari està loguejat. Navega a `/dashboards/student`.
- **Menú mòbil**: reestructurat — eliminada la secció separada d'usuari (avatar + nom + rol a dalt). El nom de l'usuari i un botó "Dashboard" apareixen ara a la mateixa fila que "CURSOS". El toggle de rol s'ha mogut a sota dels cursos.
- **`Avatar` tret dels imports**: ja no s'usa al Header.

## api.ts (`src/services/api.ts`)
- **`postProgress`**: ara fa dispatch a `window` i `document` (abans només `window`) per assegurar que tots els listeners rebin l'event `lessonProgressUpdated`.

## LessonPage.tsx (`src/pages/courses/LessonPage.tsx`)
- **`handleSaveProgress`**: dispatch a `window` + `document` (abans només `window`).
- **`handleRunTests`**: crida `handleSaveProgress(true)` **sempre** que el servidor respon, tant si `passed` com si no. Abans només guardava en `passed === true`.
- **`handleNext`**: refactoritzat — ja no navega al *next topic* sinó al *current topic* (per mantenir l'acordió de CourseLessons obert al tema correcte).
- **`globalProgress` / `progressPercent`**: canviat de comptar per `lesson.id` a aplanar `subTopics` i comptar per `problemSlug || slug`.

## StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)

### Progress & Data layer
- **`getProgress(studentId)`**: nova funció helper que fusiona `mooc_global_progress_{studentId}` + `mooc_shared_all_progress[studentId]`, usada per totes les càrregues de progrés.
- **`SHARED_PROGRESS_KEY` eliminada**: ja no es necessita com a constant separada; `getProgress()` gestiona la fusió.
- **`fetchProgress` reescrita**: primer intenta `api.getStudentProgress(studentId)`, si falla usa `getProgress(studentId)`. Eliminada la fusió amb l'storage (ara ho fa `getProgress`).
- **`getCourseProgress`**: canviat de `useCallback([], [])` a funció normal per eliminar possibles stale closures.
- **`getCourseProgress`**: afegit `Math.max(1, Math.round(...))` per mostrar almenys 1% si `done > 0` (evita 0% amb pocs exercicis completats).
- **`getCoursePoints`**: canviat de `SHARED_PROGRESS_KEY` a `getProgress(studentId)`.
- **Targeta `test_exercises`**: canviada de `dbProgress[key]` a `progressData[key]` (`getProgress(selectedStudent.id)`), mateixa font que la resta.

### Helpers
- **`isTestLesson` / `isCodeLesson`**: filtres per tipus de lliçó (test si `type` en `['test','quiz','exam','multiple_choice']` o té `choices`).
- **`getFlatLessons`**: aplana tots els topics en una llista plana de lliçons amb `topicTitle`.

### Layout & Responsive (xl)
- **Container**: canviat a `maxWidth={false}`, `px: { xs: 3, sm: 1.5, md: 8, lg: 8, xl: 10 }`, `overflow: { xs: 'visible', md: 'auto' }`.
- **Grid summary cards**: `size={{ xs: 6, sm: 6, md: 2.4, xl: 2.2 }}` (overall progress) i `xl: 2.4` (resta), `spacing={{ xs: 2, xl: 4 }}`, `ml: { xl: 2 }`.
- **CircularProgress**: `width/height: { xs: 110, xl: 160 }`, `size="100%"`, font `{ xs: '1.5rem', xl: '2rem' }`.
- **Lesson title ("Continua estudiant")**: `width: { xs: 120, md: 220, xl: 280 }`.
- **Hover**: text de les lliçons als cards canvia a `#8400ff` al passar el ratolí per sobre.
- **Text XL**: `fontSize: { xl: '0.85rem' }` a les lliçons dels cards `code_problems` i `test_exercises`.
- **Stack spacing**: `{ xs: 1.5, xl: 2.5 }` als llistats de lliçons.

### UI Components
- **Course tabs (Tops)**: `Tabs` amb `Tab` per cada curs, botó `RestartAltIcon` (reset), botó `AddIcon` (navega a `/cursos`). Estil `borderRadius: 999`, `border: '2px solid #8400ff'`.
- **DashboardCard**: component wrapper amb `border: '2px solid'`, `borderColor: '#8400ff'`, `borderRadius: 3`, `minHeight: 390`, títol centrat.
- **MutedLink**: component per enllaç tipogràfic al final dels cards (`mt: 'auto'` per empènyer-lo al fons).
- **Leaderboard card**: top 3 amb `Avatar` (inicial del nom), nom i punts (`getCoursePoints`).
- **"Més estadístiques" card**: placeholder amb `BarChartIcon` + "Aviat disponible".
- **"Continua estudiant" section**: lliçons intentades (últimes 5), icones codi/test, botons teoria/repte, `LinearProgress` al 100%. Si no n'hi ha, missatge segons si el curs té lliçons o no.

### Events & Cleanup
- **Listener `lessonProgressUpdated`**: ara neteja correctament al cleanup (`removeEventListener`).
- **Listener `storage`**: afegit `window.addEventListener('storage', onProgress)` per sincronitzar entre pestanyes.
- **`handleResetCourse`**: signatura simplificada — ja no rep `MouseEvent`, només `courseId`. Eliminat `stopPropagation`.

### Neteja d'imports i state
- **Imports eliminats**: `ProgressOverview`, `CourseCard`, `RankingCard` (substituts per JSX directe al dashboard).
- **State eliminat**: `expandedCourse`, `rankingTab`.
- **Imports afegits**: `Tabs`, `Tab`, `IconButton`, `LinearProgress`, `Avatar`, `Button`, `AddIcon`, `MenuBookIcon`, `LaptopMacIcon`, `InfoOutlinedIcon`, `BarChartIcon`, `ArrowForwardIcon`, `RestartAltIcon`.

# 14/07/2026

## i18n (`src/i18n/ca.ts`, `src/i18n/es.ts`, `src/i18n/en.ts`)
- **8 noves claus** afegides a `lesson`: `tab_course`, `tab_theory`, `tab_exercises`, `tab_tests`, `tab_exams`, `tab_files`, `expand_all`, `collapse_all`.
- Les 6 tabs del centre (Course / Teoria / Exercicis / Tests / Exàmens / Fitxers) i el botó "Expandeix-ho tot" / "Col·lapsa-ho tot" ara tenen traduccions reals en els 3 idiomes, en lloc de dependre dels fallbacks hardcoded.

## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)
- **Sidebar col·lapsable**: afegit botó `PanelLeftClose` al costat dret de "Temari" al header del sidebar. En fer clic, la sidebar es redueix a 48px amb una icona per reobrir-la. Transició suau de 0.2s a l'amplada.
- **State `sidebarOpen`**: nou state boolean (default `true`) que controla l'obertura del sidebar.
- **Import `PanelLeftClose`**: afegit de `lucide-react`.

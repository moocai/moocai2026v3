# 02/07/2026 — Sincronització Punts / Progrés

## LessonPage.tsx (`src/pages/courses/LessonPage.tsx`)

### Clau de localStorage unificada (per usuari)

- **Abans**: Guardava el progrés a la clau compartida `mooc_global_progress` (sense userId).
- **Ara**: Guarda a `mooc_global_progress_{userId}`, exactament el mateix format que llegeix StudentDashboard.
- S'ha eliminat l'emmagatzematge separat de `points_{userId}` — els punts es calculen del progrés (`done * 10`).

### useEffect estabilitzat

- **Abans**: L'`useEffect` depenia de `currentProblem` (objecte que canvia de referència a cada render), provocant que `setUnlocked(false)` es disparés innecessàriament.
- **Ara**: Depèn només de `currentUser`, `courseId`, `lessonId` (valors estables).

### catch block — desbloqueig de pestanyes

- Afegit `setUnlocked(true)` al catch de `handleRunTests` perquè les pestanyes "Solució Profe" i "Solucions Alumnes" es desbloquegin també quan falla el servidor.

### Display de punts dinàmic

- **Abans**: Mostrava `10` fixe a la targeta de punts.
- **Ara**: Mostra `globalProgress * 10` (punts totals del curs calculats del progrés).

<br>

## StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)

### Logout — no esborra el progrés

- **Abans**: `handleLogoutAction` eliminava `mooc_global_progress_{userId}` de localStorage.
- **Ara**: El logout només neteja `currentStudent` i l'estat en memòria. El progrés persisteix entre sessions.

### fetchProgress — merge enlloc de sobreescriure

- **Abans**: `fetchProgress` cridava l'API i sobreescrivia `dbProgress` i localStorage amb la resposta, perdent dades locals si l'API tornava buit.
- **Ara**: Llegeix primer de localStorage, després de l'API, i fa un merge (`{ ...local, ...apiData }`). Si l'API falla, es conserven les dades locals.

### Migració de clau antiga

- Afegida migració única: si existeix la clau antiga `mooc_global_progress` (compartida), es fusiona amb la nova clau per usuari `mooc_global_progress_{userId}` i s'elimina l'antiga.

### getCourseTopics — correcció del fallback

- **Abans**: El fallback usava `course.content` directament com a lessons, on `lesson.id` era el ID del contingut (no coincidia amb les claus de progrés).
- **Ara**: Extreu `st.problemSlug` dels subTopics com a `lesson.id`, coincidint amb el format de clau que guarda LessonPage.

<br>


## authService.ts (`src/services/authService.ts`)

### Logout — ja no esborra progrés

- **Abans**: El `finally` del `logout` eliminava `mooc_global_progress_{userId}` de localStorage.
- **Ara**: Només neteja `token` i `currentStudent`. El progrés de l'usuari es conserva.


<br>


## ProgressOverview.tsx (`src/features/student/ProgressOverview.tsx`)

### Mostra punts enlloc de percentatge

- **Abans**: Mostrava `{getCourseProgress}%` (percentatge).
- **Ara**: Mostra `{getCoursePoints} punts` (punts = lliçons completades × 10). La barra `LinearProgress` continua mostrant el percentatge.

### Debug visual afegit

- Afegit text de debug (`debug: X% / Ypts`) i `console.log` per facilitar la identificació de problemes de sincronització.

### Carrega síncrona del progrés al login

- **Abans**: `handleLogin` cridava `fetchProgress` (async) però `dbProgress` estava a `{}` (reset al logout). Entre el login i la resposta del `fetchProgress`, el component renderitzava amb progrés buit.
- **Ara**: `handleLogin` llegeix `mooc_global_progress_{userId}` de forma síncrona i fa `setDbProgress(saved)` abans de cridar `fetchProgress`. La barra es veu immediatament.

---


<br>




# 03/07/2026 — Pestanya Solucions Alumnes via API

## CourseService.ts (`src/services/courseService.ts`)

### Nou mètode `getPeerSubmissions`

- Afegit `getPeerSubmissions(courseId, lessonId)` que crida `GET /api/v1/courses/{courseId}/topics/{lessonId}/problems/{lessonId}/submissions/peers/`.
- Retorna l'array directament o `data.results`; si l'API falla, retorna `[]` (no llança error).


<br>



## LessonPage.tsx (`src/pages/courses/LessonPage.tsx`)

### Estats nous

- `peerSolutions` (`any[]`) — guarda les solucions rebudes de l'API.
- `loadingPeers` (`boolean`) — controla l'spinner de càrrega.

### Funció `loadPeerSolutions`

- Crida `courseService.getPeerSubmissions(courseId, lessonId)` i actualitza `peerSolutions`.
- `try/catch/finally` amb `finally { setLoadingPeers(false) }`.

### `useEffect` de càrrega

- Es dispara quan `activeTab === 2 && unlocked === true`.
- Depèn de `[activeTab, unlocked, courseId, lessonId]`.

### Render de la pestanya 2

- **Abans**: Llegia de `localStorage` (`mooc_submissions_...`) i filtrava l'usuari actual.
- **Ara**: Mostra les dades de `peerSolutions` provinents de l'API.
  - Mentre carrega: `CircularProgress` centrat.
  - Si buit: missatge "Encara no hi ha solucions d'estudiants."
  - Si amb dades: targeta per cada solució amb nom (`s.user?.name || s.username || s.studentName || ...`) i codi (`s.code || s.content || s.source_code`).

---
<br>


## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)

### Problema

- **LessonPage** guarda el progrés amb clau `${courseId}_${problemSlug}` (sub-topic slug).
- **CourseLessons** comprovava `progress[`${courseId}_${lesson.id}`]` on `lesson.id` és el **topic slug** (diferent del problemSlug).
- Resultat: el checkmark ✅ no apareixia mai a CourseLessons després de completar una activitat.

### Solució

- Afegit `isLessonCompleted(lesson)` que inspecciona els `subTopics` de la lliçó i comprova si **algun** té progrés (`problemSlug || sub.slug`).
- Si la lliçó no té subTopics, fa fallback a la clau antiga (`lesson.id`).
- Substituïts els 4 `progress[`${courseId}_${lesson.id}`]` per `isLessonCompleted(lesson)`:
  - Sidebar esquerra (línia 142)
  - Drawer mòbil (línia 227)
  - Columna central — títol de lliçó (línia 304)
  - Panell dret "On this page" (línia 413)

### Problema

- El contingut central barreja teoria (markdown, exemples) amb el botó "Anar a l'activitat".
- L'usuari volia una separació clara entre **Temari** (contingut de lectura) i **Laboratoris** (accés a les activitats pràctiques).

### Solució

- Afegit `contentTab` state (0 = Temari, 1 = Laboratoris).
- Afegides pestanyes MUI `Tabs` / `Tab` al contingut central, després de la descripció del curs.
- **Pestanya 0 (Temari)**: Mostra la teoria del tema seleccionat al sidebar (títol, sub-topics amb markdown, exemples de codi). S'ha tret el botó "Anar a l'activitat" d'aquesta vista.
- **Pestanya 1 (Laboratoris)**: Llista **tots** els temes del curs (sense filtrar per `activeId`). Cada element mostra:
  - Icona d'estat: ✅ (completat) o 💻 (pendent)
  - Títol del tema i subtítol del sub-topic
  - Botó "Anar a l'activitat" (o "Revisar" si completat)
  - Fons verd translúcid si completat, transparent si pendent

### Tabs mogudes del centre al sidebar

- **Abans**: Les pestanyes Temari / Laboratoris estaven a la columna central, després de la descripció del curs.
- **Ara**: Estan dins la **LEFT SIDEBAR**, sota on hi havia el títol "SYLLABUS". S'ha eliminat el títol i la icona del llibre.

### Sidebar condicional

- `contentTab === 0` (Temari) → acordions del syllabus (comportament original).
- `contentTab === 1` (Laboratoris) → llista d'activitats amb enllaços directes (`RouterLink`), agrupades per temari, amb indicador ✅ / 💻.

### Columna central sempre visible

- **Abans**: La columna central alternava entre teoria (contentTab === 0) i llista d'activitats (contentTab === 1).
- **Ara**: Mostra **sempre** la teoria del tema seleccionat, independentment de la pestanya activa al sidebar.

### Scroll amagat sota el header

- Quan l'usuari feia clic a un temari o sub-topic al sidebar, `scrollIntoView` posicionava l'element al **top: 0** del contenidor, quedant amagat sota el header fix (`top: 64`).
- **Solució**: afegit `scrollMarginTop: '80px'` a:
  - El `motion.div` de cada lliçó (`id="lesson-{id}"`)
  - El `Box` de cada sub-topic (`id="sub-{lesson.id}-{i}"`)

### Padding dret condicional

- Quan el panell dret (`showRightPanel`) està obert (300px width, `position: fixed`), el text de la columna central quedava amagat sota seu.
- **Solució**: afegit `paddingRight: showRightPanel ? '310px' : '0px'` al `motion.div` del contingut central, amb transició suau.

## 1. Tercera pestanya "Tests"
- Afegit un tercer `<Tab>` amb label `t('lesson.tab_tests', 'Tests')` al sidebar.
- `contentTab === 2` mostra només els problemes amb `type === "test"`, amb icona 📝.
- Enllaça a `/courses/${courseId}/${sub.problemSlug || sub.slug || temari.id}`.
- La pestanya **Tests** (`contentTab === 2`) mostra problemes amb `type === "test"` (📝), enllaçant a `/courses/${courseId}/${problemSlug}`.
- Descartat l'ús de l'endpoint `GET /courses/{slug}/challenges/` per donar **401 Unauthorized** (pendent d'investigar).

## 2. Filtrat per tipus a Laboratoris i Tests
- **Laboratoris** (`contentTab === 1`): ara només mostra subTopics amb `type === "coding"` (💻).
- **Tests** (`contentTab === 2`): només mostra subTopics amb `type === "test"` (📝).
- Si un tema no té subTopics del tipus corresponent, s'oculta.

## 3. CheckCircle2 per subtopic al Temari
- A la pestanya **Temari**, cada subtopic mostra un `CheckCircle2` verd si està completat (segons `progress`).
- Eliminat el `CheckCircle2` del header de l'acordió (a nivell de lliçó).
- Eliminat el `CheckCircle2` del títol de lliçó a la columna central.

## 4. Tipus d'API
- `type` del problema pot ser `"coding"` o `"test"`.
- `problemSlug` s'usa com a clau de progrés: `${courseId}_${problemSlug}`.

## 5. Tests amagats al Temari i columnes
- A la pestanya **Temari** (`contentTab === 0`), els subTopics amb `type === "test"` es filtren (`filter(s => s.type !== 'test')`) per no mostrar-los com a contingut de lectura.
- També s'ha afegit el mateix filtre a la **columna central** (Reading Content) i al **panell dret** (Anchor Links), perquè els tests no apareguin com a seccions de teoria.

---
<br>

## CourseExpandedContent.tsx (`src/features/student/CourseExpandedContent.tsx`)
 
### Layout: de llista vertical a columnes horitzontals per topic
 
- **Abans**: `getCourseTopics(course).map(...)` es renderitzava dins d'un `Stack` vertical, apilant tots els topics un sota l'altre en una única llista amb scroll vertical.
- **Ara**: Els topics es renderitzen en un `Box` amb `display: 'flex', flexDirection: 'row', overflowX: 'auto'`, mostrant **una columna per topic** en horitzontal (amb scroll horitzontal si no caben totes a la pantalla).
- Cada columna de topic té:
  - Títol del topic a dalt (`Typography variant="subtitle1"`, color `primary.main`).
  - Les seves `lessons` apilades en vertical a sota, amb scroll propi (`maxHeight` + `overflowY: auto`) per no allargar tota la card si un topic té moltes lliçons.
  - Separador visual (`borderRight`) entre columnes, excepte a l'última.
### Mida del desplegable controlable
 
- Afegides dues constants a dalt del fitxer per controlar fàcilment la mida sense buscar-ho al JSX:
```ts
  const DROPDOWN_WIDTH = { xs: '90vw', sm: '85vw', md: '900px', lg: '1100px' };
  const DROPDOWN_MAX_HEIGHT = { xs: '220px', md: '260px' };
```
  - `DROPDOWN_WIDTH` → amplada total de la card desplegable.
  - `DROPDOWN_MAX_HEIGHT` → alçada màxima de la zona de lessons (amb scroll) dins de cada columna de topic.
### Amplada: ja no limitada per la columna del Grid
 
- **Abans**: el contenidor tenia `left: 0, right: 0`, cosa que forçava el desplegable a l'amplada exacta de la seva columna al `Grid` (~25% de l'ample, molt estret).
- **Ara**: s'ha tret el `right: 0` i s'ha posat `width: DROPDOWN_WIDTH` (amb `maxWidth: '95vw'` de seguretat), permetent que el desplegable s'expandeixi cap a la dreta per sobre de les altres targetes de curs.
### Estètica
 
- Afegit `boxShadow` al contenidor per destacar-lo visualment per sobre de la resta del contingut.
- Icones d'estat (`CheckCircle2` / `PlayCircle`) i tipografia dels items reajustades per mantenir-se llegibles amb la nova mida compacta.


<br>


## CourseService.ts (`src/services/courseService.ts`)
- **`submitChallenge(courseSlug, challengeSlug, code)`** — POST `/courses/{courseSlug}/challenges/{challengeSlug}/submissions/` per enviar una resposta.
- **`getChallenge(courseSlug, challengeSlug)`** — GET `/courses/{courseSlug}/challenges/{challengeSlug}/` per obtenir les dades d'un challenge/examen.
- **`getChallengeSubmissions(courseSlug, challengeSlug)`** — GET `/courses/{courseSlug}/challenges/{challengeSlug}/submissions/` per llistar submissions d'un examen.
- **`getChallengeGrades(courseSlug, challengeSlug)`** — GET `/courses/{courseSlug}/challenges/{challengeSlug}/submissions/grades/` per llistar notes d'un examen.
- **`getPeerSubmissions(courseId, lessonId)`** — GET `/courses/{courseId}/topics/{lessonId}/problems/{lessonId}/submissions/peers/`


<br>

## ExamPage.tsx (`src/pages/courses/ExamPage.tsx`)
- Pàgina d'examen per a estudiants a la ruta `/courses/:courseId/exam/:challengeSlug`.
- Carrega l'examen des de `course.content` (per `problemSlug`) o via `getChallenge()`.
- **Layout**: grid 2 columnes `1fr 2fr` (enunciat esquerra, opcions dreta), `maxWidth: 1400`.
- **Opcions**: renderitzades amb `textHtml` (HTML directe). Si `window.EXAM_DATA[challengeSlug]` existeix, usa les seves `options` (mapejades a `{ id, is_correct, textHtml }`).
- **Multiresposta**: detectat amb `choices.filter(c => c.is_correct).length > 1`. Radio buttons (single) o Checkboxes amb FormGroup (multi).
- **Grid d'opcions**: si `choices.length > 6`, es mostren en 2 columnes (`gridTemplateColumns: '1fr 1fr'`).
- **Navegació**: botons "← Anterior Pregunta" i "Següent pregunta →" dins del mateix topic. "Enviar" només habilitat a l'última pregunta (`!!nextTest`).
- **Dificultat**: icona `Zap` amb color (verd/groc/vermell) segons `exam.difficulty`.
- **Progrés**: al submit, guarda `mooc_global_progress_${studentId}[${courseId}_${challengeSlug}] = true` i dispara `lessonProgressUpdated`.
- **Resultat**: mostra confirmació/error i `grade`/`comment` si la API els retorna.
- **Estat**: `selectedAnswers: string[]`, `submitting`, `result`, `submissions`.
- **Timer**: eliminat (abans tenia countdown de 60min amb Chip, Clock, AlertTriangle).
- **Evolució**: inicialment era TextField multiline, navegació plana entre tots els tests, timer visible.

## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)
- (sense canvis recents, rep l'esdeveniment `lessonProgressUpdated` per refrescar el checkmark)

## public/data.js
- Clau `"python_test"` → `"python"` per coincidir amb `problemSlug`.

# Fix 3 — Peticions innecessàries (cada pàgina demana només el que mostra)
**Branca:** `perf/scoped-data-fetching`

## Problema

L'app demanava dades que la pàgina no mostrava:

- **Pantalla de login** (`/dashboards/student` sense sessió): llista de cursos públics + el detall complet de cada curs públic (curs + temes + els problemes de cada tema) + les dades del registre.
- **Després del login**: el detall complet de **tots** els cursos (assignats i públics), encara que només se'n veu un. La pantalla no es mostrava fins que arribaven tots.
- **Qualsevol pàgina sota `MainLayout`**: prefetch global de `GET /courses/`.
- **Pàgina del curs**: les dues llistes de cursos (només serveixen per al selector) i la teoria (`GET /topics/<slug>/`) de **tots** els temes, encara que només se'n veu un.
- **Portada**: en passar el ratolí per sobre d'una targeta es baixava el detall complet del curs.
- **Professor** (`Students`, `TeacherLeaderboard`): detall complet de cada curs, que no es feia servir.

L'origen comú és `courseService.getFullCourseDetail(slug)`, que fa **2 + N** peticions (curs, temes i una de problemes per tema) i es cridava per a cursos que no calien.

## Regla

> Cada pàgina demana (amb `enabled` de React Query) només les dades que mostra. Res es precarrega "per si de cas". El detall complet només es demana per al curs que s'està veient.

## Canvis (fase 1, només frontend)

| On | Abans | Ara |
|----|-------|-----|
| `MainLayout` | prefetch de `GET /courses/` a cada pàgina | res |
| `StudentDashboard` sense sessió | llistes + detall de tots els cursos públics | res |
| `StudentDashboard` amb sessió | detall de tots els cursos | «els meus cursos» + públics només si és l'àmbit actiu o s'obre el menú + detall **només del curs seleccionat** (el de recordat, sense baixar abans el del primer tab) |
| `Login` | `GET /auth/register/options/` en carregar | només en obrir el formulari de registre |
| `CourseLessons` | les dues llistes + teoria de tots els temes | llista de l'àmbit del curs (recompte del botó), l'altra en obrir el selector; teoria només del tema obert |
| `CourseCard` (portada) | prefetch del detall en `hover` | res |
| `Students`, `TeacherLeaderboard` | detall de cada curs (sense ús) | només les llistes |

Mesurat amb Playwright i una API simulada (5 cursos, 5 temes per curs):

| Pas | Abans | Ara |
|-----|------:|----:|
| Obrir la pantalla de login | 16 | 0 |
| Fer login → dashboard | 38 | 11 |
| Obrir un curs (pestanya Teoria) | 15 | 9 |
| Obrir un problema (càrrega directa) | 8 | 7 |

## Fase 2: endpoints nous i modificats del backend

PRs d'`algorien`: ibci/algorien#302 (`my_solution`), ibci/algorien#303 (resum per tema), ibci/algorien#304 (`my_role`, `course_score`), ibci/algorien#305 (`GET /courses/{c}/problems/`).

| On | Abans | Ara |
|----|-------|-----|
| Estructura del curs (`getFullCourseDetail`) | curs + temes + **una llista de problemes per tema** (2 + N) | curs + temes + `GET /courses/{c}/problems/` (**3**, siguin quants siguin els temes) |
| Progrés (curs, temes, tests) | només el de `localStorage` d'aquest navegador | `my_solution` de cada problema: es porta al magatzem local (el que llegeix la UI) en carregar l'estructura; mai rebaixa un estat local més nou |
| Tests d'un tema (`syncTopicAnswers`) | un `GET …/submissions/` per test respost | cap: la resposta pròpia ve a `my_solution` |
| Pestanya Tests del curs | tornava a demanar la llista del tema | res (ja ve amb l'estructura) |
| `LessonPage` | l'enunciat venia dins del detall complet | `GET …/problems/{p}/` només del problema obert |
| Punts després d'enviar | `GET /courses/` + leaderboard amb fins a 5 reintents | `course_score` de la resposta de l'enviament |
| Punts al dashboard | es buscava l'alumne al leaderboard per nom | la fila `me` del leaderboard |
| Rànquing del dashboard | només si el curs era a «els meus cursos» | segons `my_role` del curs |
| Estadístiques (`RendimentDashboard`) | detall complet (2 + N) i la mitjana de la classe **inventada amb `Math.random`** | `GET …/statistics/` (mitjana real) + `GET …/topics/` (problemes i progrés per tema): 2 |

**Compatibilitat:** fins que no es despleguin els PRs, el frontend funciona igual amb el backend actual. Si `GET /courses/{c}/problems/` respon 404, torna a la càrrega per tema. Sense `my_solution`, sincronitza els tests com abans. Sense `course_score`, consulta el leaderboard com abans. Sense `my_role`, mira la llista de cursos propis.

Mesurat amb Playwright contra un `algorien` local amb els 4 PRs (3 cursos de 5 temes, 3 problemes per tema):

| Pas | Fase 1 | Fase 2 |
|-----|------:|----:|
| Fer login → dashboard | 11 | 6 |
| Obrir un curs (càrrega directa) | 9 | 5 |
| Pestanya Tests | 2 | 0 |
| Obrir un problema (càrrega directa) | 7 | 4 |
| Estadístiques | 7 | 2 |
| Enviar un test | 3 | 1 |

Amb el backend actual (sense els PRs) les mateixes pàgines funcionen, amb les peticions de la fase 1 més un 404 per càrrega de curs.

## Dades locals: què es queda al navegador

`localStorage` és del navegador, no de l'usuari: qui faci servir el mateix ordinador (p. ex. una aula) el comparteix, i qualsevol script de la pàgina el pot llegir.

| Problema | Ara |
|----|----|
| Esborranys de codi (`code_<id>_…`): es quedaven en sortir; el següent alumne podia copiar les solucions | s'esborren en sortir, en entrar (algú pot tancar sense sortir) i en caducar la sessió. El codi Python es desa al servidor (`…/submissions/backup/`, amb el desament automàtic de cada 10 s) i es recupera en obrir el problema si no n'hi ha cap còpia local, també des d'un altre dispositiu |
| `mooc_submissions_<curs>_<problema>`: nom i codi de cada alumne que enviava, que no es llegia enlloc | ja no s'escriu; els que hi hagi s'esborren igual que els esborranys |
| «Continuar estudiant» i el curs recordat del dashboard eren compartits | per usuari (`mooc_last_session_<id>`, `mooc_dashboard_last_course_<id>`) |
| El preview de React executava el codi de l'alumne dins la pàgina: podia llegir el token de sessió | s'executa en un iframe aïllat (`preview.html`, `sandbox="allow-scripts"`, origen opac): `localStorage` hi dona `SecurityError`. Els scripts del preview es demanen amb CORS, per això `/assets/*` porta `Access-Control-Allow-Origin: *` (Netlify, Vercel) i Vite accepta l'origen `null` |

Es queden: el progrés, els punts i la ratxa (per usuari, no revelen res, i la teoria marcada com a llegida i la ratxa només existeixen aquí), el tema i l'idioma. Els esborranys de React (només de prova, el backend només avalua Python) es perden en sortir.

Comprovat amb Playwright contra un `algorien` local: el codi de prova que llegeix el token rep `SecurityError`; després de sortir no queda cap esborrany ni resposta; un altre usuari no veu el «continuar» del primer; tornant a entrar, l'esborrany Python surt del servidor.

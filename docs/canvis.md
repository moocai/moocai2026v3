
---

# 01/10/2026

## Box CLASSIFICACIÓ connectat a `GET /courses/{slug}/students/overview/`

### El que hi havia
El box existia però era una **maqueta**. `top3Ranking` venia de `rankedStudentsByCourse`, un `useMemo` que retornava `[] as Student[]` sense fer cap crida a l'API, i els punts de cada fila es calculaven al client amb `getCoursePoints(currentCourse, s.id)`, és a dir `activitats superades × 10` llegides del `localStorage`. Per tant el box era sempre buit, i encara que s'haguessin omplert les files haurien sigut només els alumnes del navegador local, no els del curs.

### Servei: `getStudentsOverview` (`src/services/courseService.ts`)
Mètode nou al mateix `apiClient` que la resta del servei (`baseURL` amb `/api/v1`, `Authorization: Token` via l'interceptor):

```ts
async getStudentsOverview(courseSlug: string): Promise<any[]> {
  const { data } = await apiClient.get(`/courses/${courseSlug}/students/overview/`);
  return Array.isArray(data) ? data : (data.results || []);
}
```

La normalització és la mateixa que a la resta de mètodes (`getCourseTopics`, `getChallengeSubmissions`...): si el dia que l'endpoint passi a paginar, els consumidors no s'hauran de tocar.

### Mapeig `toRanking`
`RankedStudent = { id, name, points }` i `toRanking(data)` tradueixen la resposta de l'API a files del leaderboard i les ordenen descendent per punts.

- El helper `firstNumber(row, keys)` fa la conversió tolerant: prova les claus en ordre, salta els valors `null`/`undefined` i els que donen `NaN`, i torna `0` si cap serveix. És el que permet que `score`, que arriba com a **string**, acabés sent un número sense tocar res més.
- Els noms reals de l'endpoint són `user_id`, `username` i `score`. La resta de claus (`points`, `total_points`, `total_score`, `stars`, `grade` per als punts; `name`, `full_name`, `first_name` per al nom) són **defensives**, per si el backend els renombra.
- L'endpoint retorna molt més del que consumeix el box (`last_submission`, `hints_total`, `hints_today`, `topics[]`, `challenges{}`). De moment només es llegeix `score`; la resta queda disponible per ampliar el box sense cap crida nova.
- El `row?.user ?? row` del mapeig és un residu de l'escritura inicial: l'endpoint retorna camps plans, no un objecte `user` anidat. No fa mal, però no serveix per a res amb aquesta resposta.

### Càrrega i renderitzat
- Estat `ranking` + `useEffect` amb dependències `[currentSlug, selectedStudentId]`, de manera que el ràquing torni a carregar quan canvia el curs de la pestanya o l'alumne connectat.
- Bandera `cancelled` al cleanup: sense ella, una resposta lenta del curs anterior podria sobreescriure el ranking del curs nou.
- Sense `currentSlug` o sense alumne connectat, `setRanking([])`.
- El `catch` buida la llista en lloc de propagar l'error: el box mostra `dashboard.no_data` i el dashboard no es tren mai.
- Es mostren els 3 primers (`ranking.slice(0, 3)`), com abans.

### Ull de gall per a l'alumne connectat
L'avatar es posa en blau (`primary.main`) si `s.id === selectedStudent?.id` **o** `s.name === selectedStudent?.name`.

La comparació pel nom és deliberada, no un residu: `selectedStudent.id` ve de `data.user.id` del login i `user_id` de l'overview, i no sempre coincideixen (tipus diferents, o el login d'un compte diferent al del curs). Sense el segon `||`, l'alumne connectat no s'havia de veure mai destacat al seu propi ràquing.

### Net
`getCoursePoints` i `rankedStudentsByCourse` s'han esborrat: eren codi mort que ja no tenia cap consumidor.

## Més estadístiques del dashboard (`src/pages/dashboards/StudentDashboard.tsx`)

El box "Més estadístiques" només tenia 3 mètriques. N'hi ha afegit 2 que ja tenien les dades disponibles sense cap consulta nova:

| Mètrica | Valor | Origen |
|---|---|---|
| Problemes de programació | `codeDone/codeTotal` | Activitats de codi superades / total del curs |
| Tests correctes | `testRate` (%) | Activitats de test superades / total, en percentatge |

- `isTestLesson` ja existia (la feia servir el `getTopicSummaries` dels dos boxes de temes del resum), de manera que separar codi i test aquí no ha requerit lògica nova.
- `stats` passa de 3 a 6 claus. L'`empty` s'ha extret a una constànta a dalt del `useMemo` perquè el `return` d'early-exit no quedi escrit dues vegades.
- L'ordre a la UI és ratxa, taxa d'èxit, codi, tests, temps restant. Els números dels comentaris (`// 1.` … `// 5.`) reflecteixen l'ordre en què s'han anat pensant les mètriques, **no** l'ordre final de pantalla.

### Retirada posterior de «Ratxa» i «Taxa d'èxit» del box

Al final del dia s'han esborrat del box els dos blocs de **Ratxa** i **Taxa d'èxit** (files `// 1.` i `// 2.`), deixant 3 files visibles:

| Fila | Comentari | Valor |
|---|---|---|
| Problemes de programació | `// 4.` | `stats.codeDone / stats.codeTotal` |
| Tests correctes | `// 5.` | `stats.testRate` % |
| Temps restant | `// 3.` | `stats.remainingHours` h |

- Els valors **no s'han eliminat**: `streak` i `successRate` segueixen calculant-se al `useMemo` i retornant-se a `stats`, però ja no es renderitzen → són dades mortes. `useEffect` separat (línia ~370) encara calcula `streak` des de `mooc_streak_${id}` i `getStreakDays`. Es pot netejar el `stats` retornant només `remainingHours`, `codeDone`, `codeTotal` i `testRate`.
- Els números dels comentaris han quedat **desordenats** (4, 5, 3) perquè conserven la numeració original; convindria renumerar-los.
- Amb menys files, es pot revertir el `spacing` del Stack a l'original i tornar les icones a `30` px.
- EnBloc original hi havia icones que es van quedar sense usar (`WhatshotIcon` de la ratxa i `CheckCircleOutlinedIcon` de la taxa d'èxit) i que s'han eliminat dels imports.

## Timeouts dels clients HTTP (`src/services/api.ts`, `src/services/courseService.ts`)

Valors finals en el moment de tancar el dia (01/10/2026):

| Fitxer | Original (HEAD `2257d40`) | Valor inicial del dia | **Valor final** |
|---|---|---|---|
| `api.ts` | 3000 ms | 1000 ms | **3000 ms** |
| `courseService.ts` | 3000 ms | 20000 ms | **10000 ms** |

Van en sentits oposats i no sembla una decisió presa, sinó dos ajustos per separat.

El de `courseService` sí que té sentit: `getFullCourseDetail` encadena una petició de curs + una per tema + una per problema, i amb 3 s el dashboard es quedava a mitges en cursos amb molts temes. Els 10 s són un valor raonable.

El d'`api.ts` s'ha acabat deixant a **3000 ms**, és a dir al seu valor original, sense canvi net respecte a HEAD. Ennio s'ha passat per 1000 i fins a 100 ms, però es va descartar tot: `api.ts` és pràcticament localStorage i l'única crida HTTP real és `inviteUser` (`POST /users/invite/`), que amb 100 ms expirava de manera sistemàtica. Ara que el valor és el de partida, no queda res pendent aquí.

(`getStudentProgress` no pateix aquest timeout: és una lectura directa de localStorage, sense petició axios.)

## Detalls tècnics i pendents (tancament del dia)

- **Les modificacions no estan commitejades.** `git status` deixa `src/pages/dashboards/StudentDashboard.tsx`, `src/services/api.ts` i `src/services/courseService.ts` modificats fora del darrer commit, que és `2257d40 stats` (d'avui mateix a les 13:55). El `mr: -5` a la caixa de navegació desktop del `Header.tsx` sí que forma part d'aquest commit.
- **Noves claus i18n que no existeixen.** `dashboard.code_correct` i `dashboard.tests_correct` no estan a `ca.ts`, `es.ts` ni `en.ts`. Els dos textos es criden amb valor per defecte a la línia del `t()` (`t('dashboard.code_correct', 'Problemes de programació')`), de manera que **amb la interfície en anglès o castellà es veuran en català**. Cal crear les claus als tres fitxers i treure el valor per defecte.
- **`console.debug` temporal pendent d'esborrar.** L'efecte del leaderboard en deixa un a `students/overview`, marcat com a temporal per mirar els noms reals dels camps. Un cop confirmats, fora.
- **`score` arriba com a string** i es converteix amb `Number()`. Si el backend arriba a enviar-lo amb separador de milers o en format `"1.234,56"`, `Number()` donaria `NaN` i la fila cauria a 0 punts. `parseFloat` tampoc ho arreglaria; el que caldria és demanar `score` com a número al backend.
- **L'endpoint és "Professor only" i es crida des del dashboard de l'alumne.** Amb token d'alumne ha de respondre `403`, i el `catch` deixa el box en "no data" sense avisar. Si la classificació ha de sortir als alumnes, cal un endpoint equivalent sense restricció de rol, o una permissió nova al backend.
- El box només fa `top 3`. L'endpoint ja retorna la llista completa i ordenada per l'alumne mateix, de manera que passar a top 5 o 10 és `slice(0, N)`.
- Verificació: `npx tsc --noEmit` net. `npx vite build` **no** s'ha executat en aquestes modificacions pendents.

---

## Imports de `StudentDashboard.tsx` — consolidados

Aprofitant la mateixa sessió, s'han unificat els imports del fitxer: **15 línies → 2**.

| Abans | Ara |
|---|---|
| `Grid` en un `import { Grid } from '@mui/material'` separat | Fusionat dins el barrel de `@mui/material` (export verificat a `node_modules/@mui/material/index.d.ts:107`) |
| 13 línies `import { Ic } from '@mui/icons-material/Ic'` individuals | Un sol `import { Ic1 as I1, Ic2 as I2, … } from '@mui/icons-material'` amb àlies |

- Precedent: `components/Header.tsx:3` ja feia exactament aquesta consolidació amb àlies, de manera que ara `StudentDashboard` segueix el mateix criteri.
- Les rutes per-component de `@mui/icons-material` no tenien avantatge: Vite les resol igual i el barrel evita 13 línies de soroll.
- Corregit de pas un espai que faltava després d'una coma a la línia 4 de l'import d'icones.
- En registrar els imports, `WhatshotIcon` i `CheckCircleOutlinedIcon` han quedat sense usar (vegeu la secció de «Més estadístiques») i s'han eliminat de la llista d'imports.
- `npx tsc --noEmit` segueix passant net després del canvi.

---

# 06/10/2026

## fix1 aplicat — peticions fallides resoltes (6/10/2026)

`docs/fix1.md` té 9 files a la taula «Changes»; **totes aplicades** sobre aquest repo. L'estat detallat és a la secció final de `docs/fix1.md`; aquí només els que encara no tenien apunt:

| Fix | Què s'ha canviat |
|---|---|
| Llista de cursos sense sessió | `courseService.getAllCourses()` retorna `[]` **sense petició** si no hi ha `token` (no es cacheja); `MainLayout` empassa els errors del prefetch (`.catch`). |
| Leaderboard només per cursos propis | `StudentDashboard.loadRanking` només demana `students/overview` si el curs és dels **assignats**; `pointsSync.refreshCoursePoints` salta els cursos no propis i deixa de reintentar en 4xx. |
| Avatar propi des de `/users/me/avatar/` | Nou `myAvatarUrl()` a `avatarCache` amb clau `?u=<id>` (navegador compartit no mostra l'avatar anterior); Header i dashboard hi apunten (abans `/users/<id>/avatar/` → 404/403). |
| No re-demanes avatars 403/404 | `avatarCache` recorda els 403/404 per sessió; `invalidateImage()` els oblida (xarxa i 5xx, no). |
| Revisió IA | `AiHelpPanel` usa `api.get` (client compartit), el slug real del tema (`topicSlug` des de `LessonPage`) i llegeix `review_text`. |
| Fallback de l'examen | `ExamPage` ja no crida `getChallenge` amb el topic buit (`/topics//problems/<slug>`). |
| `getChallengeGrades` | Eliminat de `courseService` i de les seves files de `docs/`. |
| Comptador de la portada | Secció «TODO(stats)» de sota (decisió + `usePublicStats`). |

### Verificació
- `npm run build` (`tsc -b` + `vite build`) correcte. **No s'ha executat** el recorregut E2E en Chromium que descriu `fix1.md` (23 → 5 peticions fallides).

## React Query a la portada i al dashboard + prefetch al `MainLayout`

Refactor que mou la càrrega de cursos (llistes i detalls) a React Query, dedicat a `docs/fix1.md`:

- **`src/hooks/useCourses.ts`** (nou): `useAllCourses()` → `['courses']`, `usePublicCourses()` → `['public-courses']`, `useCourseDetail(slug)` → `['course', slug]` (**mateixa key** que `useCourse`, així la cache es comparteix), i els prefetch `prefetchAllCourses` / `prefetchCourseDetail`. Llistes: `staleTime 5min`. Detalls: `staleTime 30min`, `gcTime 60min`.
- **`src/layouts/MainLayout.tsx`**: el prefetch va **a la cache de React Query** (abans omplia només la cache en memòria de `courseService`). Resultat: una única petició per curs encara que s'obri des de la portada, el dashboard o `CourseLessons`, i la primera visita a un curs ja no retorna `isLoading`.
- **`src/pages/Home.tsx`**: `useAllCourses(isLoggedIn)` en lloc de `useState`+`useEffect` + caches a mà; invalidació de `['courses']` als esdeveniments `authChange`/`storage`/`visibilitychange`.
- **`src/pages/dashboards/StudentDashboard.tsx`**: `useAllCourses()` + `usePublicCourses()` + `useQueries(['course', slug])` per als detalls (helper de mòdul `withCourseDetail` per muntar els `topics`), amb `loadedDetailCount` com a senyal estable per al memo de `detailBySlug` (evita bucles de re-render). El rànquing es carrega en funció de `assignedQuery.data`. Als `auth-state-change` s'invaliden llistes i detalls **i** es crida `courseService.clearCache()`, perquè segueixen existint dues caches (React Query + memòria del servei).
- Detall net: les dependències mortes de `getAllCourses` (versió antiga amb caches per rol) han desaparegut.

### Verificació
- `npx tsc --noEmit` net i `npm run build` correcte.

## TODO(stats) — comptador de la portada decidit i reactivat

`docs/fix1.md` deixava el "comptador d'estadístiques" pendent de decisió. Decisió del dia:

- **Què compta**: el nombre d'**alumnes actius** de la plataforma; és una **xifra pública** (no requereix sessió).
- **Endpoint**: `GET /api/v1/public/stats/` → `{ students: number }` (**encara no existeix** al backend).
- **`src/hooks/usePublicStats.ts`** (nou): `useQuery(['public-stats'])` amb `enabled = VITE_ENABLE_PUBLIC_STATS === 'true' | '1'`. Com que l'endpoint no existeix, la crida **només s'activa quan la variable d'entorn es marca**: la portada no fa cap petició que retorni 404 per defecte.
- **`src/services/statsService.ts`**: reescrit sobre el client compartit de `api.ts` (`api.get('/public/stats/')`). `getStudentCount()` retorna `number | null` (null si falla o si `students` no és un nombre finit), sense llançar.
- **`src/components/Hero.tsx`**: la fila d'estadístiques es reactiva; `usePublicStats()` alimenta `hero.stats.students`. Si l'estadística no està habilitada o falla, `isEnabled` és fals i es mostren 2 entrades (cursos, 24/7) en lloc de 3 — la xarxa mai no queda checkejant un endpoint inexistent.


## Timeouts actuals del clients HTTP

Els valors reals al codi el 6/10/2026 han canviat respecte als anotats l'1/10 (3000/10000 ms). ⚠️ Aquesta taula és **anterior a fix2**; els valors definitius són als de la secció «fix2 aplicat» de sota (`profileService` passa a 100000 ms en usar l'`apiClient`).

| Servei | Timeout (pre-fix2) |
|--------|----------------|
| `api.ts` (`apiClient`, `inviteUser`, `api.get`) | **100000 ms** |
| `courseService.ts` | **100000 ms** |
| `authService.logout` | **5000 ms** (només aquesta crida) |
| `authService` (resta) · `register` · `profileService` | sense timeout |

Actualitzat a `docs/apis.md` i `docs/project.md`.

## fix2 aplicat — client únic, token revocat i sense `code` desat (6/10/2026)

`docs/fix2.md` descriu tres canvis; tots tres aplicats sobre aquest repo. `npm run build` (`tsc -b` + `vite build`) correcte.

### 1. No desar la contrasenya a `localStorage`
- `src/pages/dashboards/StudentDashboard.tsx`: `handleLogin` ja no escriu cap `code` a `currentStudent`.
- `src/features/student/types.ts`: `Student.code` ara és **opcional** (`code?: string`). L'únic consumidor, `validatePin()` a `validators.ts`, ja acceptava `code?` i és **orfè**.
- ⚠️ Diferència amb l'original: en aquest repo el valor desat era `code: '***'` (mascareta), no la contrasenya en clar.

### 2. Client únic + gestió de 401
- **Nou `src/services/httpClient.ts`**:
  - `apiClient` (`baseURL: ${VITE_API_URL}/api/v1`, `timeout: 100000`): interceptor de petició amb `Authorization: Token <token>`; interceptor de resposta que, davant d'un **401 provocat pel token actual**, neteja `token` + `currentStudent` i dispara `auth-state-change`. Un **401 tard d'un token antic** es descarta perquè `sentToken !== currentToken`.
  - `publicClient` (mateix `baseURL`, **sense timeout**): no envia token; l'usen login i registre.
- Refactoritzats a sobre: `api.ts`, `courseService.ts`, `profileService.ts` (abans axios pla + `authHeaders()` manual), `register.ts` i `authService.login`. `statsService` i `AiHelpPanel` en surten beneficiats via `api.get`.
- **Eliminat el `Content-Type: application/json` global** d'`api.ts` i `courseService.ts`; axios ja fixa JSON per a objectes i multipart per a `FormData`.
- URLs de `profileService`/`register` passades a **relatives** (`/users/me/settings/`, `/orgs/`, `/users/me/avatar/`, `/users/register/`) per combinar-se amb el `baseURL` del client compartit (abans el `/api/v1` anava dins la constant).

### 3. Revocar el token al sortir
- `src/services/authService.ts`: `logout()` llegeix el `token` **abans** de netejar-lo, esborra `token` + `currentStudent` de seguida i després envia `POST /users/auth/logout/` amb `Authorization: Token <token>` **explícit** i `timeout: 5000 ms`.
- Abans la petició sortia **sense header** (per tant mai no arribava a revocar res) i tot i així es llençava després de buidar la sessió. `logout()` mai no llança.

### Timeout actuals (canvi respecte a la taula anterior)

| Client / crida | Timeout |
|--------|---------|
| `apiClient` (`api.ts`, `courseService`, `profileService`, `statsService`) | **100000 ms** |
| `publicClient` (login, registre) | sense timeout |
| `authService.logout` | **5000 ms** |

`profileService` passa de «sense timeout» a **100000 ms** perquè ara comparteix l'`apiClient`.

### Verificació
- `npm run build` (`tsc -b` + `vite build`) correcte.
- **No s'han executat** les proves automàtiques («9/9») ni l'assaig en Chromium que descriu `fix2.md`: aquest repo no té infraestructura de tests ni backend local.
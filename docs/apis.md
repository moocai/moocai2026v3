# API Reference — MOOC React 2026
**Última actualització: 6 d'octubre de 2026**

Aquest document recull **totes les APIs REST** que consumeix l'aplicació frontend. El projecte **no té backend propi**; es connecta a una API externa allotjada a `https://algorien.com`.

> **Aplicat sobre aquesta referència:** `docs/fix1.md` (peticions fallides: stats, leaderboard, avatars, revisió IA, `getChallengeGrades`) i `docs/fix2.md` (client únic `httpClient.ts`, gestió de 401 i revocació del token al sortir). L'estat de cadascun és a la secció final de cada fitxer.

---

## 0. Convencions generals

- **Base URL:** `https://algorien.com/api/v1` (tots els serveis hi apunten).
- **Variable d'entorn:** `import.meta.env.VITE_API_URL || ''`. ⚠️ No hi ha cap fitxer `.env`, així que el valor és sempre `''` i totes les URLs surten **relatives** (`/api/v1/...`).
- **Proxy dev:** `/api` → `https://algorien.com` (`vite.config.ts`, `changeOrigin: true`).
- **Redirect prod:** `/api/*` → `https://algorien.com/api/:splat` (`netlify.toml`, 200).
- **Autenticació:** DRF **TokenAuthentication**. Header `Authorization: Token {token}`. El token es desa a `localStorage.token`.
  - Tot el tràfic HTTP passa per **`src/services/httpClient.ts`**, que exporta dos clients:
    - **`apiClient`** → interceptor de petició que afegeix `Authorization: Token <token>`. Gestió de **401**: si el provoca el **token actual** (caducat), es neteja la sessió local (`token`, `currentStudent`) i es dispara `auth-state-change`; un **401 tard d'un token antic** s'ignora, perquè no pot tancar una sessió més nova. El fan servir `api.ts`, `courseService`, `profileService` i `statsService`.
    - **`publicClient`** → **sense token** automàtic, per a login i registre (amb un token caducat desat, aquestes crides rebrien 401). El fan servir `authService.login` i `register.ts`; `authService.logout` l'usa amb `Authorization` explícit.
  - El `Content-Type` **no es fixa manualment**: axios el posa sol (`application/json` per a objectes, `multipart/form-data` per a `FormData`).
- **Timeouts** (valors reals al codi):

  | Client / crida | Timeout |
  |--------|---------|
  | `apiClient` (`api.ts`, `courseService`, `profileService`, `statsService`) | **100000 ms** |
  | `publicClient` (login, registre) | sense timeout (axios per defecte) |
  | `authService.logout` | **5000 ms** (`LOGOUT_TIMEOUT`, només aquesta crida) |

---

## 1. Autenticació i usuaris

| Mètode | Endpoint | Descripció | Auth | Servei |
|--------|----------|------------|------|--------|
| POST | `/auth/login/` | Login. Body JSON `{ username, password }`. Desa `token`. | No | `authService.login` |
| POST | `/auth/logout/` | Tanca sessió al servidor. Sense body. Es **revoca el token**: es llegeix abans de netejar la sessió i s'envia com a `Authorization` explícit (`5000 ms`). | Token (explícit) | `authService.logout` |
| GET | `/auth/register/options/` | Dades prèvies al registre (organitzacions, avatar per defecte). | No | `register.loadRegistrationData` |
| POST | `/auth/register/` | Crea compte. Body **FormData**: `first_name`, `last_name`, `email`, `username`, `password1`, `password2`, `organization?`, `default_avatar?`, `avatar?`. Desa `token` si el retorn en porta. | No | `register.registerUser` |
| GET | `/users/me/settings/` | Perfil de l'usuari autenticat. | Token | `profileService.fetchProfile` |
| PATCH | `/users/me/settings/` | Actualitza perfil. Body JSON `{ first_name, last_name, email, current_password?, new_password1?, new_password2? }`. `username` no és editable. | Token | `profileService.updateProfile` |
| GET | `/orgs/` | Llista d'organitzacions. Accepta array o `{ results }`. | Token | `profileService.fetchOrganizations` |
| GET | `/users/me/avatar/` | Avatar de l'usuari (string o `{ avatar }`). Es llegeix com a imatge via `avatarCache` (`myAvatarUrl`/`preloadImage`), no amb una crida de servei. | Token | `avatarCache` |
| PATCH | `/users/me/avatar/` | Puja avatar. Body **FormData** `avatar`. Respon **204** → `Promise<void>`; la imatge es torna a carregar amb `avatarCache`. | Token | `profileService.updateMyAvatar` |
| GET | `/courses/{slug}/members/{user_id}/avatar/` | Avatar d'un altre membre del curs (rànquing), amb el `user_id` de la fila del leaderboard. `slug` i `user_id` es codifiquen amb `encodeURIComponent`. Es llegeix com a imatge via `avatarCache` (`userAvatarUrl`). | Token | `avatarCache` |
| POST | `/users/invite/` | Convida un usuari per correu. Body JSON `{ email }`. | Token | `api.inviteUser` |

---

## 2. Cursos

Tots amb `Authorization: Token {token}` (afegit per l'interceptor d'`apiClient`) i `Content-Type` automàtic d'axios (JSON per a objectes, multipart per a `FormData`).

| Mètode | Endpoint | Descripció |
|--------|----------|------------|
| GET | `/courses/` | Cursos visibles segons el rol (professor → seus; alumne → matriculats; staff → tots). |
| GET | `/public/courses/` | Tots els cursos públics (no requereix autenticació al backend). |
| GET | `/courses/{slug}/` | Detall d'un curs per slug. |
| GET | `/courses/{slug}/topics/` | Temes d'un curs. |
| GET | `/courses/{slug}/topics/{topic}/` | Detall d'un tema (teoria localitzada segons `i18n.language` i llista de fitxers `files: [{ id, name }]`). El fan servir les pestanyes Teoria i Fitxers de `CourseLessons`. |
| GET | `/courses/{slug}/files/{id}/download/` | Descarrega un fitxer del tema (blob). **Demana sessió**, també en cursos públics (401 sense token). `courseService.downloadFile`. |
| GET | `/courses/{slug}/topics/{topic}/problems/` | Problemes d'un tema. |
| GET | `/courses/{slug}/topics/{topic}/problems/{problem}/` | Detall d'un problema. |
| POST | `/courses/{slug}/topics/{topic}/problems/{problem}/submissions/` | Envia resposta. Body JSON: coding `{ code, language? }`, test `{ answers: [id, …] }`. |
| GET | `/courses/{slug}/topics/{topic}/problems/{problem}/submissions/` | Submissions pròpies del problema. |
| GET | `/courses/{slug}/topics/{topic}/problems/{problem}/submissions/peers/` | Submissions d'altres alumnes. Retorna `[]` si falla. |
| GET | `/courses/{slug}/students/overview/` | Resum d'alumnes del curs (punts per al rànquing). |

### Composicions (no són endpoints)
- `getFullCourseDetail(slug)`: fa `GET /courses/{slug}/` + `GET /courses/{slug}/topics/` i, per cada tema, `GET .../problems/` (2 + T peticions). Cacheja el resultat en memòria.
- Camps normalitzats a `toCourses()`: `id/slug ← slug`, `title ← name`, `isPublic ← is_public !== false`, `active ← active !== false`.
- Camps del detall extrets a `getFullCourseDetail`: `system_solution.code`, `statement_ca || statementHtml`, `precode`, `choices`, `score`, `difficulty`.

---

## 3. `api.ts` — híbrid (localStorage + client compartit)

Definit a `src/services/api.ts`; les crides HTTP van sobre l'`apiClient` de `httpClient.ts` (token i gestió de 401 automàtics). La majoria de mètodes **no fan HTTP**; sí en fan `get` i `inviteUser`.

| Mètode | Transport | Descripció | Claus localStorage |
|--------|-----------|------------|-------------------|
| `get(url, config)` | **GET** genèric | Client compartit. Consumidors: `statsService` (`/public/stats/`), `avatarCache` (imatges amb `responseType: 'blob'`) i `AiHelpPanel` (revisió IA). | — |
| `getStudentProgress(studentId)` | localStorage | Llegeix el progrés global. | `mooc_global_progress_{studentId}` |
| `postProgress({studentId, courseId, lessonId, status})` | localStorage | Desa el progrés i dispara `lessonProgressUpdated` (a `window` i `document`). | `mooc_global_progress_{studentId}` |
| `resetCourse(studentId, courseId)` | localStorage | Esborra progrés, codi (`code_*`) i submissions (`mooc_submissions_*`) del curs, i `mooc_last_session` si era d'aquell curs. | varies |
| `inviteUser(email)` | **POST** `/users/invite/` | Body `{ email }`. | — |

---

## 4. Cursos locals — `localCourseService.ts` (sense HTTP)

Tot es guarda a la clau `mooc_local_courses`:
`getAll()`, `getById(id)`, `save(course)`, `remove(id)`, `cloneFrom(sourceSlug)`.
Els cursos clonats reben ids `clone-<timestamp>` que `useCourse` torna a resoldre a l'slug original.

---

## 5. Altres APIs i llibreries

| API / Llibreria | Ús |
|-----------------|-----|
| **@tanstack/react-query** | Cache dels cursos (llistes + detalls) i del comptador de stats; una sola petició per clau. Vegeu `docs/ReactQuery.md` |
| **react-router-dom** | Routing SPA (v7) |
| **i18next + react-i18next** | Internacionalització (CA, ES, EN) |
| **axios** | Client HTTP, via `src/services/httpClient.ts` (`apiClient` / `publicClient`) |
| **localStorage API** | Persistència de sessió, progrés, codi, submissions, tema, idioma, cursos locals |
| **Canvas API** | Fons de partícules (`ParticlesBackground`) |
| **window.dispatchEvent** | Bus d'esdeveniments (`lessonProgressUpdated`, `auth-state-change`, `studentsUpdated`, `teacher-course-changed`, …) |
| **canvas-confetti** | Animació en completar lliçons |
| **Monaco** | Editor i worker de TypeScript per al preview en viu |
| **react-markdown + remark-gfm** | Render de la teoria |

---

## 6. Resum d'endpoints REST

| # | Mètode | Endpoint | Servei | Testejat? |
|---|--------|----------|--------|-----------|
| 1 | POST | `/api/v1/auth/login/` | authService | ✅ |
| 2 | POST | `/api/v1/auth/logout/` | authService | ✅ |
| 3 | GET | `/api/v1/auth/register/options/` | register | ✅ |
| 4 | POST | `/api/v1/auth/register/` | register | ✅ |
| 5 | GET | `/api/v1/users/me/settings/` | profileService | ❌ |
| 6 | PATCH | `/api/v1/users/me/settings/` | profileService | ❌ |
| 7 | GET | `/api/v1/orgs/` | profileService | ❌ |
| 8 | GET | `/api/v1/users/me/avatar/` | avatarCache | ❌ |
| 9 | PATCH | `/api/v1/users/me/avatar/` | profileService | ❌ |
| 10 | POST | `/api/v1/users/invite/` | api | ✅ |
| 11 | GET | `/api/v1/courses/` | courseService | ✅ |
| 12 | GET | `/api/v1/public/courses/` | courseService | ✅ |
| 13 | GET | `/api/v1/courses/{slug}/` | courseService | ✅ |
| 14 | GET | `/api/v1/courses/{slug}/topics/` | courseService | ✅ |
| 15 | GET | `/api/v1/courses/{slug}/topics/{topic}/` | courseService | ✅ |
| 16 | GET | `/api/v1/courses/{slug}/topics/{topic}/problems/` | courseService | ✅ |
| 17 | GET | `/api/v1/courses/{slug}/topics/{topic}/problems/{problem}/` | courseService | ✅ |
| 18 | POST | `/api/v1/courses/{slug}/topics/{topic}/problems/{problem}/submissions/` | courseService | ✅ |
| 19 | GET | `/api/v1/courses/{slug}/topics/{topic}/problems/{problem}/submissions/` | courseService | ✅ |
| 20 | GET | `/api/v1/courses/{slug}/topics/{topic}/problems/{problem}/submissions/peers/` | courseService | ✅ |
| 21 | GET | `/api/v1/courses/{slug}/students/overview/` | courseService | ✅ |
| 22 | GET | `/api/v1/public/stats/` | statsService | ⚠️ **previst, no existeix** |

**Estat dels tests:** el projecte **no té cap infraestructura de test ni cap fitxer de test**. La columna «Testejat?» reflecteix l'ús observat en manual/dev, no tests automatitzats.

---

## 7. Notes tècniques

- **submitChallenge:** body **JSON** (`Content-Type` el fixa axios automàticament). Coding → `{ code, language? }`; test → `{ answers: [choice_id, …] }`. Anteriorment s'enviava com a CSV via FormData.
- **`submitSubmission()`** és un wrapper `@deprecated` de `submitChallenge()`.
- **Fallbacks:** `getPeerSubmissions` retorna `[]` en cas d'error. **`statsService.getStudentCount()` retorna `number | null`** (null si l'endpoint falla o no existeix) sense llançar. La resta d'endpoints **no tenen fallback** i llencen l'error (les peticions de perfil es capturen i mostren amb `extractProfileErrors`).
- **`getAllCourses()` sense sessió:** sense `token` a `localStorage` retorna `[]` **sense fer cap petició** (el servei no crida el backend si no hi ha token).
- **`GET /public/stats/`:** endpoint públic (`{ students: number }`) previst per al comptador de la portada; el backend encara **no l'exposa**. La crida **només s'activa quan `VITE_ENABLE_PUBLIC_STATS=true|'1'`** (`usePublicStats`), així que per defecte la portada no fa cap petició cap a un endpoint que encara no existeix.
- **Cursos públics:** usuaris no autenticats poden enviar submissions; el codi s'executa però no es persisteix (submission_count = 0).
- **`clearCache(slug?)`** neteja `fullCourseCache` i `allCoursesCache` quan no rep slug, però **mai no neteja `publicCoursesCache`** ⚠️.
- **Login de l'aplicació:** tot i que existeix `AuthContext`, el flux real és `StudentDashboard.handleLogin` → `authService.login()` directament. `Student.code` ja **no** es desa a `currentStudent` (fix2) i `Student.code` és opcional.
- **401 caducat:** un 401 amb el token actual tanca la sessió local i dispara `auth-state-change` (vegeu `httpClient.ts`); un 401 d'un token antic en vol s'ignora.

---

## Forma dels errors

Totes les respostes d'error de l'API (4xx i 5xx) tenen la forma
`{ "detail": "...", "code": "...", "errors": { "camp": ["missatge"] } }`.
`apiErrorMessages()` (`httpClient.ts`) en treu els missatges de `errors` i, si no n'hi ha,
el `detail`; el fan servir registre, perfil, enviament de codi i invitacions.
Els usuaris s'identifiquen per l'**id** (`id` / `user_id`) a totes les URLs, mai pel username.

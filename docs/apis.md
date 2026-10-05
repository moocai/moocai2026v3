# API Reference — MOOC React 2026
**Última actualització: 1 d'octubre de 2026**

Aquest document recull **totes les APIs REST** que consumeix l'aplicació frontend. El projecte **no té backend propi**; es connecta a una API externa allotjada a `https://algorien.com`.

---

## 0. Convencions generals

- **Base URL:** `https://algorien.com/api/v1` (tots els serveis hi apunten).
- **Variable d'entorn:** `import.meta.env.VITE_API_URL || ''`. ⚠️ No hi ha cap fitxer `.env`, així que el valor és sempre `''` i totes les URLs surten **relatives** (`/api/v1/...`).
- **Proxy dev:** `/api` → `https://algorien.com` (`vite.config.ts`, `changeOrigin: true`).
- **Redirect prod:** `/api/*` → `https://algorien.com/api/:splat` (`netlify.toml`, 200).
- **Autenticació:** DRF **TokenAuthentication**. Header `Authorization: Token {token}`. El token es desa a `localStorage.token`.
  - ⚠️ **No totes les crides l'envien.** Cada servei el construeix pel seu compte:
    - `courseService`, `api.ts`, `profileService` → **sí** (`Token`).
    - `authService` (login/logout) i `register` → **no** (axios pla sense interceptor).
- **Timeouts** (valors reals al codi):

  | Servei | Timeout |
  |--------|---------|
  | `api.ts` (`inviteUser`) | **3000 ms** |
  | `courseService.ts` | **10000 ms** |
  | `authService`, `register`, `profileService` | sense timeout (axios per defecte) |

---

## 1. Autenticació i usuaris

| Mètode | Endpoint | Descripció | Auth | Servei |
|--------|----------|------------|------|--------|
| POST | `/users/auth/login/` | Login. Body JSON `{ username, password }`. Desa `token`. | No | `authService.login` |
| POST | `/users/auth/logout/` | Tanca sessió al servidor. Sense body. | **No** ⚠️ (no envia token) | `authService.logout` |
| GET | `/users/register/` | Dades prèvies al registre (organitzacions, avatar per defecte). | No | `register.loadRegistrationData` |
| POST | `/users/register/` | Crea compte. Body **FormData**: `first_name`, `last_name`, `email`, `username`, `password1`, `password2`, `organization?`, `default_avatar?`, `avatar?`. Desa `token` si el retorn en porta. | No | `register.registerUser` |
| GET | `/users/me/settings/` | Perfil de l'usuari autenticat. | Token | `profileService.fetchProfile` |
| PATCH | `/users/me/settings/` | Actualitza perfil. Body JSON `{ first_name, last_name, email, current_password?, new_password1?, new_password2? }`. `username` no és editable. | Token | `profileService.updateProfile` |
| GET | `/orgs/` | Llista d'organitzacions. Accepta array o `{ results }`. | Token | `profileService.fetchOrganizations` |
| GET | `/users/me/avatar/` | Avatar de l'usuari (imatge binària). Es carrega com a blob amb `avatarCache` (`myAvatarUrl()`). | Token | `utils/avatarCache` |
| PATCH | `/users/me/avatar/` | Puja avatar. Body **FormData** `avatar`. Respon 204 sense cos. | Token | `profileService.updateMyAvatar` |
| POST | `/users/invite/` | Convida un usuari per correu. Body JSON `{ email }`. | Token | `api.inviteUser` |

---

## 2. Cursos

Tots amb `Authorization: Token {token}` i `Content-Type: application/json` (excepte on s'indiqui).

| Mètode | Endpoint | Descripció |
|--------|----------|------------|
| GET | `/courses/` | Cursos visibles segons el rol (professor → seus; alumne → matriculats; staff → tots). |
| GET | `/public/courses/` | Tots els cursos públics (no requereix autenticació al backend). |
| GET | `/courses/{slug}/` | Detall d'un curs per slug. |
| GET | `/courses/{slug}/topics/` | Temes d'un curs. |
| GET | `/courses/{slug}/topics/{topic}/` | Detall d'un tema (teoria localitzada segons `i18n.language`). |
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

## 3. `api.ts` — híbrid (localStorage + 1 crida HTTP)

Definit a `src/services/api.ts`. La majoria de mètodes **no fan HTTP**; només `inviteUser`.

| Mètode | Transport | Descripció | Claus localStorage |
|--------|-----------|------------|-------------------|
| `getStudentProgress(studentId)` | localStorage | Llegeix el progrés global. | `mooc_global_progress_{studentId}` |
| `postProgress({studentId, courseId, lessonId, status})` | localStorage | Desa el progrés i dispara `lessonProgressUpdated` (a `window` i `document`). | `mooc_global_progress_{studentId}` |
| `resetCourse(studentId, courseId)` | localStorage | Esborra progrés, codi (`code_*`) i submissions (`mooc_submissions_*`) del curs, i `mooc_last_session` si era d'aquell curs. | varies |
| `inviteUser(email)` | **POST** `/users/invite/` | Única crida HTTP real del fitxer. | — |

---

## 4. Cursos locals — `localCourseService.ts` (sense HTTP)

Tot es guarda a la clau `mooc_local_courses`:
`getAll()`, `getById(id)`, `save(course)`, `remove(id)`, `cloneFrom(sourceSlug)`.
Els cursos clonats reben ids `clone-<timestamp>` que `useCourse` torna a resoldre a l'slug original.

---

## 5. Altres APIs i llibreries

| API / Llibreria | Ús |
|-----------------|-----|
| **@tanstack/react-query** | Cache i prefetch del detall de curs |
| **react-router-dom** | Routing SPA (v7) |
| **i18next + react-i18next** | Internacionalització (CA, ES, EN) |
| **axios** | Client HTTP |
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
| 1 | POST | `/api/v1/users/auth/login/` | authService | ✅ |
| 2 | POST | `/api/v1/users/auth/logout/` | authService | ✅ |
| 3 | GET | `/api/v1/users/register/` | register | ✅ |
| 4 | POST | `/api/v1/users/register/` | register | ✅ |
| 5 | GET | `/api/v1/users/me/settings/` | profileService | ❌ |
| 6 | PATCH | `/api/v1/users/me/settings/` | profileService | ❌ |
| 7 | GET | `/api/v1/orgs/` | profileService | ❌ |
| 8 | GET | `/api/v1/users/me/avatar/` | profileService | ❌ |
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
| 21 | GET | `/api/v1/courses/{slug}/topics/{topic}/problems/{problem}/submissions/peers/` | courseService | ✅ |
| 22 | GET | `/api/v1/courses/{slug}/students/overview/` | courseService | ✅ |

**Estat dels tests:** el projecte **no té cap infraestructura de test ni cap fitxer de test**. La columna «Testejat?» reflecteix l'ús observat en manual/dev, no tests automatitzats.

---

## 7. Notes tècniques

- **submitChallenge:** body **JSON** (`Content-Type: application/json`). Coding → `{ code, language? }`; test → `{ answers: [choice_id, …] }`. Anteriorment s'enviava com a CSV via FormData.
- **`submitSubmission()`** és un wrapper `@deprecated` de `submitChallenge()`.
- **Fallbacks:** `getPeerSubmissions` retorna `[]` en cas d'error. La resta d'endpoints **no tenen fallback** i llencen l'error (les peticions de perfil es capturen i mostren amb `extractProfileErrors`).
- **Cursos públics:** usuaris no autenticats poden enviar submissions; el codi s'executa però no es persisteix (submission_count = 0).
- **`clearCache(slug?)`** neteja `fullCourseCache` i `allCoursesCache` quan no rep slug, però **mai no neteja `publicCoursesCache`** ⚠️.
- **Login de l'aplicació:** tot i que existeix `AuthContext`, el flux real és `StudentDashboard.handleLogin` → `authService.login()` directament.

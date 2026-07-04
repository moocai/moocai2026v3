# API Reference — MOOC React 2026

Aquest document recull **totes les APIs REST** que consumeix l'aplicació frontend. El projecte **no té backend propi**; es connecta a una API externa allotjada a `https://algorien.com`.
---

## 1. Autenticació

Base URL: `https://algorien.com/api` (proxy Vite: `/api`)

Headers: `Content-Type: application/json`

| Mètode | Endpoint | Descripció | Autenticació |
|--------|----------|------------|-------------|
| POST | `/api/users/auth/login/` | Inici de sessió (email + codi). Retorna token i dades d'usuari. | No |
| POST | `/api/users/auth/logout/` | Tancament de sessió al backend. | Token |
| GET | `/api/users/me/settings/` | Obté dades de l'usuari actual. Fallback a localStorage si API no disponible. | Token |


## 2. Cursos

Base URL: `https://algorien.com/api/v1`

Headers: `Authorization: Token {token}` (afegit automàticament per un interceptor d'axios)

Timeout: 10s

| Mètode | Endpoint | Descripció |
|--------|----------|------------|
| GET | `/api/v1/public/courses/` | Llistat públic de tots els cursos disponibles |
| GET | `/api/v1/courses/{slug}/` | Obté detalls d'un curs per slug |
| GET | `/api/v1/courses/{slug}/topics/` | Obté els temes/lliçons d'un curs |
| GET | `/api/v1/courses/{slug}/topics/{topic}/problems/` | Obté els problemes d'un tema concret |
| POST | `/api/v1/courses/{slug}/challenges/{challenge}/submissions/` | Envia una solució d'exercici |

---

## 3. Serveis Mock (localStorage)

Definits a `src/services/api.ts`. No fan peticions HTTP; només llegeixen i escriuen a `localStorage`.

| "Mètode" | Descripció | Claus localStorage |
|----------|------------|-------------------|
| `getStudentProgress(studentId)` | Retorna el progrés global d'un estudiant | `mooc_global_progress` |
| `postProgress({studentId, courseId, lessonId, status})` | Desa progrés d'una lliçó i dispara esdeveniment `lessonProgressUpdated` | `mooc_global_progress` |
| `resetCourse(studentId, courseId)` | Reinicia progrés, codi, submissions i última sessió d'un curs | `mooc_global_progress`, `code_*`, `mooc_submissions_*`, `mooc_last_session` |

---

## 4. Altres APIs i Llibreries

| API / Llibreria | Ús |
|----------------|-----|
| **@tanstack/react-query** | Cache i prefetching de dades de curs |
| **react-router-dom** | Routing SPA (navegació client-side) |
| **i18next + react-i18next** | Internacionalització (CA, ES, EN) |
| **axios** | Client HTTP per a les peticions REST |
| **localStorage API** | Persistència offline: progrés, codi, punts, usuaris, tema, idioma, submissions, última sessió |
| **Canvas API** | Fons interactiu de partícules (ParticlesBackground) |
| **window.dispatchEvent** | Comunicació entre components (events custom) |
| **canvas-confetti** | Animació en completar lliçons |

---

## 5. Resum d'Endpoints REST

| # | Mètode | Endpoint | Testejat? |
|---|--------|----------|-----------|
| 1 | POST | `/api/users/auth/login/` | ❌ No |
| 2 | POST | `/api/users/auth/logout/` | ❌ No |
| 3 | GET | `/api/users/me/settings/` | ❌ No |
| 4 | GET | `/api/v1/public/courses/` | ✅ Sí |
| 5 | GET | `/api/v1/courses/{slug}/` | ✅ Sí|
| 6 | GET | `/api/v1/courses/{slug}/topics/` | ✅ Sí|
| 7 | GET | `/api/v1/courses/{slug}/topics/{topic}/problems/` | ✅ Sí|
| 8 | POST | `/api/v1/courses/{slug}/challenges/{challenge}/submissions/` | ❌ No ERROR 401|

**Estat dels tests:** El projecte no té cap infraestructura de testing ni cap fitxer de test. Tots els endpoints estan sense testejar.

---

## 6. Notes Tècniques

- **Proxy Vite:** La configuració de Vite proxyja `/api` → `https://algorien.com` amb `changeOrigin: true`. En producció, cal configurar el reverse proxy adequadament.
- **Autenticació:** El token s'obté del login i es guarda a `localStorage` amb clau `token`. L'interceptor d'axios l'afegeix automàticament a totes les peticions.
- **submitChallenge:** El codi s'envia com a fitxer CSV (`submission.csv`) dins d'un `FormData` amb clau `file`. `Content-Type: multipart/form-data` es gestiona automàticament per axios.
- **Fallback local:** `getMe()` té fallback a `localStorage` (`currentStudent`). La resta d'endpoints **no tenen fallback** i fallen si l'API no està disponible.
- **Funció deprecated:** `submitSubmission()` és un wrapper de `submitChallenge()` marcat com a `@deprecated`.

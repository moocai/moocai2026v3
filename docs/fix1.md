> **Stacked on moocai/moocai2026v3#36.** This PR targets that branch, so the diff shows only these changes. When moocai/moocai2026v3#36 is merged, GitHub retargets this PR to `main`. It uses the shared `apiClient` introduced there.

## Why

Many API requests show up red in the browser's network tab. Each one was traced to its cause: requests to endpoints that don't exist, requests without the auth header, or requests the user isn't allowed to make. This PR fixes them with **one commit per problem**, so any single change can be dropped if you disagree with it.

## Changes

| Commit | Request(s) | Problem | Fix |
|---|---|---|---|
| Disable the home page student counter | `GET /public/stats/` → **404** on every home visit | The endpoint doesn't exist, so the banner always showed "—". | Code is **commented out with `TODO(stats)`**, not deleted. What it should count, and whether that number should be public, needs to be agreed first. The grid adapts to the number of stats. |
| Don't request the course list when logged out | `GET /courses/` → **401** for visitors | `MainLayout` (every course, lesson, dashboard and profile page) and `CourseLessons` requested it without a session. `MainLayout`'s promise also had no `.catch`. | `getAllCourses()` returns `[]` without a request when there is no token (not cached). `MainLayout` swallows prefetch errors. |
| Only request the leaderboard for own courses | `GET /courses/<public>/leaderboard/` → **403** (and ×5 retries after each accepted exercise) | It answers 403 to users not enrolled in the course, and was requested for public courses the student isn't enrolled in. The previous course's ranking also stayed on screen. | Dashboard loads it only for the user's own courses. `refreshCoursePoints` skips other courses and stops retrying on 4xx. |
| Load own avatar from `/users/me/avatar/` | `GET /users/<id>/avatar/<course>/` → **404/403** | `currentStudent` stores the user **id**, but the URL needs the **username**. With no remembered course it built `/users/<x>/avatar/`, which doesn't exist. | The header and dashboard use `/users/me/avatar/`. The cache key carries `?u=<id>` so a shared browser never shows the previous user's avatar from IndexedDB. `userAvatarUrl()` now requires the course slug. |
| Don't re-request avatars that returned 403/404 | Same avatar requested on every remount | Failures weren't remembered. | 403/404 are remembered for the session (initial-letter fallback). Network errors and 5xx aren't remembered, and `invalidateImage()` resets the list. |
| Fix the AI review request | `.../topics/general/problems/<p>/submissions/review/` → **401/404** | Plain `fetch` without a token, topic hardcoded to `general`, and the code read `review`/`feedback` instead of `review_text`. | Uses the shared client and the real topic slug, and shows `review_text`. When there's no review, it shows the API's explanation (`detail`) instead of "check your connection". |
| Remove the exam page fallback | `.../topics//problems/<slug>/` → **404** | The fallback only ran when no topic contained the problem, so the topic was always empty. | Removed: the exam shows "not found", which is what the failed request ended in anyway. |
| Remove `getChallengeGrades` | (unused) | Its URL isn't a grades endpoint and answers 403/404. | Removed, along with its rows in `docs/`, before anyone uses it. |
| Show the real avatar on the profile page | Broken image / 404 | `avatar_url` from the settings response can't be loaded from this app (the browser got `index.html`), and `fetchMyAvatar()` parsed the binary image as JSON. | Loads through the avatar cache as a blob. `fetchMyAvatar()` is removed, and `updateMyAvatar()` returns `void` (the endpoint answers 204). |

## How it was tested
- `npm run build` (includes `tsc -b`) passes after every commit.
- End-to-end in Chromium, **production builds of `main` vs this branch**, against a local test instance of the API with test data: a student enrolled in one public course, plus another public course they aren't enrolled in. The script visits the home page and a course page as a visitor, then logs in and visits the dashboard (with the non-enrolled public course open), the profile page, a lesson page (opening the AI tab) and logs out.
  - **`main`: 23 failed `/api` requests.**
  - **This branch (with moocai/moocai2026v3#36): 5 failed `/api` requests, all expected:**
    - 4 × course avatar 404, because the test courses have no image (now requested once per page load);
    - 1 × AI review 404, which is how the API answers when there's no accepted solution yet; the panel now shows that message.

## Follow-ups (not in this PR)
- **`TODO(stats)`**: decide what the home page student counter should show before adding any endpoint.
- The home page and dashboard still fetch the full detail of every course (course + topics + problems per topic), several times over. Moving data loading to React Query would remove most of these duplicate requests.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01KhVCnDCVAnv5dWpxYdfSTt

---

## Estat de la implementació sobre aquest repo

Data: 2026-10-06. S'han aplicat totes les files de la taula «Changes» sobre el codi actual (`moocai2026v3 - copia`). `npm run build` (`tsc -b` + `vite build`) passa sense errors.

### Fet ✅

| Fix | Què s'ha canviat |
|---|---|
| Comptador d'estudiants de la portada | **Decisió presa i comptador Reactivat** (2026-10-06): compta el **nombre d'alumnes actius** i és una xifra **pública**. `src/hooks/usePublicStats.ts` → `useQuery(['public-stats'])`, activada només quan `VITE_ENABLE_PUBLIC_STATS=true` (el backend encara no exposa `GET /public/stats/`); mentre no s'activi la variable, **cap** petició a la portada. `src/services/statsService.ts` reescrit sobre el client compartit (`api.get`) i resilient (retorna `null` sense llançar → la UI amaga l'estadística en lloc de «—»). `src/components/Hero.tsx`: entrada del `stats` restaurada i la graella segueix adaptant-se (2 estadístiques per defecte). |
| **Follow-up React Query** | **Fet** (2026-10-06): nou `src/hooks/useCourses.ts` (`useAllCourses` → `['courses']`, `usePublicCourses` → `['public-courses']`, `useCourseDetail` → `['course', slug]` amb la **mateixa key** que `useCourse`, i `prefetchAllCourses`/`prefetchCourseDetail`). `MainLayout` ara fa el prefetch **a la cache de React Query**; `Home.tsx` i `StudentDashboard.tsx` ja no baixen el detall complet de cada curs per separat (el dashboard usa `useQueries` per slug). Els canvis de sessió invaliden llistes + detalls. Detalls a `docs/ReactQuery.md`. |
| Llista de cursos sense sessió | `src/services/courseService.ts`: `getAllCourses()` retorna `[]` sense petició si no hi ha `token` (la llista buida no es cacheja). `src/layouts/MainLayout.tsx`: el prefetch empassa errors (`.catch` a `getAllCourses` i a cada `getFullCourseDetail`). |
| Leaderboard només per cursos propis | `src/pages/dashboards/StudentDashboard.tsx`: `loadRanking` només demana el leaderboard si el curs actual és dels propis (`assignedCourses`) i buida el rànquing en cas contrari. `src/utils/pointsSync.ts`: `refreshCoursePoints` salta els cursos no propis i deixa de reintentar quan el backend respon 4xx. |
| Avatar propi des de `/users/me/avatar/` | `src/utils/avatarCache.ts`: nova `myAvatarUrl()` amb clau de cau `?u=<id>` (navegador compartit no mostra l'avatar anterior) i `userAvatarUrl(username, slug)` ara obliga el slug. Header (`UserAvatarMenu`) i dashboard usen `myAvatarUrl()`. |
| No tornem a demanar avatars 403/404 | `src/utils/avatarCache.ts`: set `failed` per a la sessió (403/404); errors de xarxa i 5xx no es recorden; `invalidateImage()` (amb o sense `src`) les oblida. |
| Revisió IA | `src/pages/courses/AiHelpPanel.tsx`: us usa el client compartit (`api.get`), el slug real del tema (nou prop `topicSlug` des de `LessonPage`) i mostra `review_text`; si no n'hi ha, mostra el `detail` de l'API en lloc de «comprova la connexió». |
| Fallback de l'examen | `src/pages/courses/ExamPage.tsx`: eliminat el `getChallenge` amb topic buit (`/topics//problems/<slug>/`); ara es mostra «Examen no trobat». |
| `getChallengeGrades` | Eliminat de `src/services/courseService.ts` i les seves files de `docs/apis.md` i `docs/project.md` (i reenumeració de la taula d'endpoints). |
| Avatar real al perfil | `src/pages/ProfilePage.tsx`: l'avatar es carrega amb `preloadImage(myAvatarUrl())` (blob amb token). `src/services/profileService.ts`: `fetchMyAvatar()` eliminat i `updateMyAvatar()` ara retorna `void` (el PATCH respon 204). Doc actualitzada a `docs/apis.md` (servei `avatarCache`) i `docs/project.md`. |

### Falta / pendent ⚠️

- **Prova end-to-end en Chromium**: no s'ha executat el recorregut (visitant, login, dashboard, perfil, lliçó, logout) que descriu la secció «How it was tested»; només s'ha comprovat `tsc -b` + `vite build`. Cal validar amb una instància local del backend que no quedi cap `/api` en vermell no esperat.
- **Base de l'PR**: informatiu. Aquest repo no té l'historial de PRs #36; l'«apiClient compartit» aquí ja existia com a `api.get` (a `src/services/api.ts`) i els fixes s'han aplicat directament sobre els clients actuals, sense un commit per problema ni historial de PRs.


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
| `Login` | `GET /users/register/` en carregar | només en obrir el formulari de registre |
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

## Fase 2 (proposta, cal backend): un endpoint d'esquema del curs

El que queda (les 7–9 peticions d'un curs) és el mateix 2 + N: el frontend ha de recórrer tema per tema per saber quins problemes té. `LessonPage` en necessita l'esquema sencer (barra de progrés del curs, anterior/següent entre temes) i el dashboard el del curs seleccionat.

Proposta a `algorien`: `GET /api/v1/courses/<slug>/outline/` → curs + temes + resum de problemes (`slug`, `title`, `type`, `difficulty`, `score`), **sense** enunciats, teoria ni opcions. Amb els mateixos permisos que `topics/` (temes ocults/bloquejats segons qui pregunta).

Amb això:

- `getFullCourseDetail` → 1 petició en lloc de 2 + N (dashboard, curs, problema).
- L'enunciat i les opcions es demanen per problema (`GET .../problems/<slug>/`) o per tema (`.../problems/`) només quan s'obren.
- `TopicTestPage` ja segueix aquest patró (només el tema del test).

# 29/09/2026

## Nova vista de configuració d'usuari (`src/pages/ProfilePage.tsx`)

### Rutes i accés
- Nova ruta `/profile` registrada a `src/App.tsx` dins de `MainLayout`.
- `src/components/UserAvatarMenu.tsx` deixa de ser un menú i es queda **només amb l'avatar**: en fer clic navega a `/profile`. Eliminats el `IconButton`, el `Menu` i el bloqueig de rol.
- Botó "Torna al curs" a la capçalera que fa `navigate(-1)`.
- Eliminada la card de **Rol** que hi havia abans; el logout també ja no es renderitza (i es neteja el handler i els imports morts).

### Layout (`LAYOUT` al capdamunt del fitxer)
- Graella de **24 columnes** a ≥900px (cada columna = 0,5 de les 12 originals) per poder expressar fraccions. Abans era de 12; amb 12 no es podien posar decimals a `span` (CSS Grid rebutja `span 6.5`).
- `gridTemplateColumns: { xs: '1fr', md: 'repeat(24, 1fr)' }` i les mides viuen totes a l'objecte `LAYOUT`:
  - `preferences: '1 / span 13'` (54,2%), `organizations: '14 / span 11'` (45,8%) a la fila 1.
  - `account: '1 / span 16'` i `avatar: '17 / span 8'` a la fila 2, amb `align: 'start'` i `max: 375` a l'avatar.
- Helper `cardAt(entry)` tradueix una entrada de `LAYOUT` al `sx` de cada `Card` (`gridColumn`, `gridRow`, `alignSelf`, `maxWidth`).
- Corregit un error de grid: l'avatar era `9 / span 6` sobre 12 columnes, cosa que creava columnes implícites 13 i 14 i feia desbordar la fila.

### Responsive i scroll
- **Mòbil (<900px)**: les 4 cards col·lapsen a una sola columna i la pàgina **té scroll vertical**. Abans no hi havia scroll perquè `MainLayout` dona `flex: 1; overflow: hidden` al `Outlet`.
  - Contenidor arrel: `overflowY: { xs: 'auto', md: 'hidden' }`.
  - Contingut i grid: `flex: { xs: '0 0 auto', md: '1 1 auto' }` perquè a mòbil prenguin l'alçada natural i a desktop ocupin tota l'alçada.
- A ≥900px es manté el disseny sense scroll vertical, amb el grid de dues files.

### Estils visuals
- `cardBase`: `p: 2.5`, `borderRadius: 12px`, `border: 1px solid`, sense ombra.
- En **light**, cards, dividers i camps de text tenen el border **negre** (`BORDER = '#000'`). En dark, `divider`. En **fancy**, cards translúcides `rgba(20,20,20,0.72)` amb `backdropFilter: blur(10px)` i `ParticlesBackground` al fons.

### TextFields (`fieldSx`, compartit pels 7 camps)
- **Sense línia inferior en cap estat** (reposició, hover ni focus). La causa era que `FilledInput` genera `&:hover:not(.Mui-disabled,.Mui-error)::before` (especificitat `0,4,1`) i `::before/::after` en focus; cal `'&&'` per pujar l'especificitat i guanyar.
- En light el camp conserva **laterals i superiors negres però sense traç inferior** (`border` + `borderBottom: 'none'`); en dark/fancy va sense border.
- Fons `action.hover` amb radi `10px`; en hover puja a `action.selected` (un to més clar, s'adapta al tema).
- **Label** blanc (`#fff`) en dark i fancy, negre (`#000`) en light — també en focus, evitant el porpra per defecte. Els selectors del label són a nivell del `TextField` (`'& .MuiInputLabel-root'`), no dins de `.MuiInputBase-root`, perquè el `<label>` és **germà** de l'InputBase al DOM i el selector anterior no existia.
- Label a `fontSize: '1rem'` (més gran que el 0,75rem de MUI per defecte).
- Botons d'idioma (pills) amb border negre en light; en dark/fancy l'actiu manté `primary.main` i els inactius `divider`.

### Card "Detalls del compte"
- Els 3 camps de contrasenya en línia (`direction="row"`, col·lapsen a columna a xs) i el botó "Desa els canvis" just a sota, dins de la mateixa card.
- Icones de `lucide-react` als camps: `UserRound` a l'esquerra del username, `Lock` a la **dreta** del username (opacitat 0,7), `KeyRound` i `ShieldCheck` a les contrasenyes.
- El camp "Nom d'usuari" és de **només lectura** via `readOnly` a l'input (en lloc de `disabled`, que aplica `opacity: 0.6` i fons gris). Es crea `readonlyFieldSx` per si cal un tractament propi.

### Card "Organitzacions" → desplegable
- Abans era una llista de cards; ara és un `TextField select` amb les opcions de `GET /api/v1/orgs/`.
- Valor per defecte: la organització el nom de la qual conté "Violeta" (regex `/violeta/i`), i si no hi és, la primera de la llista. Si l'endpoint no torna res, es mostra la constant `DEFAULT_ORG` (`CIFO BCN La Violeta` / `Centre de formació`).
- El valor seleccionat i cada opció mostren nom en negreta + subtítol, via `slotProps.select.renderValue` (en MUI v9 el `renderValue` ja no és una prop directa de `TextField`).
- Es manté el badge "Membre" a la dreta. El subtjol surt de `org.type ?? org.subtitle`.
- La interfície `Organization` accepta ara també `subtitle`.
- **Avís:** la selecció encara no s'envia a cap endpoint; el `PATCH /users/me/settings/` no accepta organització, és només visual.

### Card "Avatar"
- Avatar de 96px amb preview local (`FileReader.readAsDataURL`), botó "Tria un fitxer" (`outlined`) i nom del fitxer triat.
- Es carrega l'avatar existent amb `GET /users/me/avatar/`; sense resposta es mostra la inicial del nom.
- L'**upload només s'envia en desar** (`PATCH /users/me/avatar/` amb `FormData`, camp `avatar`), no en seleccionar el fitxer.

### Lògica i estat
- `readStoredProfile()` llegeix `currentStudent` de `localStorage` i hidrata `firstName`, `lastName`, `email` i `username` (l'email si no hi ha `username`).
- Validació al desar: si hi ha contrasenyes noves cal `current_password` i que els dos passwords coincideixin; els errors es mostren a `formError`.
- `handleSubmit` fa `updateProfile` i després, si hi ha fitxer, `updateMyAvatar` (amb el seu propi `try/catch` perquè una pujada fallida no tingui per fallat el desat del perfil).
- després de desar, es buiden els camps de contrasenya i fitxer, i es reseteja l'`input` de fitxer.
- **Mirror a `localStorage`**: s'actualitza `currentStudent` amb les dades noves i es llança `window.dispatchEvent(new Event('auth-state-change'))` perquè el Header i la resta de l'app reflecteixin el nom nou.
- `extractProfileErrors(error)` recorre recursivament la resposta de l'API i concatena els missatges.

### Servei nou `src/services/profileService.ts`
- `BASE_URL` = `import.meta.env.VITE_API_URL || ''` + `/api/v1`, token via `Authorization: Bearer` des de `localStorage`.
- Endpoints: `PATCH /users/me/settings/`, `GET /orgs/`, `GET /users/me/avatar/`, `PATCH /users/me/avatar/`.
- `fetchOrganizations` accepta tant un array directe com `{ results: [...] }`.
- `updateMyAvatar` envia `multipart/form-data` amb el camp `avatar`.
- Exporta els tipus `Organization`, `ProfilePayload` i `ProfileUser`.

### Traduccions
- Bloc `profile.*` afegit a `src/i18n/ca.ts`, `es.ts` i `en.ts`.
- Els canvis d'idioma criden `useI18n().setLanguage()`, que persisteix a `mooc-language` i és global a tota l'app.
- Banderes com a SVG inline (`FlagIcon`): bandera catalana ratllada, espanyola bicolor i anglesa amb la creu de Sant Jordi.

### Monaco
- `src/utils/monaco.ts`: `fontSize` de 13 a **18** i `lineHeight` a **24** per fer el codi més llegible.

## Detalls tècnics que van caldre corregir

- **Especificitat de `sx` amb MUI**: diverses vegades les regles es van veure aplicades al fitxer però no tenien efecte. Causes reals trobades:
  - El `<label>` de `TextField` és germà de l'`InputBase` al DOM, no un fill → els selectors `& .MuiInputBase-root .MuiInputLabel-root` no existien.
  - `FilledInput` aplica `:hover:not(...)::before` amb especificitat `0,4,1` → cal `'&&'` per superar-la.
  - En MUI v9, `renderValue` ja no és prop directa de `TextField`; va dins de `slotProps.select`.
  - `slotProps.select.MenuProps` no accepta `PaperProps` en aquesta versió.
- **El fitxer `ProfilePage.tsx` s'ha sobreescrit diverses vegades** des de l'editor mentre s'editava (amb `renderValue` fora de `slotProps`). Cal llegir sempre el fitxe real abans d'editar, no assumir l'estat anterior de l'edit.
- `span` decimal és **invàlid** a CSS Grid: `8 / span 7` sobre 12 columnes crea columnes implícites i desborda la fila. La solució va ser passar a 24 columnes.
- `gridTemplateRows: { md: 'auto 1fr auto' }` conserva una tercera fila que ja no s'utilitza (el botó de desar es va moure dins de la card del compte). Candidata a neteja.
- `readStoredProfile()` es recalcula en cada render; es podria embolicar amb `useMemo`.
- Verificació: `npx tsc --noEmit` net i `npx vite build` correcte. El build només avisa de chunks >500 kB (Monaco), que és el comportament esperat.

## Desplegable de cursos al dashboard de l'alumne (`src/pages/dashboards/StudentDashboard.tsx`)

### Objectiu
Dins del box dels tabs de curs hi ha un **desplegable per triar quina llista de cursos es mostra**: público, privat o assignat. El curs seleccionat canvia com abans (`currentCourse`), i el contingut de tota la pàgina (targetes de resum, "Continua Estudiant", enllaç a les stats) es segueix mantenint igual.

### Els tres àmbits
- `CourseScope = 'public' | 'private' | 'assigned'` exportat del fitxer, amb `SCOPES` (l'ordre del menú), `SCOPE_META` (labelKey + fallback per idioma) i `ScopeIcon` (icona de cada àmbit: `PublicIcon`, `LockIcon` = `LockOutlined`, `SchoolIcon`).
- `filterByScope(courses, scope)` aplica el filtre:
  - `public` → `isPublic !== false`
  - `private` → `isPublic === false`
  - `assigned` → **no filtra res**, és tota la llista que ha tornat el backend.

### Dues fonts de dades en lloc d'una
Estats nous `assignedCourses` i `publicCourses` (es substitueix l'estat `allCourses`, que ja no existeix):

| Àmbit | Endpoint | Filtre |
|---|---|---|
| Público | `GET /public/courses/` | `isPublic !== false` |
| Privats | `GET /courses/` | `isPublic === false` |
| Assignats | `GET /courses/` | cap (el backend ja filtra per rol) |

A `initData` els dos llistats es criden en `Promise.all` i cadascun rep els seus propis `getFullCourseDetail`. Cada crida té `catch` individual perquè un error en un no tombà l'altre.

### `courseService.ts`
- `getAllCourses()` canvia de `GET /public/courses/` a **`GET /courses/`**.
- Nova `getPublicCourses()` per a `GET /public/courses/`, amb la seva pròpia `publicCoursesCache`.
- Extret `toCourses(data)` com a helper de mòdul per normalitzar el JSON (array directe o `{ results: [...] }`) a tipus `Course`; abans el mapping estava duplicat.
- Les dues llistes comparteixen els mateixos camps: `isPublic` (`c.is_public !== false`), `active` (`c.active !== false`) i `professors` (array o `[]`).
- `src/features/student/types.ts`: la interfície `Course` rep `isPublic?`, `active?` i `professors?`.

### Persistència de l'últim curs
- Clau `mooc_dashboard_last_course` amb la forma `{ slug, scope }`. Helpers `readLastCourse()` i `writeLastCourse(slug, scope)`, tots dos amb `try/catch` (mode privat).
- `persistSelection(course, scope)` i `pickScope(scope)` es criden des dels handlers (`onChange` dels tabs i `onClick` dels `MenuItem`), mai des d'un efecte.
  - Motiu: un efecte de persistència hauria corregit el valor restaurat just abans de que l'efecte de restauració apliqués l'estat, perquè els dos s'executen en la mateixa passada i els `setState` són asíncrons.
- Efecte de restauració amb `restoredRef` (un `useRef` com a guarda): un sol cop, quan `assignedCourses.length + publicCourses.length > 0`, reinstateix l'àmbit i busca l'índex del slug dins de la llista corresponent. Si el slug ja no existeix, degrada a l'índex 0.
- Als `Tabs`, `value={visibleCourses.length ? courseTabIndex : false}` perquè no avisi en renderitzar una pestanya buida.

### Menú
- `Button` amb `startIcon` (la icona de l'àmbit actiu), `endIcon` amb `ExpandMoreIcon` que gira 180° quan el menú és obert, i un badge amb el recompte de cursos de l'àmbit.
- `Menu` generat amb `map` sobre `SCOPES`, de manera que afegir-hi un quart àmbit no obliga a tocar el JSX. Cada opció mostra el seu recompte.
- Separador `Divider orientation="vertical"` entre el botó del filtre i els tabs.
- Es manté el botó de reiniciar curs i el d'afegir curs al final del box.

### Traduccions
`dashboard.public_courses`, `dashboard.private_courses` i `dashboard.assigned_courses` a `ca.ts`, `es.ts` i `en.ts`.

## Auditoria dels endpoints del servidor per als "cursos assignats"

Es va repassar un per un tots els endpoints del servidor per trobar quin retorna els cursos de l'usuari actual. **Cap apart de `GET /api/v1/courses/` serveix**, i el seu propi contract ho confirma: *"Professors see their own courses; students see active enrolled courses; staff see all."*

Descartats:
- `GET /courses/{slug}/enrollment/` — "List enrolled students": retorna els **alumnes** d'un curs, no els cursos d'un alumne. Vista de professor.
- `GET /courses/{slug}/students/`, `/students/overview/`, `/enrollment/available/`, `/topics/{t}/overview/` — tot angle de professor.
- `POST /courses/{slug}/enrollment/` — "Add students to course": és escriptura, `user_ids` com a cos, professor only, i exigeix un `course_slug` de partida. No pot construir la llista.
- `GET /orgs/{org_slug}/courses/` — cursos de l'organització, no de l'usuari.
- `GET /users/me/settings/`, `/avatar/`, `/view-mode/` — cap camp de cursos.
- `GET /notifications/` — notificacions.

Conclusió: per a un alumne, `/courses/` **ja és** la llista d'assignats, i el backend ja filtra. Per això "Assignats" no aplica cap filtre propi.

### Semàntica del solapament
Un curs públic **també pot estar assignat**, i això és intencionat: els tres àmbits responen a preguntes diferents.
- "Públics" = què hi ha disponible al catàleg.
- "Assignats" = què té matriculat l'usuari (barreja de públics i privats).
- "Privats" = el subconjut privat dels seus assignats, no els privats que existeixin al servidor sense tenir assignats.

## Detalls tècnics i pendents del dashboard

- `getAllCourses` el comparteixen 8 fitxers més (`Home.tsx`, `Hero.tsx`, `MainLayout.tsx`, `TeacherLeaderboard.tsx`, `pages/teacher/Dashboard.tsx`, `Courses.tsx`, `Exercises.tsx`, `ExerciseList.tsx`, `Test.tsx`). Tots ara rebran `/courses/` en lloc de `/public/courses/`, així que els **recomptes de cursos** d'Home i Hero passaran a ser "cursos matriculats" i no "cursos públics". Si cal conservar el recompte antic, fa falta un mètode separat.
- Les dues caches són a nivell de mòdul (`allCoursesCache`, `publicCoursesCache`), així que el canvi d'endpoint no es veu fins que es rebuida la memòria. En desenvolupament n'hi ha prou amb recarregar.
- `rankedStudentsByCourse` continua retornant `[]` buit, de manera que la targeta del leaderboard mostra sempre "Sense dades".
- `getCourseProgress` i `getCoursePoints` llegeixen el progrés de `localStorage` directament en lloc d'utilitzar `dbProgress`, que és l'estat que es refresca amb l'API. Es queda desincronitzat després d'un canvi de curs.
- La clau `dashboard.my_courses` a `ca.ts` / `es.ts` / `en.ts` **no s'utilitza enlloc**: és text mort.
- Colors encara hardcodejades al fitxer: `#00685d` als borders de les 5 targetes, dels tabs i de "Continua studying"; `#00A896` al text dels tabs; `mode === 'dark' ? '#111827'` al fons de l'arrel. A `ProfilePage` el color corporatiu és el lila `#8400ff`.
- Verificació: `npx tsc --noEmit` net i `npx vite build` correcte.
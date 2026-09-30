# 30/09/2026

## Auditoria de l'endpoint de submissions i el 400 en enviar respostes

### El backend és correcte, el problema era el *body*

Es va auditar `POST /api/v1/courses/{course_slug}/topics/{topic_slug}/problems/{problem_slug}/submissions/` contra el servidor real (`algorien.com`, el mateix objectiu que el proxy de `vite.config.ts`). **L'endpoint, la ruta i el servei no tenien cap error**:

| Comprovació | Codi | Contracte | |
|---|---|---|---|
| Path | `courseService.ts:105` | `/api/v1/courses/{c}/topics/{t}/problems/{p}/submissions/` | ✅ |
| Slash final | sí | sí | ✅ |
| `baseURL` | `${API_BASE_URL}/api/v1` (`:13`) | `/api/v1` | ✅ |
| Content-Type | `application/json` (`:14`) | `application/json` | ✅ |
| Auth | `Authorization: Token ${token}` (`:21`) | `www-authenticate: Token` | ✅ |
| Body coding | `{code, language}` | `{"code": "..."}` | ✅ |
| Body test | `{answers}` | `{"answers": [<choice_id>,...]}` | ✅ |

Comprovacions executades:
- Problema `coding` (`variable-assignment`) amb `{"code":"x = 1\nprint(x)","language":"python"}` → `200 {"status":"accepted","submission_count":0}`. El camp extra `language` **no** molesta: sense ell també `200` (el backend l'ignora).
- Problema `test` (`full-program`) amb `{"answers":[3131]}` → `200 {"correct":true,...}`. Amb string `["3131"]` també `200`, i fins i tot amb un id inexistent `[999999]` → `200 {"correct":false}`.
- `Authorization: Token abc` → `401` amb `www-authenticate: Token`; `Authorization: Bearer abc` → `401` sense cap. Confirma que és DRF `TokenAuthentication`, igual que el que envia l'interceptor.

**Conclusió:** l'única manera d'aconseguir un `400` és enviar un body **sense `answers`**, és a dir `{code}` contra un problema `type: "test"`. El backend mai retorna 400 si hi ha `answers`.

### Causa arrel: `LessonPage` resolia problemes de test com si fossin de codi

`full-program` és `type: "test"`, però `LessonPage.handleRunTests` feia sempre `POST {code, language}`. S'hi arribava perquè el topic `warm-up-eadf` **barreja** 14 exercicis `coding` i 6 `test`, i `handleNext`/`handlePrevious` feien `flatMap` de tots els problemes sense mirar el `type`. A més el `catch (_) {}` de `handleRunTests` **amagava l'error**, de manera que a l'usuari no li sortia res i només veia el 400 a la consola.

### Correccions a `src/pages/courses/LessonPage.tsx`
- **Redirecció** de problemes `type: 'test'` a `/courses/:courseId/exam/:lessonId` amb `replace: true`. Cobreix URL directa, "Anterior"/"Següent" i qualsevol altra entrada.
- **L'error ja no s'amaga**: el `catch (_) {}` buit s'ha substituït per un que extreu el detall real del servidor (`err.response.data`, incloent-hi els arrays d'errors de DRF), el consola, el mostra a la consola de l'editor i llança una notificació.
- `handleRunTests` fa `return` si el problema és de test (ja redirigit), en lloc de deixar que el POST falli.

## Navegació d'activitats només de codi (`LessonPage.tsx`)

Abans "Anterior" i "Següent temari" recorrien **tots** els problemes (codi + tests) i, en arribar a un test, `problemPath` el redirigia a `/exam/...`, sacsejant l'usuari fora del fluxe d'exercicis.

- `isCoding = (p) => p?.type !== 'test'` i `problemPath(courseId, problem)` (retorna `/exam/:slug` per tests i `/:slug` per codi).
- `handlePrevious` i `handleNext` ara filtren amb `isCoding` i només avancen/retrocedeixen entre activitats de codi, travessant temes com abans. Si no hi ha més codi, `handleNext` surt del tema i torna al curs.
- `isFirstCoding` (calculat sobre la llista filtrada) **desactiva el botó "Anterior"** quan l'usuari és a la primera activitat de codi, als dos botons (l'`IconButton` de mòbil i el `Button` de desktop). El `<= 0` cobreix el cas en què l'activitat no es troba a la llista (`findIndex` retorna `-1`).
- Exemple real (`python-public-test` / `warm-up-eadf`): abans `variable-assignment` → "Següent" → `python` (test) ❌; ara → `addition-and-subtraction` (codi) ✅.

## Botó "Torna al curs" (`LessonPage.tsx`)

- Component reutilitzable `BackToCourseButton({ label, onClick, fontSize })` amb icona `ChevronLeft`.
- `handleBackToCourse` fa `persistViewState()` (desa cursor i scroll de l'editor) i navega a `/courses/:courseId`. Fa servir la ruta del client, no `history.back()`, així que sempre torna a la llista de temari encara que l'usuari hagi arribat des d'un enllaç directe.
- **Desktop**: just a sota de les `<Tabs>`, amb la mateixa línia `borderBottom`, mida `tabFontSize`.
- **Mòbil**: dins de la franja de 48px on abans hi havia les tabs.
- Nova clau i18n `lesson.back_to_course` als tres idiomes.

## Pestanyes de `LessonPage.tsx` a mòbil

- **Eliminades les tabs del layout mòbil.** Abans hi havia un segon `<Tabs>` duplicat (font 7.3px) que només servia per commutar entre enunciat i solució del profe. Ara a mòbil es veu directament l'enunciat + l'editor.
- **Desktop**: `ml: 2.5 * tabScale` a `.MuiTab-root` per tenir més separació entre pestanyes. `tabScale` va de 0.6 a 1.3 segons l'amplada de la columna 1, així que el gap escala sol (~12px → ~26px).

## Exam de test (`src/pages/courses/ExamPage.tsx`)

### El botó "Enviar" no es podia prémer
`disabled={!selectedAnswers.length || submitting || !!nextTest}` desactivava el botó a **totes** les preguntes excepte l'última del tema, perquè `nextTest` és el test següent del mateix tema. En `warm-up-eadf` hi ha 6 tests i només `full-program` era enviable. Es manté la restricció (és el fluxe seqüencial del test) però s'hi ha afegit un text explicatiu a sota del botó quan no és l'última pregunta, perquè el botó deshabilitat no sembli trencat.

### El resultat no es veia
El backend retorna `{ correct, choices }`, però el panel llegia `result.feedback`, un camp que **no existeix** a la resposta: sempre mostrava "Enviat correctament" sense indicar si s'havia encertat.
- El panel ara deriva de `result.correct` i renderitza la llista `choices` amb ✓/✕, `was_selected` i l'explicació de cada opció.
- `result.feedback` es manté com a suport per si el backend l'afegís al response de codi.

### Progrés i nota
- `handleSubmit` marquesa `mooc_global_progress` com a `true` **sigui correcta o falsa** la resposta. Ara només posa `true` si `res.correct === true`, i `'attempted'` si s'ha contestat malament.
- En cursos públics **sense matricula** el backend no persisteix res, de manera que `getChallengeSubmissions` tornava buit i la nota no apareixia mai. La nota fa fallback a `result.correct` (`exam.score` si és correcte, 0 si no).
- Si no es troba el tema del problema es llança un error explícit en lloc de construir la URL amb `topicSlug` buit.
- Els errors del servidor es mostren amb el detall real de `err.response.data` en lloc del genèric `err.message` ("Request failed with status code 400").

## Pestanyes i rail flotant (`src/pages/courses/CourseLessons.tsx`)

### `TAB_ITEMS` com a font única
Les 4 pestanyes (Teoria / Programació / Tests / Fitxers) es declaren una sola veu a la constant de mòdul `TAB_ITEMS`, amb `{ icon, labelKey, fallback }` (`BookOpen`, `Code`, `ClipboardCheck`, `Folder` de `lucide-react`). El mateix array alimenta les pestanyes del box i els botons del rail, de manera que les icones i els textos no es poden desincronitzar. Abans eren quatre `<Tab label={t(...)} />` escrits a mà.

### Barra dins de cada box
Les pestanyes eren una barra **compartida** per damunt de tots els continguts. Ara cada secció porta la seva pròpia barra a dalt del seu box, perquè l'usuari canviï de secció sense tornar a dalt.

- Extret `renderTabs()` com a helper local (`Box` + `Tabs`, `mb: 4`, indicador **`#8400ff`**). Els valors de mida del text i del farciment són diferents per rang i s'han ajustat després a la secció de pestanyes a mòbil.
- El bloc compartit s'ha eliminat perquè no quedi barra duplicada.
- `renderTabs()` s'insereix al inici dels 4 boxes: `mainTab === 0` (Teoria), `1` (Programació), `2` (Tests) i `3` (Fitxers).
- `renderExpandAll()` ("Expandeix-ho tot" / "Col·lapsa-ho tot") també s'ha extret i es crida als boxes 0 (Teoria), 1 (Programació) i 2 (Tests), mantenint el mateix abast que abans (`mainTab <= 2`). El box 3 (Fitxers) no el crida: és un estat buit i el botó no hi té sentit.

### Rail flotant vertical
Quan l'usuari baixa per llegir la teoria, la barra de pestanyes queda amunt i no té com arribar-hi. Es fa servir el `ref` que ja hi ha (`setTabsEl`) amb un **`IntersectionObserver`** sobre el contenidor de scroll (`scrollRef`):

- `showRail = !entry.isIntersecting && entry.boundingClientRect.top < rootTop`. La segona condició és essencial: només s'ha de mostrar el rail quan les pestanyes han sortit **per dalt**, no quan encara estan per sota de la vora inferior (el que passaria si el threshold no distingís de sentit).
- `rootBounds?.top` dóna la vora del contenidor; el `?? 0` evita que l'observador pugui llançar si `rootBounds` arriba a `null` en certs navegadors.
- El rail és una `p` flotant (pills) a la dreta (`right: { xs: 6, md: 20 }`, `top: 50%`) amb `borderRadius: 999`, `backdropFilter: 'blur(8px)'` i botons rodons de 36/44px. L'actiu es posa en `#8400ff`, la resta en `text.secondary`, cadascun amb `Tooltip` a l'esquerra.
- Apareix i desapareix amb `opacity` + `transform: translate(24px, -50%)` i `pointerEvents: 'auto' | 'none'`, de manera que un rail invisible no atrapa el clic.
- `handleRailTabClick(index)` fa `setMainTab(index)` **i** `scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })`: sense aquest scroll, canviar de secció des del rail deixava a l'usuari a la meitat del box nou.
- El contenidor ha canviat el padding de `px` a `pl: { xs: 3, md: 8 }` + `pr: { xs: 7.5, md: 10 }` perquè el rail no es pugui sobreposar al text.

### Reordenació de les lliçons de teoria
`theoryLessons` deixa de ser `course.content` i es construeix cada render en dos blocs:
1. Les lliçons **pendents**, en l'ordre original del curs.
2. Les lliçons **completades**, ordenades segons l'ordre en què s'han acabat (`doneOrder`).

L'ordre de finalització es desa a `localStorage` amb la clau `mooc_done_order_${courseId}` i es hidrata amb `JSON.parse` dins d'un `try/catch` (per si el valor està corrupte). `isTheoryDone(id)` llegint `progress[..._theory_<id>]` evita el `useMemo` perquè la llista és curta i el `useMemo` no compensa.

`markLessonAsDone` fa tres coses addicionals a part de marcar el progrés: afegeix la lliçó al final de `doneOrder` (traient-la primer per no duplicar-la), **tanca la lliçó automàticament** i fa scroll suau a dalt, perquè l'usuari vegi la següent lliçó pendent.

## Detalls tècnics i pendents

- `ExamPage` continua determinant `isMultiChoice` amb `choices.filter(c => c.is_correct).length > 1`, és a dir **es filtra pel camp `is_correct` que el backend exposa al client**. Per la mateixa raó, `getFullCourseDetail` (`courseService.ts:167`) assigna `choices` amb `is_correct` inclòs, de manera que l'answer key dels tests viatja al navegador. Amb la resposta correcta a la vista, l'usuari pot veure quina és sense respondre. Cal tractar-ho al backend.
- El backend retorna `is_correct` també dins de la resposta de l'POST (`{correct, choices: [{is_correct, was_selected}]}`), cosa que és funcional però torna a exposar la solució.
- `submitChallenge` (`courseService.ts:103`) és **agnòstic al tipus de problema**: accepta `{code}` i `{answers}` i és cada pantalla qui decideix el body. Aquesta classe de bug (400 per body incorrecte) es pot repetir en qualsevol pantalla nova. Una opció seria que el servei validés el tipus contra el problema (amb cache) i llencés un error explícit.
- `LessonPage` redirigeix els tests cap a `ExamPage`, però `ExamPage` no té el tractament equivalent: si s'hi entra amb un problema de codi, `choices` és `[]`, `exam.title` no existeix en el mapping de `getFullCourseDetail` (que l'anomena `subtitle`) i el POST s'envia amb `{answers: []}`, que el `handleSubmit` ni tan sols deixa enviar (`if (!selectedAnswers.length) return`).
- A `CourseLessons.tsx`, `renderExpandAll()` es crida als boxes 0 (Teoria), 1 i 2, però **no** al 3 (Fitxers). A Teoria el text "Expandeix-ho tot" és una mica enganyós perquè `toggleLessonExpand` sí que funciona allà, però el vocabulari sembla pensat per a Programació/Tests. A Fitxers, en canvi, la box és un estat buit i no cal el botó.
- El rail flotant és un element fix dins d'un `Box` amb `position: fixed` (l'arrel del component és `position: fixed; top: 64`), i el rail fa `position: absolute` respecte d'aquest. Per tant **no** es mou amb el scroll, que és el comportament buscat.
- `npx tsc --noEmit` net. `npx vite build` correcte (només l'avís esperat de chunks >500 kB per Monaco).

## Els dos boxes del resum, per temes i no per subtemes (`src/pages/dashboards/StudentDashboard.tsx`)

### Què canvia
Els boxes "Problemes codi" i "Exercicis test" del resum del curs es construïen amb `flatLessons.filter(...).slice(0, lessonsSliceLimit)`, és a dir una **llista plana d'activitats (subtemes) sense cap grup**. Ara cada fila és un **tema**, que és el que es volia veure.

- `getTopicSummaries(course, matches, budget, progress)` fa una fila per tema amb `key`, `id`, `title`, `total` (subtemes del tipus demanat) i `done` (d'aquests, quants estan superats).
- Descarta els temes amb `total === 0`: així el box de codi només ensenya temes que tenen exercicis i el de test, temes que tenen proves. Abans tots els subtemes de tots els temes es barrejaven al mateix box.
- `budget` continua sent `lessonsSliceLimit` (5 o 7 segons l'alçada de pantalla) i `hidden` és el nombre de temes que no hi caben, per indicar-los amb `dashboard.and_more`.
- Si el curs ve amb estructura plana (`course.content` sense temes), `getCourseTopics` sintetitza un únic tema sense títol; per això el `title` fa `getText(topic.title) || getText(course.title)`, perquè la fila no quedi sense etiqueta.
- Cada fila mostra el recompte `fetes/total` del tema a més de la barra de progrés, perquè es llegeixi quant falta i no només si és tot o res.

### Component compartit
`TopicList` substitueix el codi duplicat dels dos boxes. Reb `topics`, `hidden`, `icon`, `onOpen` i `moreLabel`; per props hi arriba tot el que els diferencia, de manera que afegir un tercer tipus d'activitat és una línia.

### Navegació
`openTopic(tab, topicId)` escriu les mateixes claus de `localStorage` que llegeix `CourseLessons` (`mooc_tab_<slug>` i `mooc_expanded_<slug>`) i navega a `/courses/<slug>`. Clicar un tema obre el curs a la pestanya correcta (1 = Programació, 2 = Tests) **amb el tema ja desplegat**, en lloc d'anar a una pàgina nova. `openTopic(1, ...)` per al box de codi i `openTopic(2, ...)` per al de test.

## Punts al costat de l'àvia del header (`src/components/Header.tsx`, `src/pages/courses/LessonPage.tsx`)

- El box de punts vivia a `LessonPage` amb `position: absolute; bottom: 60`, superposat al panell d'activitat i només visible en aquella pantalla. S'ha eliminat i els punts s'han mogut al header, al costat de l'àvia, perquè es vegin a totes les pantalles.
- **`usePoints()`** (nou hook al `Header`) fusiona `mooc_global_progress_<id>` i `mooc_shared_all_progress` amb la mateixa lògica que `getProgress` del dashboard, i retorna `Object.values(...).filter(v => v === true).length * POINTS_PER_LESSON` amb `POINTS_PER_LESSON = 10`.
- Escolta `lessonProgressUpdated` i `auth-state-change`, de manera que el recompte s'actualitza en superar una activitat sense recarregar la pàgina.
- **`PointsBadge`**: pastilla arrodonida (`borderRadius: 999`) amb copa de `lucide-react` i el número, amb `bgcolor: alpha('#8400ff', 0.15)` i `borderColor: alpha('#8400ff', 0.4)`. El `title` mostra "PUNTS: N".
- Es renderitza a desktop just abans de `UserAvatarMenu` i al menú mòbil al costat del nom d'usuari. **Si no hi ha sessió no es mostra**, perquè 0 punts no té sentit sense alumne.
- Import de `Trophy` a `LessonPage` esborat: ja no s'usa.

**Canvi de comportament a tenir en compte:** els punts de `LessonPage` eren només del curs obert (`allProblems` del curs actual × 10). Al header són **globals**, totes les activitats superades de tots els cursos, perquè el header no sap de quin curs es tracta. Si es vol el total per curs, caldria que el header dediqués el `courseId` de la ruta.

## `GET /users/me/settings/` al perfil (`src/services/profileService.ts`, `src/pages/ProfilePage.tsx`)

### Auditoria
Es va comprovar contra el servidor real que `GET /api/v1/users/me/settings/` existeix i està servit:

```
$ curl -i https://algorien.com/api/v1/users/me/settings/
HTTP/1.1 401 Unauthorized
www-authenticate: Token
allow: GET, PATCH, HEAD, OPTIONS
```

| Comprovació | Codi | Contracte | |
|---|---|---|---|
| Path | `profileService.ts:6` | `/api/v1/users/me/settings/` | ✅ |
| GET disponible | no s'usenava | `allow: GET, ...` | ❌ |
| Auth | `Bearer` → `Token` | `www-authenticate: Token` | ❌ |
| `username` | absent del tipus | present al 200 | ❌ |
| `avatar_url` | absent del tipus | present al 200 | ❌ |

### Els dos bugs que hi havia

1. **El GET no s'executava mai.** `PROFILE_URL` només s'usava al `PATCH` de `updateProfile`. No hi havia cap `axios.get(PROFILE_URL)` en tot el repo, malgrat que el backend el serveix.
2. **`authHeaders()` enviava `Bearer`** quan el servidor és DRF `TokenAuthentication`. `api.ts:21` i `courseService.ts:21` ja hi anaven bé amb `Token`; `profileService` era l'únic que es va quedar a `Bearer`, cosa que feia que el `PATCH` de "Desa els canvis" retornés `401` en silenci.

### Consequència: tres camps del formulari eren deducits, no reals
En no cridar el GET, `readStoredProfile()` hidratava tot des de `localStorage.currentStudent`, i el login (`StudentDashboard.handleLogin`) només hi desa `name` i `email` que venen del backend. Els altres dos camps quedaven buits i es deducien així:

| Camp | Deduït de | Valor real |
|---|---|---|
| Nom | `parts[0]` (1a paraula del `name`) | `first_name` |
| Cognoms | `parts.slice(1).join(' ')` (la resta) | `last_name` |
| Nom d'usuari | `email.split('@')[0]` | `username` |

El camp "Nom d'usuari" és `readOnly` i el PATCH no l'accepta, de manera que un valor mal deduït era **irreparable** per l'usuari.

### Corrections
- `authHeaders()` passa a `Token ${token}`, alineat amb la resta de serveis.
- **`fetchProfile()`** nou, `GET PROFILE_URL`, i `ProfileUser` completat amb `username` i `avatar_url`.
- Estat **`username`** nou a `ProfilePage`; el `TextField` llegeix l'estat en lloc de `stored.username`, que era un valor fix que no es refrescava mai.
- El GET és la **font de veritat** en muntar la pàgina: sobreescriu `firstName`, `lastName`, `email` i `username`. **`localStorage` queda de fallback**, de manera que si el GET falla el formulari no apareix buit.
- **`avatar_url`** del GET es fa servir i, només si no hi és, cau a `GET /users/me/avatar/`. Abans sempre es cridava el segon endpoint.
- **`mirrorProfileToStorage()`** copia els camps del GET dins de `currentStudent` i llança `auth-state-change`, perquè el nom del Header i el dashboard deixin de dependre del que va arriving del login.

**Avís:** no s'ha pogut provar el GET ni el PATCH amb un token real perquè no hi ha credencials a l'entorn. El que sí està confirmat és el `401` amb `www-authenticate: Token` i l'`allow: GET, PATCH`. Si el `PATCH` tornés a fallar, el `catch` mostra el detall real de `err.response.data` via `extractProfileErrors`, així que es veurà a la UI en lloc de fallar en silenci com abans.

## Barra de pestanyes a mòbil: scroll horitzontal i fletxes (`src/pages/courses/CourseLessons.tsx`)

### El problema
A `xs` les 4 pestanyes (Teoria / Programació / Tests / Fitxers) no caben a cap mòbil. El rail flotant ja funcionava a mòbil perquè la icona no necessita espai per al text, i les pestanyes es quedaven sense cap sortida: no hi havia scroll, no hi havia fletxes, i el text era tallat pel `borderBottom`.

### El canvi estructural
`isXs = useMediaQuery(theme.breakpoints.down('sm'))` commuta només el que cal:

- **`variant={isXs ? 'scrollable' : 'standard'}`** i **`scrollButtons` fora**. Es tria `scrollable` en lloc d'afegir un `overflowX: 'auto'` a mà perquè MUI posa la pestanya seleccionada dins de vista en canviar de tab. Sense això, arribant des del rail flotant es podia quedar seleccionada una pestanya fora de pantalla. A `md` es queda en `standard`, que és el comportament original.
- **`justifyContent: { xs: 'flex-start' }`** a `.MuiTabs-list`. Centrar un contenidor flex que desborda **talla el costat esquerre i el deixa inalcançable** amb el scroll: es veu correctament, però la primera pestanya no s'hi pot arribar. Sense valor a `md` a propòsit, perquè el `center` que hi havia abans anava sobre una classe que no existeix (vegeu el bug de MUI 9 de més avall) i era codi mort; declarar-ho a `md` hauria centrat les pestanyes al desktop.
- Totes les regles noves són a `xs` (`[theme.breakpoints.down('sm')]` o `display: { xs: ..., md: 'none' }`). **A `md` no hi ha cap declaració nova.**

### Fletxes pròpies, no les de MUI
Les fletxes són **germans** de les pestanyes dins d'un `Stack direction="row"`, no els `scrollButtons` del propi `<Tabs>`: els de MUI van superposats als extremits i, amb 4 pestanyes i `px`, es menjaven el text. El `Box` intermedi porta `flex: 1` + `minWidth: 0` (sense `minWidth: 0` un flex item no s'encolleix i els botons són expel·lits cap fora).

- `scrollTabs(dir)` fa `scrollBy({ left: dir * max(160, clientWidth * 0.8), behavior: 'smooth' })` sobre l'element que fa scroll.
- Les fletxes es **desactiven als extrems**: un `useEffect` escolta l'`scroll` i el `resize` del scroller i calcula `scrollLeft > 1` i `scrollLeft + clientWidth < scrollWidth - 1`. Sense això la fletxa esquerra no fa res quan ja s'és al principi, i la dreta no fa res al final. Es reexecuta en canviar de `mainTab` perquè el `<Tabs>` es remunta.
- Activa: icona `#8400ff` sòlida sobre fons transparent, 40px de cercle i icona de 26px. Desactivada: mateix morat atrofellat, perquè es vegi que és un botó però que no hi ha res més a desplaçar. Un `opacity` global a tot el botó feia que l'estat actiu i el desactivat es veiexsen iguals.
- `aria-label` amb les claus `lesson.tab_prev` / `lesson.tab_next`, afegides a `ca`, `es` i `en`.

### El bug de classe que ho trencava tot
Al principle les fletxes es veien sempre esblanides i **no desplaçaven res**. Era un sol problema, no dos. En `@mui/material` **9.4.0** (el del projecte) la classe de la fila de pestanyes ja **no** es diu `.MuiTabs-flexContainer` sinó `.MuiTabs-list`, i l'element amb `overflow-x: auto` és un altre:

```
.MuiTabs-root        ← on apunta el ref de <Tabs>
  └ .MuiTabs-scroller  ← overflow-x: auto  (AQUEST fa scroll)
      └ .MuiTabs-list  ← display: flex    (les pestanyes)
```

El `querySelector('.MuiTabs-flexContainer')` tornava `null`, i això encadenava els dos simptomes: l'efecte feia `return` sense registrar res, `canScrollLeft`/`canScrollRight` es quedaven en `false`, les **dues fletxes quedaven sempre `disabled`** (d'aquí l'opacitat) i `scrollBy` rebia `null` (d'aquí que no mogués res). Els selectors CSS de `justifyContent` i d'ocultar la barra de scroll anaven sobre la mateixa classe morta. Confirmat llegint `node_modules/@mui/material/Tabs/Tabs.js`, no suposant-ho. Ara hi ha un `getTabsScroller()` com a únic punt on buscar l'element.

De la regla que amaga la barra de scroll se n'ha retirat el codi propi: MUI ja la oculta sol amb `hideScrollbar` quan `scrollButtons` és `false`, així que era redundants.

### Mida del menú i sense marges laterals
- **Menú més gran a `xs`**: `fontSize: { xs: '1.2rem', md: '0.95rem' }`, `py: { xs: 2, md: 1.5 }`, `px: { xs: 1.75, md: 5 }`, `minHeight: { xs: 60, md: 0 }`, `minWidth: { xs: 50, md: 90 }` i `MuiTabs-indicator` `height: { xs: 4, md: 3 }`. S'ha reduït el `px` de 3 a 1.75 i el `minWidth` de 90 a 50 perquè amb el text a 1.2rem les pestanyes desborden molt més i es veuen massa separades; el `minWidth: 90` que posa MUI per defecte era el que consumia espai.
- **Sense marges laterals**: el marge no venia de la barra sinó del contenidor de scroll, `pl: { xs: 3, md: 8 }` i `pr: { xs: 7.5, md: 10 }` (aquest darrer reserva l'espai del rail). Es compensen amb `ml: { xs: -3, md: 0 }` i `mr` negatiu a `xs`. Cal **treure el `width: '100%'`** de la barra: amb un ample fixa el marge negatiu només desplaça l'element i no l'eixampleix, i la barra començaria a x=0 però acabaria 84px abans de la vora dreta. Sense `width`, i sent un contenidor flex de nivell de bloc, el marge negatiu l'estira fins a les dues vores.
- El rail **no es xoca** amb res: apareix quan la barra ja ha sortit de pantalla (`showRail` ve de `!isIntersecting && top < rootTop`), de manera que quan el rail és visible la barra no ho és. La reserva de `pr: 7.5` continua sent necessària per al contingut de les llistes, que sí que passa per sota el rail; només la barra queda a vora a vora.

## Detalls tècnics i pendents (tancament del dia)

- Els punts del header són **globals**, no per curs (vegeu la secció de punts). És una decisió presa perquè el header no coneix el curs actiu; si es vol el total per curs, cal passar-li el `courseId` de la ruta.
- `getTopicSummaries` fa `getText(topic.title) || getText(course.title)`, un aplec per als cursos amb estructura plana on `getCourseTopics` sintetitza un tema sense títol.
- `openTopic` escriu a `localStorage` i en captur errors amb `try/catch` per no trencar la navegació en mode privat.
- L'organització de `ProfilePage` **no s'envia a cap endpoint**: el `PATCH /users/me/settings/` no accepta organització, continua sent només visual.
- `App.tsx:6` importa `LessonTopic` des d'un directori anomenat literal `${courseId}/${lesson.id}`, fruit d'una interpolació de path accidental. Funciona perquè el nom del fitxer hi coincideix, però és un path esborrany; es va proposar moure'l a `pages/courses/LessonTopic.tsx` i es va deixar com estava.
- La barra de pestanyes de `CourseLessons` queda **a vora a vora a `xs` per l'esquerra però no del tot per la dreta**: el pare té `pr: { xs: 7.5 }` (60px) i la barra compensa amb `mr: { xs: -6 }` (48px), així que queden **12px de marge residual a la dreta**. Amb `-7.5` seria del tot a vora a vora. S'ha deixat en 12px perquè deixa aire entre la fletxa dreta i la vora de la pantalla.
- `fontWeight: 900` a `.MuiTab-root` de `CourseLessons` **s'aplica també a `md`**. És un canvi que aplica a tots els rangs i pot alterar el desktop; si l'objectiu era només móbil, hauria de ser `fontWeight: { xs: 900, md: 700 }`.
- La mida del menú a `xs` (`1.2rem`, `px: 1.75`, `minWidth: 50`) s'ha ajustat a cegues, sense poder obrir el navegador per veure'l. Amb 4 pestanyes que desborden hi ha més scroll del que hi havia i les fletxes tenen més feina; el primer lloc on tocar si sembla excessiu és el `fontSize`, no el `px`.
- La cerca de l'element amb scroll depèn de la classe interna `.MuiTabs-scroller` de MUI. Si algun dia s'actualitza la versió de `@mui/material` cal reverificar els noms (`Tabs.js`, slots `root` / `scroller` / `list`); el `getTabsScroller()` és l'únic punt a revisar.
- Verificació final del dia: `npx tsc --noEmit` net i `npx vite build` correcte (només l'avís de chunks >500 kB de Monaco).
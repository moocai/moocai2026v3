# 17/09/2026

## Login: registre i recuperació de contrasenya (`src/features/student/Login.tsx`)

### Formulari amb 3 vistes
- Nou control d'estat `view` amb les vistes `login`, `register` i `forgot`.
- La vista de login manté username + password; el label passa a ser "Username or email".
- Afegits els botons "Has oblidat la contrasenya?" i "Crear un Compte".
- Pantalla de confirmació "Compte creat correctament" amb avatar `Check` i botó per tornar al login.

### Registre de compte
- Formulari complet amb: avatar (upload + preview via `URL.createObjectURL`), Nom, Cognoms, Email, Nom d'usuari, Organització (per ara `Select` només amb "CIFO BCN La Violeta"), Contrasenya i Confirmació de contrasenya.
- Validació que ambdues contrasenyes coincideixin (error "Les contrasenyes no coincideixen").
- `handleRegister` crida `authService.login(regUsername, regPassword)`; en cas d'èxit mostra la pantalla de confirmació, si no mostra l'error.
- Card més ampla (640px) amb scroll intern vertical (mòbil: `calc(100vh - 170px)`).

### Recuperació de contrasenya
- Vista "forgot": camp d'email + missatge "Si existeix un compte..." i botó per enviar (per ara només UI, no crida cap API).

## Configuració d'URLs i proxy de deploy

### `public/_redirects`
- Afegida la regla `/api/*  https://algorien.com/api/:splat  200` per proxejar les crides a l'API des del hosting estàtic.

### authService.ts (`src/services/authService.ts`)
- `BASE_URL` passa a ser `import.meta.env.VITE_API_URL || ''` + `/api/v1` (abans hardcoded a `https://algorien.com/api/v1`).

### courseService.ts (`src/services/courseService.ts`)
- `API_BASE_URL` passa a ser `import.meta.env.VITE_API_URL || ''` (eliminat el fallback hardcoded a algorien.com).

## Hero / Dashboard: eliminades les dades fake

### Hero.tsx (`src/components/Hero.tsx`)
- `getStudentCount` ara retorna `0` (eliminada la lectura d'estudiants locals de `localStorage`).

### StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)
- Eliminada la llista local d'estudiants de `localStorage`; el leaderboard torna `[]` i les stats només depenen dels cursos carregats de l'API.

## LessonPage: editor Monaco + visualització en temps real (`src/pages/courses/LessonPage.tsx`)

### package.json
- Afegida la dependència `@monaco-editor/react ^4.7.0`.
- `react-router-dom` actualitzat de `^6.30.3` a `^7.18.4`.

### Editor Monaco
- El `<textarea>` es substitueix per l'`Editor` de `@monaco-editor/react` (llenguatge `python`, tema `vs-dark`, minimap desactivat), tant en el layout mòbil com en l'escriptori.
- La tramesa de codi a `submitChallenge` passa per `userInputRef.current` (`{ code: userInputRef.current }`).

### Layout escriptori
- Nova distribució: **editor (esquerra) + panell de visualització en temps real (dreta, 50%)**, amb un `iframe` que renderitza `srcDoc={userInput}` (`sandbox="allow-scripts"`).
- **Consola ancorada a la part inferior** (height 180), substituint la columna 3 lateral.
- Eliminada la finestra popup de consola (`handleOpenConsole` i el `useEffect` de sincronització).
- Capçalera negra comuna (60px) que cobreix l'editor i el panell de visualització, amb els botons de reset ("RotateCcw") i "Enviar" (botó d'estil blanc/negre).
- Eliminat el drag per redimensionar l'editor (es treu `editorPct`; només la columna 1 continua sent redimensionable amb `col1Pct`).
- El panell de visualització s'omple amb fons `#1e1e1e`, text del document injectat de color blanc per defecte (sobre fons transparent) i contingut amb `padding-left: 14px`.
- Punts (`Trophy`) i botons de navegació (Anterior/Següent) a la part inferior de la columna 1 (absolute, `bottom: 55`).

### Layout mòbil
- Afegit el **panell de visualització en temps real** entre l'editor i la consola: capçalera negra "Visualització" (36px) + `iframe` amb `scrolling="auto"`, text blanc i fons transparent.
- El contingut de la visualització es renderitza dins un contenidor `flex: 1; height: 0; minHeight: 0` perquè el scroll vertical intern de l'iframe funcioni.
- Capçalera de la **consola mòbil** actualitzada a l'estil nou: `CONSOLE` blanc/900 (40px), border segons tema; consola amb `mb: 70px` i `mt: -8` a sobre de la navegació fixa (70px).

### Scrollbars personalitzats
- Afegits els estils de scrollbar (matx amb `index.css`) al `<style>` injectat als `srcDoc` dels iframes (mòbil i escriptori): thumb `#8400ff` amb radius 4px, track `#0a0a0a`, amplada 6px, més `scrollbar-width: thin`.

### Navegació entre exercicis
- `handlePrevious` / `handleNext`: ara naveguen per slug entre problemes consecutius del curs (`/courses/{courseId}/lessons/{slug}`); si no n'hi ha, tornen a la pàgina del curs.


# 18/09/2026

## Registre connectat a l'API (`src/services/register.ts`)

### Nou servei `register.ts`
- `loadRegistrationData()`: fa `GET /api/v1/users/register/` i retorna `{ organizations, default_organization_id, default_avatar }`.
- `registerUser(payload)`: fa `POST /api/v1/users/register/` amb `FormData` (multipart) — inclou `avatar`, organització (ID numèric), i guarda el `token` a `localStorage` si el servidor el retorna.
- `extractRegisterErrors(error)`: recorre recursivament els objectes/arrays de l'error de l'API i els mostra units; fallback a missatge genèric.
- Exporta les interfícies `Organization`, `RegistrationInfo` i `RegisterPayload` (`first_name`, `last_name`, `email`, `username`, `password1`, `password2`, `organization?`, `default_avatar?`, `avatar?`).

### Login.tsx (`src/features/student/Login.tsx`)
- `useEffect` inicial que carrega les organitzacions i l'avatar per defecte (`loadRegistrationData`) i preselecciona l'organització per defecte del servidor.
- `handleRegister` ara crida `registerUser(...)` amb les dades del formulari (organització només si n'hi ha seleccionada; avatar pujat o el de defecte) — ja no fa servir `authService.login`.
- Els errors de registre es mostren amb `extractRegisterErrors` (missatges del backend).
- El `Select` d'Organització ja no és `required`: inclou l'opció "Sense organització" i es poblada des de l'API.

### authService.ts (`src/services/authService.ts`)
- Afegit el mètode `register(payload)` que delega a `registerUser` de `register.ts`.

## submitChallenge amb llenguatge (`src/services/courseService.ts`)
- El payload de `submitChallenge` ara accepta `language?: string` (per enviar `{ code, language }` des de l'editor).

## Refactor: lògica de Monaco a `src/utils/monaco.ts`

### Nou fitxer `src/utils/monaco.ts`
- Extracció de tot el relacionat amb l'editor de Monaco, perquè `LessonPage.tsx` sigui més llegible:
  - `handleEditorBeforeMount(monaco)`: registra el provider de completions d'**autocompletat de Python** (~60 mots clau, builtins, mètodes de llistes/diccionaris/strings i f-strings), amb tipus `CompletionItemKind`, snippets i `documentation` en català. Es desa a `window.__pythonCompletionProvider` i es fa `dispose()` de la instància anterior per evitar duplicats.
  - `getMonacoEditorOptions(minimapEnabled)`: opcions compartides de l'editor (`fontSize: 13`, `automaticLayout`, `quickSuggestions`, `acceptSuggestionOnEnter: 'on'`, `tabCompletion: 'on'`, `parameterHints`, `formatOnType`, `formatOnPaste`, minimap configurable). Els `'on'` es fixen com a literals (`as const`) perquè el type-checking de `IStandaloneEditorConstructionOptions` funcioni.

### LessonPage.tsx (`src/pages/courses/LessonPage.tsx`)
- Trets els ~130 línies del `handleEditorBeforeMount` inline del component; ara s'importa de `../../utils/monaco`.
- Els dos `<Editor>` (mòbil i escriptori) fan servir `options={getMonacoEditorOptions(false)}` (minimap desactivat) i `options={getMonacoEditorOptions(true)}` (minimap actiu), eliminant la duplicació d'opcions.


# 21/09/2026

## Carregador local i diferit de Monaco (sense CDN)

### `src/utils/monacoCore.ts` (nou)
- Entrada pròpia de Monaco: importa `editor.api` + totes les contribucions de l'editor (find, suggest, hover, diff, format, quick access, inlay hints, sticky scroll, etc.) però **només els llenguatges que fem servir** (Python, TypeScript i JavaScript) en lloc del `monaco-editor` sencer (~90 llenguatges).
- Exporta `{ ...editorApi, typescript }` perquè el namespace `monaco.typescript` estigui disponible (com amb l'import complet).
- Inclou el CSS de codicons (`.css` importat des de `node_modules`).

### `src/utils/monaco.ts`
- Nou `loadMonaco()`: carrega Monaco de manera **diferida** (només en obrir una lliçó) fent `import()` dinàmic de `monacoCore` i dels **workers** `editor.worker` i `ts.worker` (imports `?worker` de Vite); configura `MonacoEnvironment.getWorker` perquè el label `typescript`/`javascript` usi el `TsWorker`. Idempotent. Passa la instància a `loader.config({ monaco })` (així `@monaco-editor/react` no baixa res de la CDN).
- `registerMonacoThemes(m)`: defineix els temes personalitzats `mooc-light`, `mooc-dark` i `mooc-fancy` amb `defineTheme` (hereten el lila corporatiu `#8400ff` en cursor, selection, suggeriments i number active).
- `getMonacoEditorTheme(mode)`: tradueix el mode clar/fosc/fancy de l'aplicació als noms dels temes de Monaco.
- `setupTypescriptDefaults(m)`: configura l'IntelliSense de TS/JSX (`jsx: React`, `module: CommonJS`, `noEmit: false` per permetre `getEmitOutput`, `esModuleInterop`, `allowJs`, ...) i `addExtraLib` amb els **tipus mínims de React/JSX** perquè la validació TS funcioni al runtime.
- `registerPythonCompletionProvider(m)`: ara viu a `src/utils/monaco.ts` (abans generat inline) amb ~60 suggeriments de Python en català.

### `src/env.d.ts`
- Afegida la declaració de mòdul `*?worker` perquè els imports de workers de Vite tinguin tipus.

### `src/main.tsx` i `package.json`
- Eliminats els `future` flags de `BrowserRouter` (`v7_startTransition`, `v7_relativeSplatPath`) perquè són per defecte a `react-router-dom` v7 (`^7.18.4`).

> **Optimització:** amb la càrrega local i diferida, el bundle inicial baixa de ~1,4 MB gzip a ~0,4 MB gzip; Monaco queda en un *chunk* a part (~1 MB gzip) que només es descarrega en obrir una lliçó.

## LessonPage: multi-model, render React en viu i diagnòstics (`src/pages/courses/LessonPage.tsx`)

### Multi-model per fitxer (pestanyes `python.py` / `React.tsx`)
- Un únic `<Editor>` amb **un model per fitxer** (`file:///lesson/<curs>/<lliço>/python.py` i `React.tsx`).
- Pestanyes de fitxer `EditorFileTabs` que canvien de llenguatge en temps real: `python` (extensió `.py`) ↔ `typescript` amb model `.tsx` (resaltat JSX i validació de tipus reals).
- Estat separat per fitxer: contingut (`codeByLang`), cursor, selecció i scroll (`viewStateRef` via `saveViewState` / `restoreViewState`).
- Els models de la **lliçó anterior es disposen** en canviar de lliçó perquè no s'acumulin a la memòria de Monaco.

### Persistència
- El codi es desa a `localStorage` com a **objecte per fitxer** (`{ python, react }`) amb clau per usuari/lliçó i **migració del format antic** (string → objecte).
- L'estat de vista (cursor/selecció/scroll) de cada fitxer es desa a la clau `{...}_view` i es restaura tant en canviar de fitxer com en tornar a obrir la lliçó (i en desmuntar la pàgina).

### Render en viu real de React (`src/components/ReactLivePreview.tsx`, nou)
- El TSX de l'alumne ja **no s'injecta en un `<iframe>`**: es **transpila de debò** amb el worker de TypeScript de Monaco (`getEmitOutput`) i es renderitza amb el **React real de l'aplicació** (`createRoot`).
- `require` shim pels mòduls `react`, `react-dom` i `react-dom/client`; es busca el component exportat (`App`, `default`, etc.).
- `PreviewErrorBoundary` captura errors de render i els mostra a pantalla amb debounce de 500 ms.
- En el mode **Python** es mostra "no necessita renderitzar". El `Codetest`/Executar local en React només marca l'execució finalitzada.

### Solució Profe amb `DiffEditor`
- La pestanya "Solució Profe" ara fa servir el `DiffEditor` de Monaco comparant `teacherSolution` (original) amb el codi de l'alumne (modified): **colze a colze al desktop** i mode **unificat** (`renderSideBySide: false`) al mòbil. Fallback si l'exercici no té solució.

### Validació en temps real
- `onValidate` intercepta els marcadors de Monaco i el nou `EditorDiagnosticsBadge` mostra a la capçalera de l'editor el **recompte d'errors i avisos** (dots vermells/grocs amb número, severities 8/4).

### Integració i petites coses
- Al muntar la lliçó es fa `loadMonaco()` i es registren temes, defaults de TS/JSX i el provider de Python; el tema de Monaco es sincronitza amb el mode de l'aplicació.
- Botó "ull" (`Eye`/`EyeOff`) al mòbil per mostrar/amagar el panell de live render.
- `handleRunTests` envia `{ code, language: selectedLanguage }` a `submitChallenge` (ara accepta `language`).

## Nova guia `docs/monaco.md`
- Document de referència de `@monaco-editor/react` al projecte: característiques del paquet, l'estat d'integració actual (editor, multi-model, temas, `DiffEditor`, `onValidate`, `Loader` local/diferit) i optimització del bundle.
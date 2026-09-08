# 24/07/2026

## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)

### Persistència de tabs i topics expandits
- `mainTab` i `expandedLessons` es persisteixen a `localStorage` amb claus `mooc_tab_{courseId}` i `mooc_expanded_{courseId}`.
- Quan l'usuari torna al curs, veu el mateix tab seleccionat i els mateixos topics desplegats.

### Light theme: tabs i borders
- Tabs: color text `#000` en light, `#fff` en dark (tant per defecte com seleccionades).
- Borders dels topics (Teoria, Programació, Tests): `#8400ff` en light, `divider` en dark.

## LessonPage.tsx (`src/pages/courses/LessonPage.tsx`)

### Layout editor/consola redimensionat
- Consola: canviada de `50%` a `30%` d'amplada.
- Editor (`flex: 1`): ocupa automàticament el `70%` restant.

### Light theme: tabs centrats i color negre
- Tabs centrades amb prop `centered` + `justifyContent: 'center'` (eliminat `variant="scrollable"`).
- Tab text: `#000` en light, `#fff` en dark (tant per defecte com seleccionades).
- Tabs amb `mt: 2.5` i `mb: 2`.

### Light theme: tots els borders negres
- `borderBottom`, `borderTop`, `borderRight`, `borderLeft`: tots `#000` en light, `divider` en dark.
- Aplicat a: header, progress bar, tab bar, columnes 1-2-3, consola header/footer, botons de navegació, botons d'editor.

### Light theme: text negre al contingut
- Subtitle, objective label i problem text (pestanya 0): negre en light.
- `run_code` placeholder: negre en light.
- `debug_console` label: negre en light, blanc en dark.
- Points label: negre en light.
- Botons editor (reset, consola): border negre en light.

### Layout 100% viewport sense scroll
- Root Box: `position: fixed`, `inset: 0`, `overflow: hidden` (eliminat `height: '91.5vh'`, `width: '100vw'`, `mt: 10`).
- Tota la pàgina ocupa 100% height i width, sense scroll vertical.

### Footer i columnes
- Wrapper 3 columnes: `mt: 3` (sense overflow clipping).
- Footer: `height: 56`, botons centrats amb `alignItems: 'center'`, sense `mt`.

### Consola amb fons fosc
- Consola: `bgcolor: '#1e1e1e'` (mateix que editor).
- Header consola: `bgcolor: 'black'`, text blanc sempre.

### Points Box: posició absoluta i elevació
- Points Box canviat de flux flex a `position: absolute`, `bottom: 0`, `left: 0`, `right: 0`, `zIndex: 1`.
- Columna 1: afegit `position: 'relative'` per ser el referent de posicionament absolut.
- Quan `isMdUp` (min-height ≥ 900px): `transform: translateY(-30px)` per elevar el box.
- `bgcolor: alpha('#8400ff', 0.3)` (light) / `alpha('#8400ff', 0.2)` (dark).
- `borderTop: '1px solid #8400ff'` sempre visible.

### Contingut amb padding inferior
- Área de scroll (pestanyes): `pb: isMdUp ? 8 : 6` per evitar que el contingut quedi tapat pel Points Box absolut.

### 3 Columnes: sense overflow clipping
- Eliminat `overflow: 'hidden'` / `overflow: 'clip'` del wrapper de 3 columnes per permetre que el Points Box absolut pugui elevar-se amb `translateY`.


# 07/09/2026

## Login amb servidor (auth)

### authService.ts (`src/services/authService.ts`)
- `login(username, password)` ara crida a `POST /api/v1/users/auth/login/` amb `{ username, password }` (JSON).
- Base URL: `https://algorien.com/api/v1`.
- Es guarda només el `token` a `localStorage` (clau `token`).
- Eliminats `getMe` i `getCurrentUser`; afegit `getToken()`.
- `logout()` crida a `POST /api/v1/users/auth/logout/` (neteja local si el servidor no respon).

### StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)
- `handleLogin` ara és `async` i rep el formulari (`username`, `password`), crida a `authService.login(username, password)` i, si el servidor retorna l'usuari, entra al dashboard.
- S'elimina l'estat d'ànim de targetes/creació/eliminació d'estudiants (`handleCreateStudent`, `handleDeleteStudent`, `handleLogoutAction`).
- Del leaderboard només es carreguen els estudiants locals de `localStorage` (ja no els fake).
- Afegit estat `loginLoading` per a la roda de càrrega al botó.

### Login.tsx (`src/features/student/Login.tsx`)
- Formulari simple amb camps **Username** i **Password** (eliminades les targetes d'estudiants i el PIN).
- Botó "Iniciar Sessió": es desactiva i mostra una roda de càrrega (`CircularProgress`) al costat del text mentre comprova amb el servidor.
- A la prop `onSubmit` que permet retorn de `Promise`; afegida la prop `loading`.

### AuthContext.tsx (`src/contexts/AuthContext.tsx`)
- Adaptada la signatura de `login` a `{ username, password }`.
- Eliminada la dependènciia de `getMe` a la inicialització (només es llegeix el `token` de `localStorage`).

### Usuaris fake eliminats
- Eliminats els 3 estudiants fake (`Marc`, `Jordi`, `Miquel`) de `src/data/students.ts`.
- Eliminat el fitxer `src/data/students.ts` sencer (inclosa la interfície `Student`).
- Actualitzats `Hero.tsx` i `StudentDashboard.tsx` perquè no carreguin els usuaris fake (només usuaris locals de `localStorage`).

### Endpoints utilitzats
- `POST /api/v1/users/auth/login/` → retorna `{ token, user }` i set a session cookie.
- `POST /api/v1/users/auth/logout/` → invalida la sessió.


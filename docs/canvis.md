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


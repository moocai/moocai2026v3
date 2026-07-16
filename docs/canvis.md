# 16/07/2026

## StudentDashboard.tsx (`src/pages/dashboards/StudentDashboard.tsx`)

### Lògica responsive per alçada de pantalla
- Afegit `useMediaQuery('(min-height:900px)')` per detectar l'alçada de la pantalla.
- Variable `lessonsSliceLimit`:
  - `< 900px` → **5** elements (topics i subtopics).
  - `≥ 900px` → **7** elements (com abans).

### Cards amb mode compact
- Afegit prop `compact` al component `DashboardCard`.
- Quan `compact` és `true` (< 900px), `minHeight` baixa de 390 a **260**.
- Les 5 cards del resum (Progrés general, Topics del curs, Subtopics del temari, Leaderboard, Més estadístiques) apliquen `compact={!isMdUp}`.

### Centrat del cercle de progrés
- Wrapper flex afegit al voltant del cercle amb `flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'` per centrar-lo dins la card.
- `DashboardCard` té `height: '100%'` per estirar-se dins la cel·la del Grid.
- El `Grid` de Progrés general té `height: '100%'` per assegurar l'estirament.

### Mides del cercle de progrés
- **`≥ 900px`**: `190 × 190`
- **`< 900px`**: `150 × 180`
- Text del percentatge:
  - `≥ 900px`: variant `h4`, `2.5rem`
  - `< 900px`: variant `h6`, `1.5rem`

### Ajustaments de posicionament per < 900px
- `ml: 1` al `CircularProgress` de fons (el gris) quan `< 900px`.
- `margin: 1` al `Box` del text del percentatge quan `< 900px`.

### Auto-save reflectit al dashboard
- L'auto-save de LessonPage cada 10s ara també marca la lliçó com `'attempted'` a `mooc_global_progress` (si encara no estava marcada com a completada).
- `getCourseProgress` i `getCoursePoints`: només compten lliçons amb valor `=== true` (completades), no les intentades (`'attempted'`).
- Status chips de les cards (Topics del curs / Subtopics del temari): només mostren completat si el valor és `=== true`.
- **"Continua estudiant"**:
  - Intentades (`'attempted'`): barra al **50%** i text "50%".
  - Completades (`true`): barra al **100%** i text "100%".
  - Un sol botó amb icona `InfoOutlinedIcon` enlloc de dos.
  - Tooltip "Continuar l'activitat" (`placement="top"`) que apareix al fer hover.
  - Botó navega directament a la lliçó sense paràmetres de tab.

### Imports
- Afegit `Tooltip` als imports de `@mui/material`.


### Color del text dels tabs de curs
- Color del text dels tabs de nom de curs canviat a blanc (`#fff`) amb `!important` per sobreescriure estils per defecte de MUI.


## CourseLessons.tsx (`src/pages/courses/CourseLessons.tsx`)

### Eliminació completa de Sidebar i Right Column
- **LEFT SIDEBAR eliminada**: s'ha eliminat completament l'accordion syllabus de l'esquerra, incloent `renderSidebarTabs()`, l'estat `sidebarOpen`, el botó de toggle `PanelLeftClose`, i tot el JSX del sidebar.
- **RIGHT COLUMN eliminada**: s'ha eliminat completament la columna dreta amb anchor links i challenge panel, incloent l'estat `showRightPanel`, el botó de toggle dret, i tot el JSX.
- **Mobile Drawer eliminat**: s'ha eliminat el `Drawer` mòbil del syllabus, l'estat `mobileSyllabusOpen`, i el botó de toggle mòbil.
- **Imports netejats**: eliminats `Accordion`, `AccordionSummary`, `AccordionDetails`, `Drawer`, `Stack`, `BookOpen`, `Code2`, `ChevronLeft`, `PanelLeftClose`.
- **States eliminats**: `mobileSyllabusOpen`, `showRightPanel`, `sidebarOpen`, `contentTab`.
- **Variables eliminades**: `activeLessonId`, `defaultLessonId`, `activeId`, `isLessonCompleted`.
- **Imports netejats**: eliminat `useSearchParams` de react-router-dom.

### Centrat de tabs
- Afegit `justifyContent: 'center'` al `MuiTabs-flexContainer` per centrar les pestanyes tant en mobile com en desktop.
- Les tabs ara són responsive i sempre estan centrades a la pantalla.

### Reordenació i renom de tabs
- **Tab "Contingut del curs" eliminada**: s'ha eliminat completament la tab de overview amb cards col·lapsables.
- **Tabs renumerades**: l'ordre ara és:
  - TAB 0: Teoria
  - TAB 1: Programació (abans "Exercicis")
  - TAB 2: Tests
  - TAB 3: Fitxers
- **Tab "Exercicis" renombrada** a "Programació".

### Tab Teoria (TAB 0)
- Carrega la teoria de **TOTS els topics** automàticament (no només l'actiu).
- Cada topic es mostra com una **card col·lapsable** amb chevron i títol.
- En desplegar-se, mostra el contingut de **teoria en Markdown**.
- Botó "Expandeix-ho tot / Col·lapsa-ho tot".

### Tab Programació (TAB 1)
- Cards col·lapsables per cada lesson amb chevron.
- **% de progrés** visible al header de cada lesson.
- Icones d'estat: `💻` (pendent), `✅` (completat), `⚠️` (guardat localment).
- Botó "Expandeix-ho tot / Col·lapsa-ho tot".

### Tab Tests (TAB 2)
- Cards col·lapsables per cada lesson amb chevron.
- **% de progrés** visible al header de cada lesson.
- Icones d'estat: `📝` (pendent), `✅` (completat), `⚠️` (guardat localment).
- Botó "Expandeix-ho tot / Col·lapsa-ho tot".

### Tab Fitxers (TAB 3)
- Placeholder amb icona `FileText` i missatge "Encara no hi ha fitxers disponibles".

### Indicadors d'estat (auto-save vs completat)
- Nova funció `renderStatusIcon()` que distingeix 3 estats:
  - `true` → ✅ (verd, completat/resolt)
  - `"attempted"` → ⚠️ (groc, guardat localment però no resolt)
  - absent → icona per defecte (💻 o 📝)
- `renderStatusChip()` actualitzat:
  - `true` → CheckCircle2 verd
  - `"attempted"` → AlertTriangle groc + text "Pendent per enviar"
  - absent → chip "Pendent"
- `getLessonProgress()` ara només compta com a "fet" els que tenen `=== true`.
- Tipus de `progress` canviat de `Record<string, boolean>` a `Record<string, boolean | string>` per admetre `"attempted"`.

### Indicadors de dificultat (TAB 1 Programació + TAB 2 Tests)
- Nova funció `getDifficultyColor()` que mapeja dificultat a colors:
  - `easy` → verd (`#22c55e`) + fons clar verd
  - `medium` → groc (`#f59e0b`) + fons clar groc
  - `hard` → vermell (`#ef4444`) + fons clar vermell
  - `very_hard` → vermell fosc (`#dc2626`) + fons clar vermell fosc
- Nova funció `getDifficultyLabel()` que tradueix la dificultat:
  - `easy` → "Fàcil"
  - `medium` → "Mitjà"
  - `hard` → "Difícil"
  - `very_hard` → "Molt difícil"
- Nova funció `renderDifficultyChip()` que renderitza un chip amb color i label de dificultat.
- Nova funció `renderStatusWithDifficulty()` que combina el chip de dificultat amb el chip d'estat.
- Els subtopics de TAB 1 (Programació) i TAB 2 (Tests) mostren el chip de dificultat al costat del "Pendent".

### Breadcrumb intel·ligent
- El breadcrumb "Academy" navega a `/dashboards/student` si l'usuari està loguejat (hi ha `currentStudent` a localStorage), o a `/` si no ho està.
- Afegit link "Home" al breadcrumb que sempre navega a `/` (pàgina pública).

### Color de text de les tabs
- Color del text de totes les tabs (Teoria, Programació, Tests, Fitxers) canviat a blanc (`#fff`) tant per defecte com quan estan seleccionades.


## LessonPage.tsx (`src/pages/courses/LessonPage.tsx`)

### Layout vertical per a `python-public-test`
- Les columnes Editor i Console estan en vertical (editor a dalt, consola a sota) només pel curs `python-public-test`. La resta de cursos continua amb layout horitzontal (columnes 2 i 3 side by side).
- Editor i Console són **50%** d'alçada cadascun en mode vertical.
- `handleSaveProgress`: quan l'auto-save (`isAutoSaveOnPass = false`), també marca la lliçó com `'attempted'` a `mooc_global_progress` si no estava marcada.
- `progressPercent`: només compta lliçons amb valor `=== true` (no les intentades).

### Barra d'editor a mobile
- Afegida la barra de capçalera de l'editor a mobile (abans no es veia): mostra el nom del fitxer.
- El contenidor de l'editor a mobile té `bgcolor: '#1e1e1e'`, `borderRadius: 1` i `overflow: 'hidden'`.

# @monaco-editor/react: Guia i Informació General

## Què és?
És un contenidor (*wrapper*) dissenyat per integrar **Monaco Editor** (la mateixa tecnologia web que impulsa **VS Code**) dins de qualsevol aplicació desenvolupada amb React de manera neta i senzilla.

El seu objectiu principal és gestionar tot el procés pesat de configuració inicial i càrrega de fitxers, evitant la necessitat de configurar manualment empaquetadors o plugins complexos com Webpack, Rollup, Vite o Parcel.

---

## Característiques Principals

* ✅ **Integració sense configuració prèvia:** Funciona directament en entorns moderns (Vite, Next.js, etc.) sense necessitat d'expulsar configuracions ni afegir plugins externs.
* ✅ **Component `Editor` estàndard:** Ofereix un editor de codi complet amb subratllat de sintaxi, autocompletat, temes (clar/fosc) i dreceres de teclat idèntiques a les de VS Code.
* ✅ **Component `DiffEditor`:** Inclou una vista especialitzada per comparar dos fragments de codi (original versus modificat) de manera visual i colze a colze. *(Usat a la pestanya «Solució Profe».)*
* ✅ **Suport Multi-model (Pestanyes / Fitxers):** Permet gestionar múltiples fitxers o pestanyes al mateix editor utilitzant rutes o identificadors únics. Recorda automàticament l'estat de cada fitxer (posició del desplaçament, selecció de text i historial de desfer/refer). *(Pestanyes `main.py` / `app.tsx`.)*
* ✅ **Sistema de Càrrega Flexible (`Loader`):** Per defecte, descarrega els recursos de manera asíncrona des d'una CDN, però permet configurar-lo per carregar-lo localment des de les dependències del projecte (`node_modules`). *(Configurat en local.)*

---

## Eines de Control i Cicle de Vida

El paquet proporciona utilitats avançades per interactuar amb el comportament del editor:

* ✅ **Mètodes de Muntatge:** Permet executar funcions abans o després que el component es mostri en pantalla, facilitant capturar la instància activa del editor i la API global de Monaco. *(Via `onMount`.)*
* ✅ **Hook `useMonaco`:** Un ganxo de React per accedir de manera directa a la instància global de Monaco, ideal per registrar temes personalitzats, idiomes o regles d'intellisense. *(Usat per registrar el provider de Python i els tipus de TS/JSX.)*
* ✅ **Validació en Temps Real:** Ofereix mecanismes per interceptar els errors, avisos o marcadors de codi generats per l'analitzador intern de Monaco. *(Via `onValidate` + `EditorDiagnosticsBadge`.)*

---

## Estat Actual al Projecte: `src/pages/courses/LessonPage.tsx`

El component **ja està implementat** i fa ús real de `@monaco-editor/react` en els dos layouts (mòbil i desktop).

### Taula d'aspectes

| Estat | Aspecte | Detall |
|---|---|---|
| ✅ | **Component `Editor`** | Integrat amb `height="100%"`, `value` controlat i `onChange` (marca el codi com a *dirty*, actua l'autosave i neteja la consola si el codi queda buit). |
| ✅ | **Selecció de llenguatge** | Unes **pestanyes de fitxer** (`main.py` / `app.tsx`) canvien de llenguatge en temps real. Per Python usa `language="python"` i per React `language="typescript"` amb model `.tsx` (resaltat JSX i tipus de TS reals). |
| ✅ | **Tema** | Dinàmic: segueix el mode clar/fosc/fancy de l'aplicació (`useThemeMode`) via `getMonacoEditorTheme(mode)`. Els temes propis `mooc-light`, `mooc-dark` i `mooc-fancy` es registren amb `registerMonacoThemes` (`defineTheme`) i hereten la cor porpra `#8400ff`. |
| ✅ | **`useMonaco`** | L'accés a la instància global es fa amb `loadMonaco()` (carregador propi, diferit i idempotent) en lloc del hook `useMonaco`, que dispara `loader.init()` abans de la configuració local i cauria a la CDN. |
| ✅ | **Opcions de l'editor** | `getMonacoEditorOptions(bool)` afegeix: *minimap* (activat/desactivat segons paràmetre), `fontSize: 13`, `automaticLayout: true`, `quickSuggestions`, `suggestOnTriggerCharacters`, `acceptSuggestionOnEnter`, `tabCompletion`, `parameterHints`, `formatOnType` i `formatOnPaste`. |
| ✅ | **Persistència** | El codi es guarda a `localStorage` (clau per usuari/lloc) com a objecte per fitxer i es recupera en carregar la lliçó (amb migració del format antic). També es desa i restaura l'estat de vista (cursor, selecció i *scroll*) de cada fitxer. |
| ✅ | **Render en viu (Python)** | Per Python es mostra un missatge d'«no necessita renderitzar». |
| ✅ | **Render en viu (React real)** | El TSX s'executa de debò: es transpila amb el *worker* local de TypeScript de Monaco (`getEmitOutput`) i es renderitza amb React real de l'aplicació (`createRoot`), amb `PreviewErrorBoundary` i *debounce*. Ja no s'injecta HTML en un `<iframe>`. |
| ✅ | **Multi-model (pestanyes)** | Un únic `<Editor>` amb un **model per fitxer** (`file:///lesson/<curs>/<lliço>/main.py` i `app.tsx`). Canvi d'idioma en temps real i estats separats per fitxer (contingut, cursor, desfer/refer i *scroll*). Els models de la lliçó anterior es disposen en canviar de lliçó. |
| ✅ | **`onMount` / accés a la instància** | `handleEditorMount` captura l'editor i la API global de Monaco (`editorRef` / `monacoInstanceRef`), restaura l'estat de vista desat i fa focus a l'editor. |
| ✅ | **Tipus reals de React/JSX** | El mode React usa `language="typescript"` amb model `.tsx` i `setupTypescriptDefaults` (JSX, `jsx: React`, `module: CommonJS`, `noEmit: false` per permetre `getEmitOutput`; tipus mínims de React/JSX). El *worker* local de TS aporta resaltat JSX i validació de tipus. |
| ✅ | **Validació (`onValidate`)** | `handleValidate` intercepta els marcadors en temps real i `EditorDiagnosticsBadge` mostra el recompte d'errors i avisos a la capçalera de l'editor. |
| ✅ | **`DiffEditor`** | A la pestanya **Solució Profe** es compara el codi de l'alumne amb la `teacherSolution` del professor: colze a colze al desktop i en mode unificat (`renderSideBySide: false`) al mòbil, amb fallback si l'exercici no té solució. |
| ✅ | **Càrrega local i diferida (`Loader`)** | `loadMonaco()` importa dinàmicament `monacoCore` (entrada pròpia: `editor.api` + contribucions i llenguatges necessaris) i la passa a `loader.config({ monaco })`. Els *workers* amb importacions `?worker` de Vite (`MonacoEnvironment.getWorker`), sense CDN. |
| ✅ | **Optimització del bundle** | Monaco es descarrega només en obrir una lliçó i només amb els llenguatges/features necessaris (Python, TypeScript/JavaScript). El bundle inicial baixa de ~1,4 MB gzip a ~0,4 MB gzip; Monaco queda en un *chunk* a part (~1 MB gzip). |

import { loader } from '@monaco-editor/react';

// === Càrrega local i diferida de Monaco (node_modules, sense CDN) ===
// El bundle de Monaco (editor + workers) s'importa dinàmicament, de manera que
// no forma part del chunk inicial. Com que la càrrega és idempotent, es pot
// avançar (`preloadMonaco`) des de la llista de problemes perquè l'editor ja
// estigui a punt quan s'obre un problema de codi.
let monacoPromise: Promise<any> | null = null;
let typescriptPromise: Promise<any> | null = null;
let loaderConfigured = false;

/**
 * Carrega Monaco de manera diferida i configura el loader de
 * `@monaco-editor/react` amb la instància local. Idempotent.
 * No inclou el servei de TypeScript: vegeu `loadMonacoTypescript`.
 */
export function loadMonaco(): Promise<any> {
  if (!monacoPromise) {
    monacoPromise = (async () => {
      const [core, editorWorkerMod, tsWorkerMod] = await Promise.all([
        import('./monacoCore'),
        // Només són els embolcalls (pocs bytes): el codi dels workers es descarrega
        // quan Monaco en crea un (el de TypeScript, només amb models de React).
        import('monaco-editor/editor/editor.worker?worker'),
        import('monaco-editor/language/typescript/ts.worker?worker'),
      ]);

      const EditorWorker = editorWorkerMod.default;
      const TsWorker = tsWorkerMod.default;

      (self as any).MonacoEnvironment = {
        getWorker(_workerId: string, label: string) {
          if (label === 'typescript' || label === 'javascript') return new TsWorker();
          return new EditorWorker();
        },
      };

      const m = core.monaco;
      if (!loaderConfigured) {
        loader.config({ monaco: m as any });
        loaderConfigured = true;
      }
      registerMonacoThemes(m);
      registerPythonCompletionProvider(m);
      return m;
    })();
    // Si falla (xarxa), es podrà tornar a intentar
    monacoPromise.catch(() => { monacoPromise = null; });
  }
  return monacoPromise;
}

/**
 * Monaco + el servei de llenguatge de TypeScript/JSX (IntelliSense, diagnòstics
 * i transpilació del preview de React). Només per als cursos de React: per a
 * Python no cal descarregar-lo. Idempotent.
 */
export function loadMonacoTypescript(): Promise<any> {
  if (!typescriptPromise) {
    typescriptPromise = Promise.all([loadMonaco(), import('./monacoTypescript')]).then(([m, mod]) => {
      m.typescript = mod.typescript;
      setupTypescriptDefaults(m);
      return m;
    });
    typescriptPromise.catch(() => { typescriptPromise = null; });
  }
  return typescriptPromise;
}

/**
 * Avança la descàrrega de Monaco quan el navegador està lliure (p. ex. a la
 * llista de problemes de codi), sense bloquejar la pàgina actual.
 */
export function preloadMonaco(): void {
  if (monacoPromise) return;
  const start = () => { void loadMonaco().catch(() => { /* es reintentarà en obrir l'editor */ }); };
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === 'function') ric(start, { timeout: 2000 });
  else setTimeout(start, 200);
}

export const getMonacoEditorOptions = (minimapEnabled: boolean) => ({
  minimap: { enabled: minimapEnabled },
  fontSize: 18,
  lineHeight: 24,
  automaticLayout: true,
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true,
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on' as const,
  tabCompletion: 'on' as const,
  parameterHints: { enabled: true },
  formatOnType: true,
  formatOnPaste: true,
  // Com a l'editor d'algorien: sense capçaleres enganxoses ni espai extra en
  // acabar el fitxer, i indentació fixa de 4 espais (PEP 8).
  stickyScroll: { enabled: false },
  scrollBeyondLastLine: false,
  insertSpaces: true,
  detectIndentation: false,
  tabSize: 4,
});

/** Noms dels temes personalitzats registrats per `registerMonacoThemes`. */
const MONACO_THEMES = { light: 'mooc-light', dark: 'mooc-dark', fancy: 'mooc-fancy' } as const;

/** Tradueix el mode clar/fosc de l'aplicació als temes personalitzats de l'editor. */
export const getMonacoEditorTheme = (mode: 'light' | 'dark' | 'fancy') => MONACO_THEMES[mode] ?? MONACO_THEMES.dark;

let themesRegistered = false;

/**
 * Registra temes de Monaco personalitzats (amb el lila corporatiu #8400ff)
 * per als tres modes de l'aplicació. Idempotent.
 */
export function registerMonacoThemes(m: any) {
  if (themesRegistered || !m?.editor?.defineTheme) return;
  themesRegistered = true;

  const rules = [
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'a855f7', fontStyle: 'bold' },
    { token: 'string', foreground: '16a34a' },
    { token: 'number', foreground: 'd97706' },
    { token: 'type', foreground: '0891b2' },
    { token: 'function', foreground: '7c3aed' },
  ];

  m.editor.defineTheme('mooc-light', {
    base: 'vs',
    inherit: true,
    rules,
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1f2937',
      'editor.lineHighlightBackground': '#f5f0ff',
      'editorLineNumber.foreground': '#9ca3af',
      'editorLineNumber.activeForeground': '#8400ff',
      'editorCursor.foreground': '#8400ff',
      'editor.selectionBackground': '#d8b4fe66',
      'editor.inactiveSelectionBackground': '#e9d5ff66',
      'editorSuggestWidget.selectedBackground': '#ede9fe',
      'editorGutter.background': '#ffffff',
    },
  });

  m.editor.defineTheme('mooc-dark', {
    base: 'vs-dark',
    inherit: true,
    rules,
    colors: {
      'editor.background': '#1e1e1e',
      'editor.lineHighlightBackground': '#2a2a2a',
      'editorLineNumber.foreground': '#6b7280',
      'editorLineNumber.activeForeground': '#c084fc',
      'editorCursor.foreground': '#8400ff',
      'editor.selectionBackground': '#7c3aed55',
      'editorSuggestWidget.selectedBackground': '#3b0764',
    },
  });

  m.editor.defineTheme('mooc-fancy', {
    base: 'vs-dark',
    inherit: true,
    rules,
    colors: {
      'editor.background': '#0a0a0a',
      'editor.lineHighlightBackground': '#161616',
      'editorLineNumber.foreground': '#4b5563',
      'editorLineNumber.activeForeground': '#a855f7',
      'editorCursor.foreground': '#a855f7',
      'editor.selectionBackground': '#8400ff66',
      'editorSuggestWidget.selectedBackground': '#2e1065',
    },
  });
}

let tsDefaultsReady = false;

/**
 * Configura el llenguatge TypeScript perquè el mode React/JSX tingui
 * resaltat JSX real i validació de tipus (accionada pel worker de TS).
 */
export function setupTypescriptDefaults(m: any) {
  if (tsDefaultsReady) return;

  // A Monaco 0.56 l'API de TypeScript viu a `monaco.typescript`;
  // en versions anteriors era `monaco.languages.typescript`.
  const ts = m.typescript ?? m.languages?.typescript;
  if (!ts) return;
  tsDefaultsReady = true;

  ts.typescriptDefaults.setCompilerOptions({
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ESNext,
    // CommonJS perquè `getEmitOutput` generi codi evaluable al preview en viu.
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false,
    noEmit: false,
    esModuleInterop: true,
  });

  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  // Tipus mínims de React/JSX perquè la validació TS funcioni
  // sense haver de carregar totes les definicions de @types/react al runtime.
  ts.typescriptDefaults.addExtraLib(
    [
      "declare module 'react' { const React: any; export = React; }",
      'declare const React: any;',
      'declare namespace JSX {',
      '  interface Element {}',
      '  interface ElementClass {}',
      '  interface ElementAttributesProperty {}',
      '  interface ElementChildrenAttribute {}',
      '  interface IntrinsicAttributes {}',
      '  interface IntrinsicClassAttributes<T> {}',
      '  interface IntrinsicElements { [elemName: string]: any; }',
      '}',
      'interface SVGAElement {}',
    ].join('\n'),
    'file:///node_modules/@types/react/global.d.ts'
  );
}

const PYTHON_COMPLETION_KEY = '__pythonCompletionProvider';

/**
 * Registra el provider de completions personalitzat de Python.
 * Usa un patró singleton: disposa qualsevol provider anterior per evitar duplicats.
 */
export function registerPythonCompletionProvider(m: any) {
  const existing = (window as any)[PYTHON_COMPLETION_KEY];
  if (existing) existing.dispose();
  (window as any)[PYTHON_COMPLETION_KEY] = m.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '(', "'", '"'],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const S = (label: string, insertText: string, detail: string, documentation: string, kind?: number) => ({
        label,
        insertText,
        detail,
        documentation,
        kind: kind ?? m.languages.CompletionItemKind.Text,
        insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      });

      const completions: any[] = [
        // === Paraules clau i estructures de control ===
        S('if', 'if ${1:condition}:\n\t${2:pass}', 'if', 'Condicional: executa el bloc si la condició és certa.', m.languages.CompletionItemKind.Keyword),
        S('elif', 'elif ${1:condition}:\n\t${2:pass}', 'elif', 'Condicional alternatiu encadenat.', m.languages.CompletionItemKind.Keyword),
        S('else', 'else:\n\t${0:pass}', 'else', 'Bloc executat quan cap condició anterior no és certa.', m.languages.CompletionItemKind.Keyword),
        S('for', 'for ${1:item} in ${2:iterable}:\n\t${0:pass}', 'for', 'Bucle for: recorre tots els elements d\'una col·lecció.', m.languages.CompletionItemKind.Keyword),
        S('while', 'while ${1:condition}:\n\t${0:pass}', 'while', 'Bucle while: repeteix mentre la condició sigui certa.', m.languages.CompletionItemKind.Keyword),
        S('def', 'def ${1:name}(${2:params}):\n\t${0:pass}', 'def', 'Defineix una funció.', m.languages.CompletionItemKind.Keyword),
        S('class', 'class ${1:Name}:\n\tdef __init__(self${2:, args}):\n\t\t${0:pass}', 'class', 'Defineix una classe.', m.languages.CompletionItemKind.Keyword),
        S('return', 'return ${1:value}', 'return', 'Retorna un valor des de la funció actual.', m.languages.CompletionItemKind.Keyword),
        S('lambda', 'lambda ${1:x}: ${0:x * 2}', 'lambda', 'Funció anònima en una sola línia.', m.languages.CompletionItemKind.Keyword),
        S('pass', 'pass', 'pass', 'Sentència buida: no fa res (placeholder).', m.languages.CompletionItemKind.Keyword),
        S('break', 'break', 'break', 'Surt del bucle més intern.', m.languages.CompletionItemKind.Keyword),
        S('continue', 'continue', 'continue', 'Salta a la següent iteració del bucle.', m.languages.CompletionItemKind.Keyword),
        S('import', 'import ${1:module}', 'import', 'Importa un mòdul complet.', m.languages.CompletionItemKind.Keyword),
        S('from', 'from ${1:module} import ${2:name}', 'from ... import', 'Importa elements concrets d\'un mòdul.', m.languages.CompletionItemKind.Keyword),
        S('as', ' as ${1:alias}', 'as', 'Alies per a imports o with.', m.languages.CompletionItemKind.Keyword),
        S('try', 'try:\n\t${1:pass}\nexcept ${2:Exception}:\n\t${0:pass}', 'try / except', 'Captura i tracta excepcions.', m.languages.CompletionItemKind.Keyword),
        S('with', 'with open(${1:"fitxer.txt"}, "${2:r}") as ${3:f}:\n\t${0:pass}', 'with', 'Gestiona contexts (obertura de fitxers, etc.).', m.languages.CompletionItemKind.Keyword),
        S('global', 'global ${1:var}', 'global', 'Declara una variable global.', m.languages.CompletionItemKind.Keyword),
        S('yield', 'yield ${1:value}', 'yield', 'Produeix un valor en un generador.', m.languages.CompletionItemKind.Keyword),
        S('del', 'del ${1:item}', 'del', 'Elimina un element o variable.', m.languages.CompletionItemKind.Keyword),
        S('assert', 'assert ${1:condition}', 'assert', 'Comprova una condició i llança error si és falsa.', m.languages.CompletionItemKind.Keyword),
        S('None', 'None', 'None', 'Valor nul.', m.languages.CompletionItemKind.Constant),
        S('True', 'True', 'True', 'Booleà cert.', m.languages.CompletionItemKind.Constant),
        S('False', 'False', 'False', 'Booleà fals.', m.languages.CompletionItemKind.Constant),
        S('and', ' and ', 'and', 'Operador lògic I.', m.languages.CompletionItemKind.Operator),
        S('or', ' or ', 'or', 'Operador lògic O.', m.languages.CompletionItemKind.Operator),
        S('not', ' not ', 'not', 'Negació lògica.', m.languages.CompletionItemKind.Operator),
        S('in', ' in ', 'in', 'Comprovació de pertinença / element del bucle.', m.languages.CompletionItemKind.Operator),
        S('is', ' is ', 'is', 'Comparació d\'identitat.', m.languages.CompletionItemKind.Operator),

        // === Funcions integrades (builtins) ===
        S('print', 'print(${1:value})', 'print(value)', 'Imprimeix un valor a la consola.', m.languages.CompletionItemKind.Function),
        S('len', 'len(${1:col·lecció})', 'len(collection)', 'Retorna el nombre d\'elements d\'una col·lecció.', m.languages.CompletionItemKind.Function),
        S('range', 'range(${1:start}, ${2:stop}${3:, step})', 'range(stop) / range(start, stop, step)', 'Genera una seqüència de nombres.', m.languages.CompletionItemKind.Function),
        S('input', 'input(${1:"text"})', 'input(prompt)', 'Llegeix una cadena des de l\'entrada.', m.languages.CompletionItemKind.Function),
        S('int', 'int(${1:value})', 'int(value)', 'Converteix a enter.', m.languages.CompletionItemKind.Function),
        S('float', 'float(${1:value})', 'float(value)', 'Converteix a decimal.', m.languages.CompletionItemKind.Function),
        S('str', 'str(${1:value})', 'str(value)', 'Converteix a cadena de text.', m.languages.CompletionItemKind.Function),
        S('bool', 'bool(${1:value})', 'bool(value)', 'Converteix a booleà.', m.languages.CompletionItemKind.Function),
        S('list', 'list(${1:iterable})', 'list(iterable)', 'Crea una llista.', m.languages.CompletionItemKind.Function),
        S('dict', 'dict(${1:key}=${2:value})', 'dict() / {}', 'Crea un diccionari (clau → valor).', m.languages.CompletionItemKind.Function),
        S('set', 'set(${1:iterable})', 'set(iterable)', 'Crea un conjunt (sense duplicats).', m.languages.CompletionItemKind.Function),
        S('tuple', 'tuple(${1:iterable})', 'tuple(iterable)', 'Crea una tupla.', m.languages.CompletionItemKind.Function),
        S('sorted', 'sorted(${1:iterable}${2:, reverse=True})', 'sorted(iterable)', 'Retorna una llista ordenada.', m.languages.CompletionItemKind.Function),
        S('sum', 'sum(${1:iterable})', 'sum(iterable)', 'Suma els elements d\'una col·lecció.', m.languages.CompletionItemKind.Function),
        S('min', 'min(${1:iterable})', 'min(iterable)', 'Retorna el valor mínim.', m.languages.CompletionItemKind.Function),
        S('max', 'max(${1:iterable})', 'max(iterable)', 'Retorna el valor màxim.', m.languages.CompletionItemKind.Function),
        S('abs', 'abs(${1:value})', 'abs(value)', 'Retorna el valor absolut.', m.languages.CompletionItemKind.Function),
        S('round', 'round(${1:value}${2:, ndigits})', 'round(value, ndigits)', 'Arrodoneix un decimal.', m.languages.CompletionItemKind.Function),
        S('pow', 'pow(${1:base}, ${2:exponent})', 'pow(base, exp)', 'Potència (base ^ exponent).', m.languages.CompletionItemKind.Function),
        S('type', 'type(${1:value})', 'type(value)', 'Retorna el tipus d\'un valor.', m.languages.CompletionItemKind.Function),
        S('isinstance', 'isinstance(${1:value}, ${2:type})', 'isinstance(value, type)', 'Comprova si un valor és d\'un tipus.', m.languages.CompletionItemKind.Function),
        S('enumerate', 'enumerate(${1:iterable}${2:, start=0})', 'enumerate(iterable)', 'Enumeració amb índex: (índex, valor).', m.languages.CompletionItemKind.Function),
        S('zip', 'zip(${1:iterable1}, ${2:iterable2})', 'zip(*iterables)', 'Combina varis iterables en tuples.', m.languages.CompletionItemKind.Function),
        S('map', 'map(${1:func}, ${2:iterable})', 'map(func, iterable)', 'Aplica una funció a cada element.', m.languages.CompletionItemKind.Function),
        S('filter', 'filter(${1:func}, ${2:iterable})', 'filter(func, iterable)', 'Filtra elements segons una funció.', m.languages.CompletionItemKind.Function),
        S('any', 'any(${1:iterable})', 'any(iterable)', 'True si algun element és cert.', m.languages.CompletionItemKind.Function),
        S('all', 'all(${1:iterable})', 'all(iterable)', 'True si tots els elements són certs.', m.languages.CompletionItemKind.Function),
        S('reversed', 'reversed(${1:iterable})', 'reversed(iterable)', 'Retorna l\'iterable en ordre invers.', m.languages.CompletionItemKind.Function),

        // === Llistes: mètodes ===
        S('.append', '${1}.append(${2:item})', 'list.append(item)', 'Afegeix un element al final de la llista.'),
        S('.extend', '${1}.extend(${2:iterable})', 'list.extend(iterable)', 'Estén la llista amb una altra col·lecció.'),
        S('.insert', '${1}.insert(${2:pos}, ${3:item})', 'list.insert(pos, item)', 'Insereix un element en una posició.'),
        S('.remove', '${1}.remove(${2:item})', 'list.remove(item)', 'Elimina la primera coincidència de l\'element.'),
        S('.pop', '${1}.pop(${2:index})', 'list.pop([index])', 'Elimina i retorna un element (per defecte l\'últim).'),
        S('.index', '${1}.index(${2:item})', 'list.index(item)', 'Retorna l\'índex del primer element trobat.'),
        S('.count', '${1}.count(${2:item})', 'list.count(item)', 'Compta quantes vegades apareix un element.'),
        S('.sort', '${1}.sort(${2:reverse=False})', 'list.sort()', 'Ordena la llista in-place.'),
        S('.reverse', '${1}.reverse()', 'list.reverse()', 'Inverteix l\'ordre de la llista in-place.'),
        S('.copy', '${1}.copy()', 'list.copy()', 'Retorna una còpia de la llista.'),

        // === Diccionaris: mètodes ===
        S('.keys', '${1}.keys()', 'dict.keys()', 'Vista de les claus del diccionari.'),
        S('.values', '${1}.values()', 'dict.values()', 'Vista dels valors del diccionari.'),
        S('.items', '${1}.items()', 'dict.items()', 'Parelles (clau, valor) com a tuples.'),
        S('.get', '${1}.get(${2:key}${3:, default})', 'dict.get(key, default)', 'Retorna el valor d\'una clau (amb valor per defecte).'),
        S('.update', '${1}.update(${2:other})', 'dict.update(other)', 'Actualitza el diccionari amb un altre o parelles.'),
        S('.setdefault', '${1}.setdefault(${2:key}${3:, default})', 'dict.setdefault(key, default)', 'Retorna el valor o l\'assigna si no existeix.'),

        // === Cadenes (strings): mètodes ===
        S('.split', '${1}.split(${2:separator})', 'str.split(sep)', 'Divideix la cadena en una llista de subcadenes.', m.languages.CompletionItemKind.Method),
        S('.join', '${2:separator}.join(${1:iterable})', 'str.join(iterable)', 'Uneix una llista de cadenes amb el separador.', m.languages.CompletionItemKind.Method),
        S('.upper', '${1}.upper()', 'str.upper()', 'Retorna la cadena en majúscules.', m.languages.CompletionItemKind.Method),
        S('.lower', '${1}.lower()', 'str.lower()', 'Retorna la cadena en minúscules.', m.languages.CompletionItemKind.Method),
        S('.strip', '${1}.strip()', 'str.strip()', 'Elimina espais en blanc dels extrems.', m.languages.CompletionItemKind.Method),
        S('.replace', '${1}.replace(${2:old}, ${3:new})', 'str.replace(old, new)', 'Substitueix ocurrències.', m.languages.CompletionItemKind.Method),
        S('.startswith', '${1}.startswith(${2:prefix})', 'str.startswith(prefix)', 'True si comença amb el prefix.', m.languages.CompletionItemKind.Method),
        S('.endswith', '${1}.endswith(${2:suffix})', 'str.endswith(suffix)', 'True si acaba amb el sufix.', m.languages.CompletionItemKind.Method),
        S('.find', '${1}.find(${2:sub})', 'str.find(sub)', 'Retorna l\'índex de la primera aparició (-1 si no existeix).', m.languages.CompletionItemKind.Method),
        S('.format', '${1}.format(${2:args})', 'str.format(*args)', 'Format de la cadena amb placeholders.', m.languages.CompletionItemKind.Method),

        // === F-strings ===
        S('f-string', 'f"${1:valor}"', 'f"..."', 'Cadena formatada: insereix expressions amb {} dins.', m.languages.CompletionItemKind.Snippet),
      ];

      return { suggestions: completions.map((c) => ({ ...c, range })) };
    },
  });
}
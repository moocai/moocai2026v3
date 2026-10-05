import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';

// Model virtual on es compila el codi TSX de l'alumne (no es mostra).
const PREVIEW_URI = 'file:///preview/App.tsx';

interface PreviewErrorBoundaryProps {
  children: ReactNode;
  onError: (message: string) => void;
}

class PreviewErrorBoundary extends Component<PreviewErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : String(error));
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Compila el codi TSX/JSX a JavaScript utilitzant el worker de TypeScript de Monaco. */
async function transpileTsx(monaco: any, code: string): Promise<string> {
  const uri = monaco.Uri.parse(PREVIEW_URI);
  let model = monaco.editor.getModel(uri);
  if (!model) model = monaco.editor.createModel(code, 'typescript', uri);
  else if (model.getValue() !== code) model.setValue(code);

  const getTsWorker = monaco.typescript?.getTypeScriptWorker ?? monaco.languages?.typescript?.getTypeScriptWorker;
  if (!getTsWorker) throw new Error('El worker de TypeScript no està disponible.');

  const getWorker = await getTsWorker();
  const client = await getWorker(uri);
  const output = await client.getEmitOutput(uri.toString());
  const js = output?.outputFiles?.find((f: { name: string }) => /\.js$/i.test(f.name))?.text;
  if (!js) throw new Error("No s'ha pogut compilar el codi TSX.");
  return js;
}

/** Avalua el JavaScript compilat i retorna el component React a renderitzar. */
function evaluateComponent(js: string): any {
  const moduleObj: { exports: any } = { exports: {} };
  const interop = (mod: any) => Object.assign({ __esModule: true, default: mod }, mod);
  const modules: Record<string, any> = {
    react: interop(React),
    'react-dom': interop(ReactDOM),
    'react-dom/client': interop(ReactDOMClient),
  };
  const requireShim = (id: string) => {
    if (id in modules) return modules[id];
    throw new Error(`Mòdul no suportat al preview: ${id}`);
  };

  const factory = new Function(
    'React',
    'ReactDOM',
    'ReactDOMClient',
    'exports',
    'module',
    'require',
    `${js}\n;return (typeof App !== 'undefined') ? App : ((typeof Component !== 'undefined') ? Component : null);`
  );
  const named = factory(React, ReactDOM, ReactDOMClient, moduleObj.exports, moduleObj, requireShim);

  const mod = moduleObj.exports ?? {};
  const candidates = [named, mod.default, mod.App, ...Object.values(mod)];
  return candidates.find((c) => typeof c === 'function') ?? null;
}

interface ReactLivePreviewProps {
  monaco: any;
  code: string;
  dark: boolean;
}

/**
 * Preview en viu de React de debò: compila el TSX amb el worker de Monaco i
 * renderitza el component amb el React de l'aplicació (sense CDN ni Babel).
 */
export function ReactLivePreview({ monaco, code, dark }: ReactLivePreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const renderCountRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const root = createRoot(container);
    rootRef.current = root;
    return () => {
      rootRef.current = null;
      root.unmount();
    };
  }, []);

  useEffect(() => {
    if (!monaco || !rootRef.current) return;
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const js = await transpileTsx(monaco, code);
        if (cancelled || !rootRef.current) return;
        const Comp = evaluateComponent(js);
        if (!Comp) throw new Error("No s'ha trobat cap component. Defineix `function App() { ... }`.");
        setError(null);
        renderCountRef.current += 1;
        rootRef.current.render(
          <PreviewErrorBoundary key={renderCountRef.current} onError={(message) => setError(message)}>
            <Comp />
          </PreviewErrorBoundary>
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [monaco, code]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: dark ? '#1e1e1e' : '#ffffff',
        color: dark ? '#ffffff' : '#111111',
        padding: 8,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: dark ? '#2a1111' : '#fef2f2',
            color: '#f87171',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: 8,
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            zIndex: 2,
          }}
        >
          {`⚠️ ${error}`}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

export default ReactLivePreview;

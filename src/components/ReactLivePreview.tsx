import { useEffect, useRef, useState } from 'react';

// Model virtual on es compila el codi TSX de l'alumne (no es mostra).
const PREVIEW_URI = 'file:///preview/App.tsx';

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

interface ReactLivePreviewProps {
  monaco: any;
  code: string;
  dark: boolean;
}

/**
 * Preview en viu de React: compila el TSX amb el worker de Monaco i l'executa dins d'un iframe
 * aïllat (`sandbox="allow-scripts"`, origen opac; vegeu `preview.html`). El codi de l'alumne no
 * s'executa a la pàgina de l'aplicació: no pot llegir-ne el token de sessió ni el localStorage.
 */
export function ReactLivePreview({ monaco, code, dark }: ReactLivePreviewProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === 'preview-ready') setReady(true);
      if (event.data?.type === 'preview-error') setError(event.data.message ?? null);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!monaco || !ready) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const js = await transpileTsx(monaco, code);
        if (cancelled) return;
        // L'iframe té origen opac ("null"): el destí ha de ser '*'; el codi no és cap secret.
        frameRef.current?.contentWindow?.postMessage({ type: 'render', js, dark }, '*');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [monaco, code, dark, ready]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: dark ? '#1e1e1e' : '#ffffff' }}>
      <iframe
        ref={frameRef}
        src="/preview.html"
        sandbox="allow-scripts"
        title="React preview"
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {error && (
        <div
          style={{
            position: 'absolute', inset: 0, background: dark ? '#2a1111' : '#fef2f2', color: '#f87171',
            fontFamily: 'monospace', fontSize: 11, padding: 8, whiteSpace: 'pre-wrap', overflow: 'auto', zIndex: 2,
          }}
        >
          {`⚠️ ${error}`}
        </div>
      )}
    </div>
  );
}

export default ReactLivePreview;

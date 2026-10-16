// Runtime del preview de React. Es carrega dins d'un iframe amb `sandbox="allow-scripts"`
// (sense `allow-same-origin`): té un origen opac, així que el codi de l'alumne que s'hi executa
// no pot llegir el localStorage ni les cookies de l'aplicació (p. ex. el token de sessió).
// La pàgina pare li envia el JavaScript ja compilat per postMessage i rep els errors igual.
import { Component, type ReactNode } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import { createRoot } from 'react-dom/client';

type RenderMessage = { type: 'render'; js: string; dark: boolean };

const root = createRoot(document.getElementById('root')!);
let renderCount = 0;

// Els errors els mostra la pàgina pare, damunt de l'iframe
const report = (message: string | null) => {
  window.parent.postMessage({ type: 'preview-error', message }, '*');
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { report(error instanceof Error ? error.message : String(error)); }
  render() { return this.state.hasError ? null : this.props.children; }
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
    'React', 'ReactDOM', 'ReactDOMClient', 'exports', 'module', 'require',
    `${js}\n;return (typeof App !== 'undefined') ? App : ((typeof Component !== 'undefined') ? Component : null);`,
  );
  const named = factory(React, ReactDOM, ReactDOMClient, moduleObj.exports, moduleObj, requireShim);
  const mod = moduleObj.exports ?? {};
  const candidates = [named, mod.default, mod.App, ...Object.values(mod)];
  return candidates.find((c) => typeof c === 'function') ?? null;
}

window.addEventListener('message', (event: MessageEvent<RenderMessage>) => {
  // Només la pàgina que conté l'iframe pot demanar què es renderitza
  if (event.source !== window.parent || event.data?.type !== 'render') return;
  const { js, dark } = event.data;
  document.body.style.background = dark ? '#1e1e1e' : '#ffffff';
  document.body.style.color = dark ? '#ffffff' : '#111111';
  try {
    const Comp = evaluateComponent(js);
    if (!Comp) throw new Error("No s'ha trobat cap component. Defineix `function App() { ... }`.");
    report(null);
    renderCount += 1;
    root.render(<ErrorBoundary key={renderCount}><Comp /></ErrorBoundary>);
  } catch (err) {
    report(err instanceof Error ? err.message : String(err));
  }
});

window.parent.postMessage({ type: 'preview-ready' }, '*');

// Service worker per a input() de Python (botó "Executar" dels problemes de codi).
//
// Python s'executa en un Web Worker que, en arribar a input(), fa una petició XHR
// síncrona a ".../__mooc_python_input__" i queda aturat fins que rep resposta. Aquest
// service worker intercepta aquesta petició i no la respon fins que la pàgina li envia
// (postMessage) el text que l'alumne ha escrit a la consola.
// Qualsevol altra petició passa de llarg: no es toca ni es desa res a la memòria cau.

const INPUT_PATH = '/__mooc_python_input__';
// Per sota del límit de temps que els navegadors donen a un esdeveniment: el worker
// torna a preguntar si encara no hi ha resposta.
const RETRY_AFTER_MS = 20000;

const waiting = new Map(); // requestId -> resolve
const early = new Map(); // respostes arribades abans que la petició

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'mooc-python-input') return;
  const resolve = waiting.get(data.requestId);
  if (resolve) {
    waiting.delete(data.requestId);
    resolve({ value: data.value });
  } else {
    early.set(data.requestId, { value: data.value });
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.endsWith(INPUT_PATH)) return;
  event.respondWith((async () => {
    const { requestId } = await event.request.json();
    let result = early.get(requestId);
    if (result) {
      early.delete(requestId);
    } else {
      result = await new Promise((resolve) => {
        waiting.set(requestId, resolve);
        setTimeout(() => {
          if (waiting.get(requestId) === resolve) {
            waiting.delete(requestId);
            resolve({ retry: true });
          }
        }, RETRY_AFTER_MS);
      });
    }
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  })());
});

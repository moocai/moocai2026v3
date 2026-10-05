import { useEffect, useState } from 'react';
import { api } from '../services/api';

const DB_NAME = 'mooc-avatars';
const DB_VERSION = 1;
const STORE = 'blobs';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** src -> objectURL (memòria cau de la sessió). */
const memoryCache = new Map<string, string>();
/** src -> petició en curs, per no demanar la mateixa imatge dues vegades. */
const inFlight = new Map<string, Promise<string | null>>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'url' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function idbGet(url: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(url);
    req.onsuccess = () => {
      const row = req.result as { url: string; blob: Blob; ts: number } | undefined;
      if (!row?.blob || Date.now() - row.ts > MAX_AGE_MS) return resolve(null);
      resolve(URL.createObjectURL(row.blob));
    };
    req.onerror = () => resolve(null);
  });
}

async function idbSet(url: string, blob: Blob) {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ url, blob, ts: Date.now() });
  } catch {
    /* sense persistència */
  }
}

/** Neteja les entrades expirades (es crida de tant en tant, no a cada càrrega). */
async function idbPrune() {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = (req.result as string[]) || [];
      for (const key of keys) {
        const rowReq = store.get(key);
        rowReq.onsuccess = () => {
          const row = rowReq.result as { ts: number } | undefined;
          if (!row?.ts || Date.now() - row.ts > MAX_AGE_MS) store.delete(key);
        };
      }
    };
  } catch {
    /* sense persistència */
  }
}

/**
 * Avatar de l'usuari autenticat (no depèn de cap curs). L'URL del backend és la
 * mateixa per a tothom, així que s'hi afegeix `?u=<id>` (el backend l'ignora)
 * perquè la memòria cau, que persisteix a IndexedDB, no mostri l'avatar d'un
 * usuari anterior al mateix navegador.
 */
export function myAvatarUrl(): string | undefined {
  try {
    const raw = localStorage.getItem('currentStudent');
    const id = raw ? JSON.parse(raw)?.id : undefined;
    return id != null && localStorage.getItem('token')
      ? `/api/v1/users/me/avatar/?u=${encodeURIComponent(String(id))}`
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Avatar d'un altre usuari dins d'un curs que compartiu. El backend no té cap
 * ruta sense curs (`/users/<username>/avatar/` donava 404), i espera el
 * `username`, no l'id.
 */
export function userAvatarUrl(username: string, slug: string): string {
  return `/api/v1/users/${username}/avatar/${slug}/`;
}

async function fetchAsBlob(src: string): Promise<Blob | null> {
  // Les imatges estàtiques es deixen passar tal qual, sense passar per axios.
  if (src.startsWith('/img/') || src.startsWith('blob:') || src.startsWith('http')) return null;
  try {
    const cleanUrl = src.startsWith('/api/v1') ? src.replace('/api/v1', '') : src;
    const res = await api.get(cleanUrl, { responseType: 'blob' });
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data as BlobPart]);
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

function resolveFromCache(src: string): Promise<string | null> {
  const cached = memoryCache.get(src);
  if (cached) return Promise.resolve(cached);
  const request = (async () => {
    const fromIdb = await idbGet(src);
    if (fromIdb) {
      memoryCache.set(src, fromIdb);
      return fromIdb;
    }
    const blob = await fetchAsBlob(src);
    if (!blob) return null;
    const objectUrl = URL.createObjectURL(blob);
    memoryCache.set(src, objectUrl);
    idbSet(src, blob);
    return objectUrl;
  })().finally(() => {
    inFlight.delete(src);
  });
  inFlight.set(src, request);
  return request;
}

/**
 * Carrega (o retorna de la cau) un avatar protegit i en retorna l'objectURL.
 * Deduplica peticions i persisteix el blob a IndexedDB perquè la propera
 * visita no torni a demanar la imatge al servidor.
 */
export function preloadImage(src?: string): Promise<string | null> {
  if (!src) return Promise.resolve(null);
  if (src.startsWith('/img/') || src.startsWith('blob:') || src.startsWith('http')) return Promise.resolve(src);
  const pending = inFlight.get(src);
  if (pending) return pending;
  return resolveFromCache(src);
}

/** ObjectURL si ja és a la memòria cau, sense provocar cap petició. */
export function peekImage(src?: string): string | null {
  if (!src) return null;
  return memoryCache.get(src) || null;
}

/**
 * Resol immediatament el que hi ha a la memòria cau i, si no hi és, espera
 * la càrrega. Ideal per a components que es solen remuntar.
 */
export function useImageUrl(src?: string): string | null {
  const cached = peekImage(src);
  const [url, setUrl] = useState<string | null>(cached);

  useEffect(() => {
    if (!src) {
      setUrl(null);
      return;
    }
    let active = true;
    preloadImage(src).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return url ?? cached ?? null;
}

/** Invalida una imatge (després de pujar-ne una de nova) o totes si no es passa cap src. */
export function invalidateImage(src?: string) {
  const targets = src ? [src] : [...memoryCache.keys()];
  for (const key of targets) {
    const url = memoryCache.get(key);
    if (url) URL.revokeObjectURL(url);
    memoryCache.delete(key);
  }
  if (!src) {
    void openDb().then((db) => {
      if (!db) return;
      try {
        db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
      } catch {
        /* sense persistència */
      }
    });
    return;
  }
  void openDb().then((db) => {
    if (!db) return;
    try {
      db.transaction(STORE, 'readwrite').objectStore(STORE).delete(src);
    } catch {
      /* sense persistència */
    }
  });
}

let pruned = false;
/** Neteja periòdica de la caché persistent. */
export function pruneAvatarCacheOnce() {
  if (pruned) return;
  pruned = true;
  void idbPrune();
}
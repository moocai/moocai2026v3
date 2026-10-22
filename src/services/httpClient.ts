import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearPrivateLocalData } from './testAnswerStorage';
import { resetSessionCaches } from './sessionCache';
import { currentLanguage } from '../i18n';

// @ts-ignore - Vite replaces import.meta.env statically at build time
const API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

function currentToken(): string {
  return localStorage.getItem('token') || '';
}

function readAuthorization(headers: unknown): string {
  if (!headers || typeof headers !== 'object') return '';
  const source = headers as { get?: (name: string) => unknown } & Record<string, unknown>;
  const viaGet = typeof source.get === 'function' ? source.get('Authorization') : undefined;
  const raw = viaGet ?? source.Authorization ?? source.authorization;
  return typeof raw === 'string' ? raw.trim() : '';
}

function sentToken(config?: InternalAxiosRequestConfig): string {
  const match = /^Token\s+(.+)$/i.exec(readAuthorization(config?.headers));
  return match ? match[1].trim() : '';
}

function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('currentStudent');
  clearPrivateLocalData();
  resetSessionCaches();
  window.dispatchEvent(new Event('auth-state-change'));
}

export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 100000 });
export const publicClient = axios.create({ baseURL: API_BASE_URL });

// El servidor respon (noms, enunciats, missatges) en l'idioma de la petició: el de la interfície,
// no el del navegador, perquè tot quadri amb el que s'ha triat.
for (const client of [apiClient, publicClient]) {
  client.interceptors.request.use((config) => {
    config.headers['Accept-Language'] = currentLanguage();
    return config;
  });
}

apiClient.interceptors.request.use((config) => {
  const token = currentToken();
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const sent = sentToken(error.config);
      if (sent && sent === currentToken()) clearSession();
    }
    return Promise.reject(error);
  },
);

/**
 * Missatges d'un error de l'API. Tots els errors tenen la forma
 * `{ detail, code, errors: { camp: [missatges] } }`: es retornen els missatges
 * de `errors` i, si no n'hi ha, el `detail`.
 */
export function apiErrorMessages(error: unknown): string[] {
  if (!axios.isAxiosError(error)) return [];
  const data = error.response?.data as { detail?: unknown; errors?: unknown } | undefined;
  if (!data || typeof data !== 'object') return [];
  const messages: string[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(collect);
    } else if (value !== null && value !== undefined && String(value).trim() !== '') {
      messages.push(String(value));
    }
  };
  collect(data.errors);
  if (messages.length === 0 && typeof data.detail === 'string' && data.detail.trim() !== '') {
    messages.push(data.detail);
  }
  return [...new Set(messages)];
}

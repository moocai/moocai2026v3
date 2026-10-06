import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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
  window.dispatchEvent(new Event('auth-state-change'));
}

export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 100000 });
export const publicClient = axios.create({ baseURL: API_BASE_URL });

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

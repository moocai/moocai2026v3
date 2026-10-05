import axios from 'axios';

// @ts-ignore - Vite replaces import.meta.env statically at build time
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const TOKEN_KEY = 'token';
export const CURRENT_STUDENT_KEY = 'currentStudent';

/**
 * Client HTTP únic per a tota l'API (`/api/v1`).
 *  - Afegeix `Authorization: Token <token>` si hi ha sessió.
 *  - No fixa `Content-Type`: axios posa JSON o multipart (FormData) segons el cos.
 *  - Si el backend respon 401 amb el token actual (caducat o revocat), tanca la
 *    sessió local perquè la UI no es quedi "loguejada" amb un token mort.
 */
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 100000,
});

/**
 * Client sense token, per a login i registre: amb un token caducat a
 * `localStorage`, aquestes peticions fallarien amb 401.
 */
export const publicClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 100000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const token = localStorage.getItem(TOKEN_KEY);
      // Només si la petició es va fer amb el token vigent: una resposta tardana
      // d'un token antic no ha de tancar una sessió nova.
      if (token && error.config?.headers?.Authorization === `Token ${token}`) {
        clearSession();
        window.dispatchEvent(new Event('auth-state-change'));
      }
    }
    return Promise.reject(error);
  }
);

/** Esborra les dades de sessió locals (no avisa el servidor). */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_STUDENT_KEY);
}


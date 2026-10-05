import { registerUser, type RegisterPayload } from './register';
import { clearSession, publicClient } from './httpClient';

const LOGOUT_TIMEOUT = 5000;

export const authService = {
  login: async (username: string, password: string) => {
    const response = await publicClient.post('/users/auth/login/', { username, password });
    const data = response.data;

    if (data?.token) {
      localStorage.setItem('token', data.token);
    }

    return data;
  },

  register: (payload: RegisterPayload) => registerUser(payload),

  /**
   * Tanca la sessió local a l'instant i demana al backend que revoqui el token.
   * El token es llegeix abans d'esborrar-lo: sense ell, el backend respon 401
   * i el token continuaria sent vàlid fins que caduqués.
   */
  logout: async () => {
    const token = localStorage.getItem('token');
    clearSession();
    if (!token) return;

    await publicClient
      .post('/users/auth/logout/', null, {
        headers: { Authorization: `Token ${token}` },
        timeout: LOGOUT_TIMEOUT,
      })
      .catch(() => {
        /* el logout local ja s'ha fet; si falla, el token caducarà sol */
      });
  },

  getToken: () => localStorage.getItem('token')
};
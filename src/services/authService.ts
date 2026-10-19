import { registerUser, type RegisterPayload } from './register';
import { publicClient } from './httpClient';
import { clearPrivateLocalData } from './testAnswerStorage';
import { resetSessionCaches } from './sessionCache';

const LOGOUT_TIMEOUT = 5000;

export const authService = {
  login: async (username: string, password: string) => {
    const response = await publicClient.post('/auth/login/', { username, password });
    const data = response.data;

    if (data?.token) {
      // Respostes i codi d'un altre alumne que no va tancar sessió: fora abans d'entrar
      clearPrivateLocalData();
      localStorage.setItem('token', data.token);
      // El que s'havia portat amb la sessió anterior (o sense sessió) no és d'aquest usuari
      resetSessionCaches();
    }
    if (data?.user) {data.user.password = '***';}

    return data;
  },

  register: (payload: RegisterPayload) => registerUser(payload),

  logout: () => {
    const token = localStorage.getItem('token');

    localStorage.removeItem('token');
    localStorage.removeItem('currentStudent');
    clearPrivateLocalData();
    resetSessionCaches();

    if (token) {
      void publicClient
        .post('/auth/logout/', null, {
          headers: { Authorization: `Token ${token}` },
          timeout: LOGOUT_TIMEOUT,
        })
        .catch(() => {
        });
    }
  },

  getToken: () => localStorage.getItem('token')
};

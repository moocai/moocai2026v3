import { registerUser, type RegisterPayload } from './register';
import { publicClient } from './httpClient';
import { clearSavedTestAnswers } from './testAnswerStorage';

const LOGOUT_TIMEOUT = 5000;

export const authService = {
  login: async (username: string, password: string) => {
    const response = await publicClient.post('/users/auth/login/', { username, password });
    const data = response.data;

    if (data?.token) {
      // Respostes d'un altre alumne que no va tancar sessió: fora abans d'entrar
      clearSavedTestAnswers();
      localStorage.setItem('token', data.token);
    }
    if (data?.user) {data.user.password = '***';}

    return data;
  },

  register: (payload: RegisterPayload) => registerUser(payload),

  logout: () => {
    const token = localStorage.getItem('token');

    localStorage.removeItem('token');
    localStorage.removeItem('currentStudent');
    clearSavedTestAnswers();

    if (token) {
      void publicClient
        .post('/users/auth/logout/', null, {
          headers: { Authorization: `Token ${token}` },
          timeout: LOGOUT_TIMEOUT,
        })
        .catch(() => {
        });
    }
  },

  getToken: () => localStorage.getItem('token')
};

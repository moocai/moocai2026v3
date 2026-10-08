import { registerUser, type RegisterPayload } from './register';
import { publicClient } from './httpClient';

const LOGOUT_TIMEOUT = 5000;

export const authService = {
  login: async (username: string, password: string) => {
    const response = await publicClient.post('/auth/login/', { username, password });
    const data = response.data;

    if (data?.token) {localStorage.setItem('token', data.token);}
    if (data?.user) {data.user.password = '***';}

    return data;
  },

  register: (payload: RegisterPayload) => registerUser(payload),

  logout: () => {
    const token = localStorage.getItem('token');

    localStorage.removeItem('token');
    localStorage.removeItem('currentStudent');

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

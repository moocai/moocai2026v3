import axios from 'axios';
import { registerUser, type RegisterPayload } from './register';

// @ts-ignore 
const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;
const LOGOUT_TIMEOUT = 5000;

export const authService = {
  login: async (username: string, password: string) => {
    const response = await axios.post(`${BASE_URL}/users/auth/login/`, { username, password });
    const data = response.data;

    if (data?.token) {localStorage.setItem('token', data.token);}
    if (data?.user) {data.user.password = '***';}

    return data;
  },

  register: (payload: RegisterPayload) => registerUser(payload),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentStudent');

    void axios
      .post(`${BASE_URL}/users/auth/logout/`, null, { timeout: LOGOUT_TIMEOUT })
      .catch(() => {
      });
  },

  getToken: () => localStorage.getItem('token')
};
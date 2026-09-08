import axios from 'axios';

const BASE_URL = 'https://algorien.com/api/v1';

export const authService = {
  login: async (username: string, password: string) => {
    const response = await axios.post(`${BASE_URL}/users/auth/login/`, { username, password });
    const data = response.data;

    if (data?.token) {
      localStorage.setItem('token', data.token);
    }

    return data;
  },

  logout: async () => {
    try {
      await axios.post(`${BASE_URL}/users/auth/logout/`);
    } catch {
      // logout localment si el servidor no respon
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('currentStudent');
    }
  },

  getToken: () => localStorage.getItem('token')
};
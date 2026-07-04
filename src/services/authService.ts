import axios from 'axios';

const BASE_URL = 'https://algorien.com/api';

export const authService = {
  login: async (credentials: { email: string; code: string }) => {
    try {
      const response = await axios.post(`${BASE_URL}/users/auth/login/`, credentials);
      const data = response.data || response;

      if (data && data.token) {
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('currentStudent', JSON.stringify(data.user));
        }
      }
      return data;

    } catch (error) {
      console.error("❌ API no disponible. No hi ha validació local sense connexió.");
      throw error;
    }
  },

  logout: async () => {
    try {
      await axios.post(`${BASE_URL}/users/auth/logout/`);
    } catch (error) {
      console.warn("Servidor no ha respost al logout, netejant localment...");
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('currentStudent');
    }
  },

  getMe: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/users/me/settings/`);
      return response.data || response;
    } catch (error) {
      const saved = localStorage.getItem('currentStudent');
      if (saved) return JSON.parse(saved);
      
      console.error("Error obtenint dades de l'usuari:", error);
      throw error;
    }
  },

  getCurrentUser: () => {
    const saved = localStorage.getItem('currentStudent');
    return saved ? JSON.parse(saved) : null;
  }
};
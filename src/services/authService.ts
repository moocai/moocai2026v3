import { registerUser, type RegisterPayload } from './register';
import { publicClient } from './httpClient';
import { clearPrivateLocalData } from './testAnswerStorage';
import { resetSessionCaches } from './sessionCache';
import { applyAccountLanguage, clearAccountLanguage } from './language';

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
    // L'idioma desat al compte (o, si se n'havia triat un en aquest navegador, aquest al compte)
    if (data?.token) applyAccountLanguage(data?.user?.language);

    return data;
  },

  register: (payload: RegisterPayload) => registerUser(payload),

  /**
   * `POST /auth/password-reset/`: el servidor envia un enllaç per triar una contrasenya nova
   * (si l'adreça és d'un compte amb el correu confirmat). Respon igual (202) tant si n'hi ha
   * com si no, per no revelar quines adreces tenen compte.
   */
  requestPasswordReset: async (email: string) => {
    await publicClient.post('/auth/password-reset/', { email });
  },

  logout: () => {
    const token = localStorage.getItem('token');

    localStorage.removeItem('token');
    localStorage.removeItem('currentStudent');
    clearPrivateLocalData();
    resetSessionCaches();
    clearAccountLanguage();

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

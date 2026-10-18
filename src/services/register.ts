import { apiErrorMessages, publicClient } from './httpClient';
import { clearPrivateLocalData } from './testAnswerStorage';

export const REGISTER_URL = '/auth/register/';
/** Dades del formulari (organitzacions, avatar per defecte). Només `GET`. */
export const REGISTER_OPTIONS_URL = '/auth/register/options/';

export interface Organization {
  id: number;
  name: string;
}

export interface RegistrationInfo {
  organizations: Organization[];
  default_organization_id?: number | null;
  default_avatar?: string | null;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password1: string;
  password2: string;
  organization?: number;
  default_avatar?: string;
  avatar?: File | null;
}

export async function loadRegistrationData(): Promise<RegistrationInfo> {
  const response = await publicClient.get<RegistrationInfo>(REGISTER_OPTIONS_URL);
  return response.data;
}

export async function registerUser(payload: RegisterPayload) {
  const formData = new FormData();

  formData.set('first_name', payload.first_name);
  formData.set('last_name', payload.last_name);
  formData.set('email', payload.email);
  formData.set('username', payload.username);
  formData.set('password1', payload.password1);
  formData.set('password2', payload.password2);

  if (payload.organization && Number.isFinite(payload.organization)) {
    formData.set('organization', String(payload.organization));
  }
  if (payload.default_avatar) {
    formData.set('default_avatar', payload.default_avatar);
  }
  if (payload.avatar) {
    formData.append('avatar', payload.avatar);
  }

  const response = await publicClient.post(REGISTER_URL, formData);

  const data = response.data as { token?: string } | undefined;
  if (data?.token) {
    // Sessió nova: res de l'alumne anterior (ni el seu id, ni les respostes dels tests, ni el codi)
    localStorage.removeItem('currentStudent');
    clearPrivateLocalData();
    localStorage.setItem('token', data.token);
  }

  return data;
}

export function extractRegisterErrors(error: unknown): string {
  const messages = apiErrorMessages(error);
  if (messages.length > 0) return messages.join('. ');
  return "No s'ha pogut crear el compte. Revisa les dades.";
}
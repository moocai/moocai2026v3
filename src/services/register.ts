import axios from 'axios';

// @ts-ignore - Vite replaces import.meta.env statically at build time
const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

export const REGISTER_URL = `${BASE_URL}/users/register/`;

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
  const response = await axios.get<RegistrationInfo>(REGISTER_URL);
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

  const response = await axios.post(REGISTER_URL, formData);

  const data = response.data as { token?: string } | undefined;
  if (data?.token) {
    localStorage.setItem('token', data.token);
  }

  return data;
}

export function extractRegisterErrors(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data) {
      const messages: string[] = [];
      const collect = (value: unknown) => {
        if (Array.isArray(value)) {
          value.forEach(collect);
        } else if (value && typeof value === 'object') {
          Object.values(value as Record<string, unknown>).forEach(collect);
        } else if (value !== null && value !== undefined && String(value).trim() !== '') {
          messages.push(String(value));
        }
      };
      collect(data);
      if (messages.length > 0) return messages.join('. ');
    }
  }
  return "No s'ha pogut crear el compte. Revisa les dades.";
}
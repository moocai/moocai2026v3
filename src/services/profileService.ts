import axios from 'axios';

// @ts-ignore - Vite replaces import.meta.env statically at build time
const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

export const PROFILE_URL = `${BASE_URL}/users/me/settings/`;
export const ORGS_URL = `${BASE_URL}/orgs/`;
export const MY_AVATAR_URL = `${BASE_URL}/users/me/avatar/`;

export interface Organization {
  id: number;
  name: string;
  type?: string | null;
  subtitle?: string | null;
}

export interface ProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
  current_password?: string | null;
  new_password1?: string | null;
  new_password2?: string | null;
}

export interface ProfileUser {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function updateProfile(payload: ProfilePayload): Promise<ProfileUser> {
  const { data } = await axios.patch<ProfileUser>(PROFILE_URL, payload, { headers: authHeaders() });
  return data;
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await axios.get<Organization[] | { results: Organization[] }>(ORGS_URL, { headers: authHeaders() });
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export async function fetchMyAvatar(): Promise<string | null> {
  const { data } = await axios.get<{ avatar?: string | null } | string | null>(MY_AVATAR_URL, { headers: authHeaders() });
  if (typeof data === 'string') return data;
  return data?.avatar ?? null;
}

export async function updateMyAvatar(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.set('avatar', file);
  const { data } = await axios.patch<{ avatar?: string | null } | string | null>(MY_AVATAR_URL, formData, {
    headers: authHeaders(),
  });
  if (typeof data === 'string') return data;
  return data?.avatar ?? null;
}

export function extractProfileErrors(error: unknown): string {
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
  return "No s'ha pogut actualitzar el perfil. Revisa les dades.";
}

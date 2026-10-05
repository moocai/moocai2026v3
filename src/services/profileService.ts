import axios from 'axios';
import { apiClient } from './httpClient';

export const PROFILE_URL = '/users/me/settings/';
export const ORGS_URL = '/orgs/';
export const MY_AVATAR_URL = '/users/me/avatar/';

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

/** Resposta de `GET /users/me/settings/` i del `PATCH` corresponent. */
export interface ProfileUser {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  /** L'URL de l'avatar ve al GET; el PATCH no el documenta. */
  avatar_url?: string;
  /** El PATCH el pot retornar tot i que el GET no el documenta. */
  name?: string;
}

/**
 * Llegeix el perfil autenticat. Es_prefereix a `localStorage`, que només
 * desa el que va arriving del login i deixa camps com `username` o
 * `first_name` buits.
 */
export async function fetchProfile(): Promise<ProfileUser> {
  const { data } = await apiClient.get<ProfileUser>(PROFILE_URL);
  return data;
}

export async function updateProfile(payload: ProfilePayload): Promise<ProfileUser> {
  const { data } = await apiClient.patch<ProfileUser>(PROFILE_URL, payload);
  return data;
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[] | { results: Organization[] }>(ORGS_URL);
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export async function fetchMyAvatar(): Promise<string | null> {
  const { data } = await apiClient.get<{ avatar?: string | null } | string | null>(MY_AVATAR_URL);
  if (typeof data === 'string') return data;
  return data?.avatar ?? null;
}

export async function updateMyAvatar(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.set('avatar', file);
  const { data } = await apiClient.patch<{ avatar?: string | null } | string | null>(MY_AVATAR_URL, formData);
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

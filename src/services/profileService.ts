import { apiClient, apiErrorMessages } from './httpClient';

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

/**
 * Puja l'avatar. `PATCH /users/me/avatar/` respon **204** (sense cos), així que
 * no es pot parsejar: la imatge nova es torna a carregar des de la memòria cau.
 */
export async function updateMyAvatar(file: File): Promise<void> {
  const formData = new FormData();
  formData.set('avatar', file);
  await apiClient.patch(MY_AVATAR_URL, formData);
}

export function extractProfileErrors(error: unknown): string {
  const messages = apiErrorMessages(error);
  if (messages.length > 0) return messages.join('. ');
  return "No s'ha pogut actualitzar el perfil. Revisa les dades.";
}

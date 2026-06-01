import { defaultApi as api } from "@/services/httpClient";
import { config } from "@/config/env";
import type {
  AuthUser,
  EditProfileRequest,
  SignupRequest,
  UpdatePasswordRequest,
  UpdatePasswordResponse,
  AccountActionResponse,
} from "@/models/auth";

const API_URL = `${config.URL_ACCOUNT}/account`;

/**
 * Création d'un compte par un administrateur, avec rôle explicite.
 * Endpoint protégé (ACCOUNT_CREATE). À NE PAS confondre avec l'auto-inscription
 * publique (AuthService.signup) qui force toujours le rôle ENSEIGNANT.
 */
export async function createAccount(
  request: SignupRequest,
  role?: string
): Promise<AuthUser> {
  const params = role ? { role } : {};
  const response = await api.post<AuthUser>(`${API_URL}/create-account`, request, { params });
  return response.data;
}

export async function getAllAccounts(): Promise<AuthUser[]> {
  const response = await api.get<AuthUser[] | { content: AuthUser[] }>(`${API_URL}/list-accounts`);
  const data = response.data;
  if (!data) return [];
  if (Array.isArray(data)) {
    return data;
  }
  return data.content || [];
}

export async function getProfile(): Promise<AuthUser> {
  const response = await api.get<AuthUser>(`${API_URL}/profile`);
  return response.data;
}

export async function editProfile(
  editProfileRequest: EditProfileRequest
): Promise<AuthUser> {
  const response = await api.post<AuthUser>(`${API_URL}/edit-profile`, editProfileRequest);
  return response.data;
}

export async function updatePassword(
  request: UpdatePasswordRequest
): Promise<UpdatePasswordResponse> {
  const res = await api.post(`${API_URL}/update-password`, request);
  return res.data;
}

export async function banAccount(userName: string): Promise<AccountActionResponse> {
  const response = await api.post(`${API_URL}/ban-account`, null, { params: { userName } });
  return response.data;
}

export async function enableAccount(userName: string): Promise<AccountActionResponse> {
  const response = await api.post(`${API_URL}/enable-account`, null, {
    params: { userName },
  });
  return response.data;
}

export async function deleteAccount(userId: string): Promise<AccountActionResponse> {
  const response = await api.delete(`${API_URL}/delete/${userId}`);
  return response.data;
}

export async function updateAccount(
  userId: string,
  editProfileRequest: EditProfileRequest,
  role?: string
): Promise<AuthUser> {
  const params = role ? { role } : {};
  const response = await api.put<AuthUser>(
    `${API_URL}/update/${userId}`,
    editProfileRequest,
    { params }
  );
  return response.data;
}

export default {
  getAllAccounts,
  getProfile,
  editProfile,
  updatePassword,
  banAccount,
  enableAccount,
  deleteAccount,
  updateAccount,
  createAccount,
};





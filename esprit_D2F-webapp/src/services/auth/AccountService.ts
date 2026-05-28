import { defaultApi as api } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
import type {
  AuthUser,
  EditProfileRequest,
  UpdatePasswordRequest,
} from "@/models/auth";

const API_URL = `${config.URL_ACCOUNT}/account`;

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
): Promise<unknown> {
  const res = await api.post(`${API_URL}/update-password`, request);
  return res.data;
}

export async function banAccount(userName: string): Promise<unknown> {
  const response = await api.post(`${API_URL}/ban-account`, null, { params: { userName } });
  return response.data;
}

export async function enableAccount(userName: string): Promise<unknown> {
  const response = await api.post(`${API_URL}/enable-account`, null, {
    params: { userName },
  });
  return response.data;
}

export async function deleteAccount(userId: string): Promise<unknown> {
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
};





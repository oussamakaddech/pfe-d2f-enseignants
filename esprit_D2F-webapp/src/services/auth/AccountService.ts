import { createApiClient } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
import type {
  AuthUser,
  EditProfileRequest,
  UpdatePasswordRequest,
} from "@/models/auth";

const API_URL = `${config.URL_ACCOUNT}/account`;

const api = createApiClient(API_URL);

export async function getAllAccounts(): Promise<AuthUser[]> {
  const response = await api.get<AuthUser[] | { content: AuthUser[] }>("/list-accounts");
  return response.data?.content || response.data || [];
}

export async function getProfile(): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/profile");
  return response.data;
}

export async function editProfile(
  editProfileRequest: EditProfileRequest
): Promise<AuthUser> {
  const response = await api.post<AuthUser>("/edit-profile", editProfileRequest);
  return response.data;
}

export async function updatePassword(
  request: UpdatePasswordRequest
): Promise<unknown> {
  const res = await api.post("/update-password", request);
  return res.data;
}

export async function banAccount(userName: string): Promise<unknown> {
  const response = await api.post("/ban-account", null, { params: { userName } });
  return response.data;
}

export async function enableAccount(userName: string): Promise<unknown> {
  const response = await api.post("/enable-account", null, {
    params: { userName },
  });
  return response.data;
}

export async function deleteAccount(userId: string): Promise<unknown> {
  const response = await api.delete(`/delete/${userId}`);
  return response.data;
}

export async function updateAccount(
  userId: string,
  editProfileRequest: EditProfileRequest,
  role?: string
): Promise<AuthUser> {
  const params = role ? { role } : {};
  const response = await api.put<AuthUser>(
    `/update/${userId}`,
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





import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { config } from "../config/env";
import type {
  AuthUser,
  EditProfileRequest,
  UpdatePasswordRequest,
} from "../models/auth";

const API_URL = `${config.URL_ACCOUNT}/auth/user/account`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((requestConfig: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

export async function getAllAccounts(): Promise<AuthUser[]> {
  const response = await api.get<AuthUser[]>("/list-accounts");
  return response.data;
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
  try {
    const res = await api.post("/update-password", request);
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const typedError = err as AxiosError;
      console.error("updatePassword error", {
        status: typedError.response?.status,
        data: typedError.response?.data,
        request,
      });
    } else {
      console.error("updatePassword unexpected error", { request, err });
    }
    throw err;
  }
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

export default {
  getAllAccounts,
  getProfile,
  editProfile,
  updatePassword,
  banAccount,
  enableAccount,
};

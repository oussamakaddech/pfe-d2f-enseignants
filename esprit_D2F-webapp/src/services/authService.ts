import type { AxiosResponse } from "axios";
import { createApiClient } from "../utils/httpClient";

import { config } from "../config/env";
import type {
  AuthTokenPayload,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  SignupRequest,
  AuthUser,
} from "../models/auth";

const api = createApiClient(`${config.URL_ACCOUNT}/auth`);

export async function login({
  username,
  password,
}: LoginRequest): Promise<LoginResponse> {
  // SÉCURITÉ : credentials envoyés dans le corps POST, jamais dans l'URL
  const response: AxiosResponse<LoginResponse> = await api.post(
    `/user/auth/login`,
    { username, password }
  );

  if (response.data.accessToken) {
    localStorage.setItem("authToken", response.data.accessToken);
  }

  return response.data;
}

export async function signup(payload: SignupRequest): Promise<unknown> {
  const response = await api.post("/user/auth/signup", payload);
  return response.data;
}

export async function forgotPassword(emailAddress: string): Promise<unknown> {
  const url = `/user/auth/forgot-password?emailAddress=${encodeURIComponent(
    emailAddress
  )}`;
  const response = await api.post(url);
  return response.data;
}

export async function resetPassword({
  confirmationKey,
  newPassword,
}: ResetPasswordRequest): Promise<unknown> {
  // SÉCURITÉ : credentials envoyés dans le corps POST, jamais dans l'URL
  const response = await api.post(`/user/auth/reset-password`, {
    confirmationKey,
    newPassword,
  });
  return response.data;
}

export async function getProfile(): Promise<AuthUser> {
  const response = await api.get("/user/auth/profile");
  return response.data;
}

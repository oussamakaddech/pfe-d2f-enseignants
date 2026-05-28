import type { AxiosResponse } from "axios";
import { defaultApi as api } from "@/utils/helpers/httpClient";

import { config } from "@/config/env";
import type {
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  SignupRequest,
  AuthUser,
} from "@/models/auth";

const AUTH_BASE = `${config.URL_ACCOUNT}/auth`;

/**
 * Authenticate user. JWT is set as HttpOnly cookie by the server.
 * Body returns only userId, role, email, expiresIn — NO token.
 */
export async function login({
  username,
  password,
}: LoginRequest): Promise<LoginResponse> {
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);
  const response: AxiosResponse<LoginResponse> = await api.post(
    `${AUTH_BASE}/login`,
    params
  );

  // JWT is now in HttpOnly cookie — no localStorage
  return response.data;
}

export async function signup(payload: SignupRequest): Promise<unknown> {
  const response = await api.post(`${AUTH_BASE}/signup`, payload);
  return response.data;
}

export async function forgotPassword(emailAddress: string): Promise<unknown> {
  const url = `${AUTH_BASE}/forgot-password?emailAddress=${encodeURIComponent(
    emailAddress
  )}`;
  const response = await api.post(url);
  return response.data;
}

export async function resetPassword({
  confirmationKey,
  newPassword,
}: ResetPasswordRequest): Promise<unknown> {
  const response = await api.post(`${AUTH_BASE}/reset-password`, {
    confirmationKey,
    newPassword,
  });
  return response.data;
}

export async function getProfile(): Promise<AuthUser> {
  const response = await api.get(`${AUTH_BASE}/profile`);
  return response.data;
}

/**
 * Refresh JWT cookie silently. Server validates existing cookie
 * and returns a new one.
 */
export async function refreshToken(): Promise<LoginResponse> {
  const response: AxiosResponse<LoginResponse> = await api.get(
    `${AUTH_BASE}/refresh`,
    { meta: { silent: true } } as never
  );
  return response.data;
}

/**
 * Logout — server invalidates the HttpOnly cookie (Max-Age=0).
 */
export async function logout(): Promise<void> {
  await api.post(`${AUTH_BASE}/logout`);
}





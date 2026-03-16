export type UserRole = "admin" | "D2F" | "CUP" | "Formateur" | string;

export interface AuthUser {
  id?: string | number;
  userName?: string;
  username?: string;
  emailAddress?: string;
  role?: UserRole;
  [key: string]: unknown;
}

export interface AuthTokenPayload {
  exp: number;
  iat?: number;
  sub?: string;
  role?: string;
  [key: string]: unknown;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  [key: string]: unknown;
}

export interface SignupRequest {
  [key: string]: unknown;
}

export interface ResetPasswordRequest {
  confirmationKey: string;
  newPassword: string;
}

export interface EditProfileRequest {
  [key: string]: unknown;
}

export interface UpdatePasswordRequest {
  [key: string]: unknown;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
}

export type UserRole = "admin" | "D2F" | "CUP" | "Enseignant" | "Formateur" | "ResponsableDossier" | string;

export interface AuthUser {
  id?: string | number;
  userId?: string | number;
  userName?: string;
  username?: string;
  email?: string;
  emailAddress?: string;
  role?: UserRole;
  expiresIn?: number;
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

/**
 * Login response — JWT is now in HttpOnly cookie, NOT in the body.
 * The body contains only metadata for the UI.
 */
export interface LoginResponse {
  userId?: string | number;
  username?: string;
  role?: string;
  email?: string;
  expiresIn?: number;
  /** @deprecated Token is now in HttpOnly cookie. Kept for mobile backward compat. */
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
  login: (userData: AuthUser) => void;
  logout: () => void;
}





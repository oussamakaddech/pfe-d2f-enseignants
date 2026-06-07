// Source de vérité : `utils/constants/roles.ts` (dérivé de `ROLES`).
// On importe + re-exporte ici pour préserver la compatibilité des imports
// existants (`@/models/auth`) et éviter d'avoir 3 déclarations désynchronisées.
// Rôles valides : "admin" | "D2F" | "CUP" | "Enseignant" | "Animateur"
//                 | "CHEF_DEPARTEMENT" | "ResponsableDossier"
// (Le rôle FORMATEUR a été consolidé dans ANIMATEUR — cf. migration V19.)
import type { UserRole } from "@/utils/constants/roles";
export type { UserRole };

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
  id?: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email: string;
  // SÉCURITÉ (audit DSI) : aucun rôle n'est transmis à l'inscription publique.
  // Tout compte auto-inscrit est ENSEIGNANT. L'attribution d'un rôle (création
  // de compte par un admin) passe par AccountService.createAccount (?role=...),
  // jamais par le corps de /signup.
}

export interface ResetPasswordRequest {
  confirmationKey: string;
  newPassword: string;
}

export interface EditProfileRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
}

export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (userData: AuthUser) => void;
  logout: () => void;
}





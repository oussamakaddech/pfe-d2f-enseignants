export interface UpdatePasswordResponse {
  message?: string;
  success?: boolean;
}

export interface AccountActionResponse {
  message?: string;
  success?: boolean;
}

export interface SignupResponse {
  userId?: string;
  email?: string;
  message?: string;
  success?: boolean;
}

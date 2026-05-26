import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login as loginApi } from "@/services/auth/AuthService";
import { forgotPassword } from "@/services/auth/AuthService";
import { resetPassword } from "@/services/auth/AuthService";
import { getProfile, editProfile, updatePassword as updatePasswordApi } from "@/services/auth/AccountService";
import { banAccount, enableAccount, deleteAccount, updateAccount } from "@/services/auth/AccountService";
import type { LoginRequest, ResetPasswordRequest, EditProfileRequest, UpdatePasswordRequest } from "@/models/auth";

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginRequest) => loginApi(payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordRequest) => resetPassword(payload),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (payload: UpdatePasswordRequest) => updatePasswordApi(payload),
  });
}

export function useEditProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditProfileRequest) => editProfile(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useBanAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userName: string) => banAccount(userName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useEnableAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userName: string) => enableAccount(userName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteAccount(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data, role }: { userId: string; data: EditProfileRequest; role?: string }) =>
      updateAccount(userId, data, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

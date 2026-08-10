import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useLogin,
  useForgotPassword,
  useResetPassword,
  useUpdatePassword,
  useEditProfile,
  useBanAccount,
  useEnableAccount,
  useDeleteAccount,
  usePermanentDeleteAccount,
  useUpdateAccount,
} from '@/hooks/auth/useAuthService';
import { login as loginApi, forgotPassword, resetPassword } from '@/services/auth/AuthService';
import {
  editProfile,
  updatePassword as updatePasswordApi,
  banAccount,
  enableAccount,
  deleteAccount,
  permanentDeleteAccount,
  updateAccount,
} from '@/services/auth/AccountService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/auth/AuthService', () => ({
  login: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
}));
vi.mock('@/services/auth/AccountService', () => ({
  editProfile: vi.fn(),
  updatePassword: vi.fn(),
  banAccount: vi.fn(),
  enableAccount: vi.fn(),
  deleteAccount: vi.fn(),
  permanentDeleteAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

describe('useAuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useLogin calls loginApi', async () => {
    (loginApi as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
    result.current.mutate({ username: 'u', password: 'p' } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(loginApi).toHaveBeenCalledWith({ username: 'u', password: 'p' });
  });

  it('useForgotPassword calls forgotPassword', async () => {
    (forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync('a@b.c');
    });
    expect(forgotPassword).toHaveBeenCalledWith('a@b.c');
  });

  it('useResetPassword calls resetPassword', async () => {
    (resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ token: 't', password: 'p' } as never);
    });
    expect(resetPassword).toHaveBeenCalled();
  });

  it('useUpdatePassword is exposed and callable', async () => {
    (updatePasswordApi as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdatePassword(), { wrapper: createWrapper() });
    result.current.mutate({ oldPassword: 'a', newPassword: 'b' } as never);
    await waitFor(() => expect(updatePasswordApi).toHaveBeenCalled());
  });

  it('useEditProfile invalidates profile', async () => {
    (editProfile as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useEditProfile(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ nom: 'x' } as never);
    });
    expect(editProfile).toHaveBeenCalled();
  });

  it('useBanAccount calls banAccount', async () => {
    (banAccount as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useBanAccount(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync('user1');
    });
    expect(banAccount).toHaveBeenCalledWith('user1');
  });

  it('useEnableAccount calls enableAccount', async () => {
    (enableAccount as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useEnableAccount(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync('user1');
    });
    expect(enableAccount).toHaveBeenCalledWith('user1');
  });

  it('useDeleteAccount calls deleteAccount', async () => {
    (deleteAccount as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync('id1');
    });
    expect(deleteAccount).toHaveBeenCalledWith('id1');
  });

  it('usePermanentDeleteAccount calls permanentDeleteAccount', async () => {
    (permanentDeleteAccount as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => usePermanentDeleteAccount(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync('id1');
    });
    expect(permanentDeleteAccount).toHaveBeenCalledWith('id1');
  });

  it('useUpdateAccount calls updateAccount', async () => {
    (updateAccount as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateAccount(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ userId: 'id1', data: {}, role: 'R' } as never);
    });
    expect(updateAccount).toHaveBeenCalled();
  });

  it('useUpdatePassword calls updatePasswordApi', async () => {
    (updatePasswordApi as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdatePassword(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ oldPassword: 'a', newPassword: 'b' } as never);
    });
    expect(updatePasswordApi).toHaveBeenCalled();
  });
});

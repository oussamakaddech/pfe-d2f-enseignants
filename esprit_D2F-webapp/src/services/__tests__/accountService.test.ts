import { beforeEach, describe, expect, it, vi } from 'vitest';

const accountMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  requestInterceptorRef: { current: undefined as ((cfg: any) => any) | undefined },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: accountMocks.mockGet,
      post: accountMocks.mockPost,
      interceptors: {
        request: {
          use: vi.fn((handler: (cfg: any) => any) => {
            accountMocks.requestInterceptorRef.current = handler;
          }),
        },
      },
    })),
    isAxiosError: vi.fn((error) => Boolean(error && error.isAxiosError)),
  },
}));

import accountService, {
  banAccount,
  editProfile,
  enableAccount,
  getAllAccounts,
  getProfile,
  updatePassword,
} from '../accountService';

describe('accountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('loads accounts/profile and edits profile', async () => {
    accountMocks.mockGet.mockResolvedValueOnce({ data: [{ userName: 'u1' }] });
    await expect(getAllAccounts()).resolves.toEqual([{ userName: 'u1' }]);

    accountMocks.mockGet.mockResolvedValueOnce({ data: { userName: 'u1' } });
    await expect(getProfile()).resolves.toEqual({ userName: 'u1' });

    accountMocks.mockPost.mockResolvedValueOnce({ data: { userName: 'u1', nom: 'N' } });
    await expect(editProfile({ nom: 'N' } as never)).resolves.toEqual({ userName: 'u1', nom: 'N' });
  });

  it('updates password and handles API error', async () => {
    accountMocks.mockPost.mockResolvedValueOnce({ data: { ok: true } });
    await expect(updatePassword({ oldPassword: 'a', newPassword: 'b' } as never)).resolves.toEqual({ ok: true });

    const error: any = { isAxiosError: true, response: { status: 400, data: { msg: 'bad' } } };
    accountMocks.mockPost.mockRejectedValueOnce(error);
    await expect(updatePassword({ oldPassword: 'a', newPassword: 'b' } as never)).rejects.toEqual(error);
  });

  it('ban/enables account and exports default API', async () => {
    accountMocks.mockPost.mockResolvedValueOnce({ data: { banned: true } });
    await expect(banAccount('john')).resolves.toEqual({ banned: true });

    accountMocks.mockPost.mockResolvedValueOnce({ data: { enabled: true } });
    await expect(enableAccount('john')).resolves.toEqual({ enabled: true });

    expect(accountService.getAllAccounts).toBeTypeOf('function');
  });

  it('request interceptor adds bearer token when available', async () => {
    localStorage.setItem('authToken', 'abc');
    const cfg = { headers: {} as Record<string, string> };
    const out = await accountMocks.requestInterceptorRef.current?.(cfg);
    expect(out.headers.Authorization).toBe('Bearer abc');
  });
});

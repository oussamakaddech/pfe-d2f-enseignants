import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  requestInterceptorRef: { current: undefined as ((cfg: any) => any) | undefined },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: authMocks.mockPost,
      get: authMocks.mockGet,
      interceptors: {
        request: {
          use: vi.fn((handler: (cfg: any) => any) => {
            authMocks.requestInterceptorRef.current = handler;
          }),
        },
      },
    })),
  },
}));

const mockJwtDecode = vi.fn();
vi.mock('jwt-decode', () => ({
  jwtDecode: (...args: unknown[]) => mockJwtDecode(...args),
}));

import {
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  signup,
} from '../authService';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('stores token on login', async () => {
    authMocks.mockPost.mockResolvedValueOnce({ data: { accessToken: 'abc' } });
    const data = await login({ username: 'john', password: 'pwd' });
    expect(data).toEqual({ accessToken: 'abc' });
    expect(localStorage.getItem('authToken')).toBe('abc');
  });

  it('calls signup/forgot/reset/profile endpoints', async () => {
    authMocks.mockPost.mockResolvedValueOnce({ data: { ok: true } });
    await expect(signup({ username: 'u' } as never)).resolves.toEqual({ ok: true });

    authMocks.mockPost.mockResolvedValueOnce({ data: { sent: true } });
    await expect(forgotPassword('a@b.com')).resolves.toEqual({ sent: true });

    authMocks.mockPost.mockResolvedValueOnce({ data: { reset: true } });
    await expect(resetPassword({ confirmationKey: 'k', newPassword: 'n' })).resolves.toEqual({ reset: true });

    authMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(getProfile()).resolves.toEqual({ id: 1 });
  });

  it('interceptor rejects expired token and removes it', async () => {
    localStorage.setItem('authToken', 'expired-token');
    mockJwtDecode.mockReturnValue({ exp: 1 });

    expect(authMocks.requestInterceptorRef.current).toBeTypeOf('function');
    await expect(authMocks.requestInterceptorRef.current?.({ headers: {} })).rejects.toThrow('Token expire');
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('interceptor attaches valid token', async () => {
    localStorage.setItem('authToken', 'valid-token');
    mockJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

    const cfg = { headers: {} as Record<string, string> };
    const out = await authMocks.requestInterceptorRef.current?.(cfg);
    expect(out.headers.Authorization).toBe('Bearer valid-token');
  });
});

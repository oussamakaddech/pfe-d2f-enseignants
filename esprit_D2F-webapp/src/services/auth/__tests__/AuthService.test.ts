import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config/env';

const apiMocks = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  createApiClient: vi.fn(() => ({
    post: apiMocks.mockPost,
    get: apiMocks.mockGet,
  })),
  defaultApi: {
    post: apiMocks.mockPost,
    get: apiMocks.mockGet,
  },
}));

import {
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  signup,
} from '../AuthService';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const authUrl = `${config.URL_ACCOUNT}/auth`;

  it('returns user metadata on login (cookie is set by server)', async () => {
    const mockResponse = { userId: 1, role: 'admin', email: 'test@test.com' };
    apiMocks.mockPost.mockResolvedValueOnce({ data: mockResponse });
    const data = await login({ username: 'john', password: 'pwd' });
    expect(data).toEqual(mockResponse);
    expect(apiMocks.mockPost).toHaveBeenCalledWith(`${authUrl}/login`, expect.any(URLSearchParams));
  });

  it('calls signup/forgot/reset/profile endpoints', async () => {
    apiMocks.mockPost.mockResolvedValueOnce({ data: { ok: true } });
    await expect(signup({ username: 'u' } as never)).resolves.toEqual({ ok: true });

    apiMocks.mockPost.mockResolvedValueOnce({ data: { sent: true } });
    await expect(forgotPassword('a@b.com')).resolves.toEqual({ sent: true });

    apiMocks.mockPost.mockResolvedValueOnce({ data: { reset: true } });
    await expect(resetPassword({ confirmationKey: 'k', newPassword: 'n' })).resolves.toEqual({ reset: true });

    apiMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(getProfile()).resolves.toEqual({ id: 1 });
  });

  it('refreshToken is sent silently', async () => {
    apiMocks.mockGet.mockResolvedValueOnce({ data: { userId: 1, role: 'admin', email: 'a@b.com' } });

    await expect(import('../AuthService').then(({ refreshToken }) => refreshToken())).resolves.toEqual({
      userId: 1,
      role: 'admin',
      email: 'a@b.com',
    });

    expect(apiMocks.mockGet).toHaveBeenCalledWith(`${authUrl}/refresh`, { meta: { silent: true } });
  });
});





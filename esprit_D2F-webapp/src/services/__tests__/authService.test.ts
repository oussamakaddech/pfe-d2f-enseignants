import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock('../../utils/httpClient', () => ({
  createApiClient: vi.fn(() => ({
    post: apiMocks.mockPost,
    get: apiMocks.mockGet,
  })),
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

  it('returns user metadata on login (cookie is set by server)', async () => {
    const mockResponse = { userId: 1, role: 'admin', email: 'test@test.com' };
    apiMocks.mockPost.mockResolvedValueOnce({ data: mockResponse });
    const data = await login({ username: 'john', password: 'pwd' });
    expect(data).toEqual(mockResponse);
    expect(apiMocks.mockPost).toHaveBeenCalledWith('/login', expect.any(URLSearchParams));
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
});

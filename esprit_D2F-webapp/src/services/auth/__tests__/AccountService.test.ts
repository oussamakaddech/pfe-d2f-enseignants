import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config/env';

const apiMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  createApiClient: vi.fn(() => ({
    get: apiMocks.mockGet,
    post: apiMocks.mockPost,
    put: apiMocks.mockPut,
    delete: apiMocks.mockDelete,
  })),
  defaultApi: {
    get: apiMocks.mockGet,
    post: apiMocks.mockPost,
    put: apiMocks.mockPut,
    delete: apiMocks.mockDelete,
  },
}));

import accountService from '../AccountService';

describe('accountService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const accountUrl = `${config.URL_ACCOUNT}/account`;

  it('lists accounts', async () => {
    apiMocks.mockGet.mockResolvedValueOnce({ data: [{ username: 'u1' }] });
    const result = await accountService.getAllAccounts();
    expect(result).toEqual([{ username: 'u1' }]);
    expect(apiMocks.mockGet).toHaveBeenCalledWith(`${accountUrl}/list-accounts`);
  });

  it('gets profile', async () => {
    apiMocks.mockGet.mockResolvedValueOnce({ data: { id: '1' } });
    const result = await accountService.getProfile();
    expect(result).toEqual({ id: '1' });
    expect(apiMocks.mockGet).toHaveBeenCalledWith(`${accountUrl}/profile`);
  });

  it('edits profile', async () => {
    apiMocks.mockPost.mockResolvedValueOnce({ data: { id: '1', email: 'e' } });
    const result = await accountService.editProfile({ email: 'e' } as Record<string, unknown>);
    expect(result).toEqual({ id: '1', email: 'e' });
    expect(apiMocks.mockPost).toHaveBeenCalledWith(`${accountUrl}/edit-profile`, { email: 'e' });
  });

  it('updates password', async () => {
    apiMocks.mockPost.mockResolvedValueOnce({ data: 'ok' });
    const result = await accountService.updatePassword({ oldPassword: 'p1', newPassword: 'p2' });
    expect(result).toBe('ok');
  });

  it('bans/enables account', async () => {
    apiMocks.mockPost.mockResolvedValueOnce({ data: 'banned' });
    await accountService.banAccount('u1');
    expect(apiMocks.mockPost).toHaveBeenCalledWith(`${accountUrl}/ban-account`, null, { params: { userName: 'u1' } });

    apiMocks.mockPost.mockResolvedValueOnce({ data: 'enabled' });
    await accountService.enableAccount('u1');
    expect(apiMocks.mockPost).toHaveBeenCalledWith(`${accountUrl}/enable-account`, null, { params: { userName: 'u1' } });
  });

  it('deletes/updates account', async () => {
    apiMocks.mockDelete.mockResolvedValueOnce({ data: 'deleted' });
    await accountService.deleteAccount('id1');
    expect(apiMocks.mockDelete).toHaveBeenCalledWith(`${accountUrl}/delete/id1`);

    apiMocks.mockPut.mockResolvedValueOnce({ data: { id: 'id1' } });
    await accountService.updateAccount('id1', { email: 'e' } as Record<string, unknown>, 'ROLE_ADMIN');
    expect(apiMocks.mockPut).toHaveBeenCalledWith(`${accountUrl}/update/id1`, { email: 'e' }, { params: { role: 'ROLE_ADMIN' } });
  });
});





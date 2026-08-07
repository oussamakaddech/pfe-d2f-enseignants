import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config/env';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    patch: httpMocks.mockPatch,
    delete: httpMocks.mockDelete,
  },
}));

import { notificationService } from '../notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const base = `${config.NOTIFICATION_URL}/notifications`;

  const raw = (over: Record<string, unknown> = {}) => ({
    id: 1,
    type: 'FORMATION',
    severity: 'INFO',
    title: 'T',
    message: 'M',
    read: false,
    createdAt: '2026-01-01T00:00:00Z',
    link: '/x',
    actor: 'A',
    meta: { k: 1 },
    ...over,
  });

  it('lists and maps notifications', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { content: [raw()], totalElements: 1, totalPages: 1, number: 0 },
    });
    const out = await notificationService.list({ unreadOnly: true, page: 2, size: 5 });
    expect(out).toEqual([
      {
        id: '1',
        type: 'FORMATION',
        severity: 'info',
        title: 'T',
        message: 'M',
        read: false,
        createdAt: '2026-01-01T00:00:00Z',
        link: '/x',
        actor: 'A',
        meta: { k: 1 },
      },
    ]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(base, {
      params: { unreadOnly: true, page: 2, size: 5 },
    });
  });

  it('list returns empty when content missing and applies defaults', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: {} });
    const out = await notificationService.list();
    expect(out).toEqual([]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(base, {
      params: { unreadOnly: false, page: 0, size: 100 },
    });
  });

  it('normalizes missing fields in toApp', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { content: [{ id: 2, type: 'SYSTEM', title: 'X' }] },
    });
    const [n] = await notificationService.list();
    expect(n.severity).toBe('info');
    expect(n.message).toBe('');
    expect(n.read).toBe(false);
    expect(typeof n.createdAt).toBe('string');
    expect(n.link).toBeUndefined();
  });

  it('gets unread count', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { total: 10, unread: 3 } });
    expect(await notificationService.getUnreadCount()).toBe(3);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${base}/count`);

    httpMocks.mockGet.mockResolvedValueOnce({ data: {} });
    expect(await notificationService.getUnreadCount()).toBe(0);
  });

  it('marks one as read', async () => {
    httpMocks.mockPatch.mockResolvedValueOnce({});
    await notificationService.markAsRead('42');
    expect(httpMocks.mockPatch).toHaveBeenCalledWith(`${base}/42/read`);
  });

  it('marks all as read', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({});
    await notificationService.markAllAsRead();
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${base}/read-all`);
  });

  it('removes one and clears all', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await notificationService.remove('7');
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(`${base}/7`);

    httpMocks.mockDelete.mockResolvedValueOnce({});
    await notificationService.clearAll();
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(base);
  });

  it('creates a notification and uppercases severity', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: raw({ id: 9, severity: 'SUCCESS' }) });
    const out = await notificationService.create({
      recipient: 'u',
      type: 'FORMATION',
      severity: 'success',
      title: 'T',
      message: 'M',
      link: '/l',
      actor: 'A',
      meta: { a: 1 },
    });
    expect(out.severity).toBe('success');
    expect(httpMocks.mockPost).toHaveBeenCalledWith(base, {
      recipient: 'u',
      type: 'FORMATION',
      severity: 'SUCCESS',
      title: 'T',
      message: 'M',
      link: '/l',
      actor: 'A',
      meta: { a: 1 },
    });
  });

  it('rejects on failure', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('x'));
    await expect(notificationService.list()).rejects.toThrow('x');
    httpMocks.mockDelete.mockRejectedValueOnce(new Error('x'));
    await expect(notificationService.remove('1')).rejects.toThrow('x');
  });
});

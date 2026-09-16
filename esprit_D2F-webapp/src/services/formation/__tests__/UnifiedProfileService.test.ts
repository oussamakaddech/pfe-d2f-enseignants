import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config/env';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
  },
}));

import UnifiedProfileService from '../UnifiedProfileService';

describe('UnifiedProfileService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const base = `${config.FORMATION_URL}/api/v1/unified-profiles`;

  it('searches with default page/size', async () => {
    const data = [{ id: '1', nom: 'A', prenom: 'B', email: 'a@b.c', role: 'ENS', departement: null, unitePedagogique: null, matricule: null, grade: null, statut: null, isActive: true }];
    httpMocks.mockGet.mockResolvedValueOnce({ data });
    const out = await UnifiedProfileService.search({ search: 'ali' });
    expect(out).toEqual(data);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(base, { params: { search: 'ali', role: undefined, page: 0, size: 20 } });
  });

  it('searches with explicit filters', async () => {
    const page = { content: [{ id: '2' }], totalElements: 1, totalPages: 1, number: 0, size: 5 };
    httpMocks.mockGet.mockResolvedValueOnce({ data: page });
    const out = await UnifiedProfileService.search({ search: 'x', role: 'ENS', page: 3, size: 5 });
    expect(out).toEqual([{ id: '2' }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(base, { params: { search: 'x', role: 'ENS', page: 3, size: 5 } });
  });

  it('normalizes data/content/items shapes', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { data: [{ id: '3' }] } });
    expect(await UnifiedProfileService.search({ search: 's' })).toEqual([{ id: '3' }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [{ id: '4' }] } });
    expect(await UnifiedProfileService.search({ search: 's' })).toEqual([{ id: '4' }]);
  });

  it('returns empty for unknown object shape or non-object', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { unknown: true } });
    expect(await UnifiedProfileService.search({ search: 's' })).toEqual([]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: null });
    expect(await UnifiedProfileService.search({ search: 's' })).toEqual([]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: 'plain' });
    expect(await UnifiedProfileService.search({ search: 's' })).toEqual([]);
  });

  it('rejects on request failure', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    await expect(UnifiedProfileService.search({ search: 's' })).rejects.toThrow('fail');
  });
});

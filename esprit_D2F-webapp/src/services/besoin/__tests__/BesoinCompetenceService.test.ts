import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    put: httpMocks.mockPut,
  },
}));

import BesoinCompetenceService from '../BesoinCompetenceService';

describe('BesoinCompetenceService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets competences by besoin id', async () => {
    const links = [{ id: 1, competenceId: 10, besoinId: 5 }];
    httpMocks.mockGet.mockResolvedValueOnce({ data: links });

    const result = await BesoinCompetenceService.getByBesoin(5);

    expect(result).toEqual(links);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/5/competences'));
  });

  it('replaces all competences for a besoin', async () => {
    const links = [{ id: 1, competenceId: 10, besoinId: 5 }, { id: 2, competenceId: 11, besoinId: 5 }];
    httpMocks.mockPut.mockResolvedValueOnce({ data: links });

    const result = await BesoinCompetenceService.replaceAll(5, links as never);

    expect(result).toEqual(links);
    expect(httpMocks.mockPut).toHaveBeenCalledWith(
      expect.stringContaining('/5/competences'),
      links
    );
  });
});

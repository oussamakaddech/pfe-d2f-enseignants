import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
  },
}));

import KPIService from '../KPIService';

describe('KPIService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets total formations', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: 10 });
    const result = await KPIService.getTotalFormations('2026-01-01', '2026-12-31');
    expect(result).toBe(10);
  });

  it('gets total heures', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: 120 });
    const result = await KPIService.getTotalHeures('2026-01-01', '2026-12-31');
    expect(result).toBe(120);
  });

  it('gets unique participants', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: 50 });
    const result = await KPIService.getUniqueParticipants('2026-01-01', '2026-12-31');
    expect(result).toBe(50);
  });

  it('gets formations by etat', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { planifie: 3 } });
    const result = await KPIService.getFormationsByEtat('2026-01-01', '2026-12-31');
    expect(result).toEqual({ planifie: 3 });
  });

  it('gets top participants and absentees', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ name: 'A' }] });
    await expect(KPIService.getTopParticipants('s', 'e')).resolves.toEqual([{ name: 'A' }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ name: 'B' }] });
    await expect(KPIService.getTopAbsentees('s', 'e')).resolves.toEqual([{ name: 'B' }]);
  });

  it('gets count and heures with filters', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { count: 5, totalHeures: 20 } });
    const result = await KPIService.getCountAndHeures({ domaine: 'IT' });
    expect(result).toEqual({ count: 5, totalHeures: 20 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/count-heures'), { params: { domaine: 'IT' } });
  });

  it('handles 404 gracefully', async () => {
    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    const result = await KPIService.getTotalFormations('s', 'e');
    expect(result).toBe(0);
  });
});





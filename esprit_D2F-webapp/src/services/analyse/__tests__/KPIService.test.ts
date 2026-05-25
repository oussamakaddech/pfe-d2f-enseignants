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

  it('throws on non-404 network errors', async () => {
    const err = new Error('Network error');
    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(KPIService.getTotalFormations('s', 'e')).rejects.toThrow('Network error');

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(KPIService.getTotalHeures('s', 'e')).rejects.toThrow();

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(KPIService.getUniqueParticipants('s', 'e')).rejects.toThrow();

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(KPIService.getFormationsByEtat('s', 'e')).rejects.toThrow();
  });

  it('getTopParticipants and getTopAbsentees with optional filters', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const r1 = await KPIService.getTopParticipants('s', 'e', 'up1', 'dept1');
    expect(r1).toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 2 }] });
    const r2 = await KPIService.getTopAbsentees('s', 'e', 'up2', 'dept2');
    expect(r2).toEqual([{ id: 2 }]);
  });

  it('getTopParticipants and getTopAbsentees handle 404 and throw', async () => {
    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(KPIService.getTopParticipants('s', 'e')).resolves.toEqual([]);

    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    await expect(KPIService.getTopParticipants('s', 'e')).rejects.toThrow();

    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(KPIService.getTopAbsentees('s', 'e')).resolves.toEqual([]);

    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    await expect(KPIService.getTopAbsentees('s', 'e')).rejects.toThrow();
  });

  it('getCountAndHeures with all filters', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { count: 2, totalHeures: 10 } });
    const result = await KPIService.getCountAndHeures({
      domaine: 'GC', upId: 1, deptId: 2, ouverte: true, start: 's', end: 'e', etat: 'planifie',
    });
    expect(result).toEqual({ count: 2, totalHeures: 10 });

    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(KPIService.getCountAndHeures({})).resolves.toEqual({ count: 0, totalHeures: 0 });

    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    await expect(KPIService.getCountAndHeures({})).rejects.toThrow();
  });

  it('getEnseignantsNonAffectes succeeds, handles 404, and throws', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'E1' }] });
    await expect(KPIService.getEnseignantsNonAffectes('s', 'e')).resolves.toEqual([{ id: 'E1' }]);

    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(KPIService.getEnseignantsNonAffectes('s', 'e')).resolves.toEqual([]);

    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    await expect(KPIService.getEnseignantsNonAffectes('s', 'e')).rejects.toThrow();
  });

  it('getFormationsByTypeFiltered succeeds with all params, handles 404, and throws', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { interne: 1, externe: 2, enLigne: 3 } });
    const r = await KPIService.getFormationsByTypeFiltered({
      domaine: 'GC', upId: 1, deptId: 2, ouverte: true, start: 's', end: 'e', etat: 'planifie',
    });
    expect(r).toEqual({ interne: 1, externe: 2, enLigne: 3 });

    httpMocks.mockGet.mockResolvedValueOnce({ data: null });
    const r2 = await KPIService.getFormationsByTypeFiltered({});
    expect(r2).toEqual({ interne: 0, externe: 0, enLigne: 0 });

    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(KPIService.getFormationsByTypeFiltered({})).resolves.toEqual({ interne: 0, externe: 0, enLigne: 0 });

    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    await expect(KPIService.getFormationsByTypeFiltered({})).rejects.toThrow();
  });

  it('getCountByTrainerTypeWithIds succeeds, handles 404, and throws', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ type: 'interne', count: 5 }] });
    await expect(KPIService.getCountByTrainerTypeWithIds({ deptId: 1 })).resolves.toEqual([{ type: 'interne', count: 5 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: null });
    await expect(KPIService.getCountByTrainerTypeWithIds()).resolves.toEqual([]);

    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(KPIService.getCountByTrainerTypeWithIds()).resolves.toEqual([]);

    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    await expect(KPIService.getCountByTrainerTypeWithIds()).rejects.toThrow();
  });
});





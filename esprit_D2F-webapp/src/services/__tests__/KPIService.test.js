import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import KPIService from '../KPIService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn((error) => Boolean(error && error.isAxiosError)),
  },
}));

function axios404() {
  return { isAxiosError: true, response: { status: 404 } };
}

describe('KPIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns basic KPI counters', async () => {
    axios.get.mockResolvedValueOnce({ data: 8 });
    await expect(KPIService.getTotalFormations('2026-01-01', '2026-12-31')).resolves.toBe(8);

    axios.get.mockResolvedValueOnce({ data: 120 });
    await expect(KPIService.getTotalHeures('2026-01-01', '2026-12-31')).resolves.toBe(120);

    axios.get.mockResolvedValueOnce({ data: 33 });
    await expect(KPIService.getUniqueParticipants('2026-01-01', '2026-12-31')).resolves.toBe(33);
  });

  it('returns defaults on 404 for scalar/list endpoints', async () => {
    axios.get.mockRejectedValueOnce(axios404());
    await expect(KPIService.getTopParticipants('2026-01-01', '2026-12-31')).resolves.toEqual([]);

    axios.get.mockRejectedValueOnce(axios404());
    await expect(KPIService.getTopAbsentees('2026-01-01', '2026-12-31')).resolves.toEqual([]);

    axios.get.mockRejectedValueOnce(axios404());
    await expect(KPIService.getEnseignantsNonAffectes('2026-01-01', '2026-12-31')).resolves.toEqual([]);

    axios.get.mockRejectedValueOnce(axios404());
    await expect(KPIService.getCountAndHeures()).resolves.toEqual({ count: 0, totalHeures: 0 });

    axios.get.mockRejectedValueOnce(axios404());
    await expect(KPIService.getCountByTrainerTypeWithIds()).resolves.toEqual([]);
  });

  it('returns filtered KPI responses', async () => {
    axios.get.mockResolvedValueOnce({ data: { enregistre: 1, planifie: 1, enCours: 1, acheve: 1, annule: 0, total: 4 } });
    await expect(KPIService.getFormationsByEtat('2026-01-01', '2026-12-31')).resolves.toEqual({ enregistre: 1, planifie: 1, enCours: 1, acheve: 1, annule: 0, total: 4 });

    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(KPIService.getTopParticipants('2026-01-01', '2026-12-31', 2, 3)).resolves.toEqual([{ id: 1 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 2 }] });
    await expect(KPIService.getTopAbsentees('2026-01-01', '2026-12-31', 2, 3)).resolves.toEqual([{ id: 2 }]);

    axios.get.mockResolvedValueOnce({ data: { count: 9, totalHeures: 42 } });
    await expect(KPIService.getCountAndHeures({ domaine: 'GC', upId: 2, deptId: 3, ouverte: true, start: '2026-01-01', end: '2026-12-31', etat: 'ACH' })).resolves.toEqual({ count: 9, totalHeures: 42 });

    axios.get.mockResolvedValueOnce({ data: { interne: 3, externe: 1, enLigne: 2 } });
    await expect(KPIService.getFormationsByTypeFiltered({ domaine: 'GC', upId: 2 })).resolves.toEqual({ interne: 3, externe: 1, enLigne: 2 });

    axios.get.mockResolvedValueOnce({ data: [{ type: 'interne', count: 4 }] });
    await expect(KPIService.getCountByTrainerTypeWithIds({ start: '2026-01-01' })).resolves.toEqual([{ type: 'interne', count: 4 }]);
  });
});

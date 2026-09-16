import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
  },
}));

import FormationReportService from '../FormationReportService';

describe('FormationReportService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets formations by role and period with Date objects', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1, title: 'Test' }] });
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');
    const result = await FormationReportService.getFormationsParRoleEtPeriode('animateur', 'E1', start, end);
    
    expect(result).toEqual([{ id: 1, title: 'Test' }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.anything(), {
      params: {
        role: 'animateur',
        enseignantId: 'E1',
        start: '2026-01-01',
        end: '2026-01-31'
      }
    });
  });

  it('gets formations by role and period with string dates', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [] });
    await FormationReportService.getFormationsParRoleEtPeriode('participant', 'E2', '2026-02-01', '2026-02-28');
    
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.anything(), {
      params: {
        role: 'participant',
        enseignantId: 'E2',
        start: '2026-02-01',
        end: '2026-02-28'
      }
    });
  });

  it('throws on error', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('Fetch failed'));
    await expect(FormationReportService.getFormationsParRoleEtPeriode('a', 'b', 'c', 'd')).rejects.toThrow('Fetch failed');
  });
});





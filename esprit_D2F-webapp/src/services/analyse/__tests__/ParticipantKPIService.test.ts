import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
  },
}));

import ParticipantKPIService from '../ParticipantKPIService';

describe('ParticipantKPIService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets formations participant KPIs', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ formation: 'Java', presenceRate: 90 }] });
    const result = await ParticipantKPIService.getFormationsParticipantKPIs('2026-01-01', '2026-12-31');
    expect(result).toEqual([{ formation: 'Java', presenceRate: 90 }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/formations'), {
      params: { startDate: '2026-01-01', endDate: '2026-12-31' }
    });
  });

  it('gets global participant KPI', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { globalRate: 85 } });
    const result = await ParticipantKPIService.getGlobalParticipantKPI('2026-01-01', '2026-12-31');
    expect(result).toEqual({ globalRate: 85 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/global'), {
      params: { startDate: '2026-01-01', endDate: '2026-12-31' }
    });
  });

  it('throws on error', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('Network error'));
    await expect(ParticipantKPIService.getGlobalParticipantKPI('2026-01-01', '2026-12-31')).rejects.toThrow('Network error');
  });
});





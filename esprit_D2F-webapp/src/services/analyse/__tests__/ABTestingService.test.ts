import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config/env';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    patch: httpMocks.mockPatch,
    delete: httpMocks.mockDelete,
  },
}));

import ABTestingService from '../ABTestingService';

describe('ABTestingService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const base = `${config.ANALYSE_URL}/v1/analytics/ab`;

  it('assigns a teacher to a variant', async () => {
    const res = { teacher_id: 't1', experiment_name: 'exp', variant: 'A' };
    httpMocks.mockPost.mockResolvedValueOnce({ data: res });
    const out = await ABTestingService.assign({ teacher_id: 't1', experiment_name: 'exp' });
    expect(out).toEqual(res);
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${base}/assign`, { teacher_id: 't1', experiment_name: 'exp' });
  });

  it('records an event', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { status: 'ok' } });
    const out = await ABTestingService.recordEvent({ teacher_id: 't1', variant: 'A', event_type: 'shown' });
    expect(out).toEqual({ status: 'ok' });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${base}/event`, { teacher_id: 't1', variant: 'A', event_type: 'shown' });
  });

  it('gets results for an experiment', async () => {
    const res = [{ variant: 'A', sample_size: 10, shown: 10, accepted: 5, completed: 3, acceptance_rate: 0.5, completion_rate: 0.3, avg_score: 8, avg_days_to_enroll: 2 }];
    httpMocks.mockGet.mockResolvedValueOnce({ data: res });
    const out = await ABTestingService.getResults('my exp');
    expect(out).toEqual(res);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${base}/results/${encodeURIComponent('my exp')}`);
  });

  it('gets the winner for an experiment', async () => {
    const res = { variant: 'A', score: 0.9, reason: 'best' };
    httpMocks.mockGet.mockResolvedValueOnce({ data: res });
    const out = await ABTestingService.getWinner('my exp');
    expect(out).toEqual(res);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${base}/winner/${encodeURIComponent('my exp')}`);
  });

  it('rejects when post fails', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('boom'));
    await expect(ABTestingService.assign({ teacher_id: 't1' })).rejects.toThrow('boom');
  });

  it('rejects when get fails', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('boom'));
    await expect(ABTestingService.getResults('e')).rejects.toThrow('boom');
    httpMocks.mockGet.mockRejectedValueOnce(new Error('boom2'));
    await expect(ABTestingService.getWinner('e')).rejects.toThrow('boom2');
  });
});

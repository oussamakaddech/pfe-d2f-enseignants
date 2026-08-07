import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushQuery } from '@/hooks/testUtils';
import { useModelStatus } from '@/hooks/analyse/useModelStatus';
import AnalysePredictiveService from '@/services/analyse/AnalysePredictiveService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/analyse/AnalysePredictiveService', () => ({
  default: { getDrift: vi.fn() },
  __esModule: true,
}));

describe('useModelStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('status loading when no report', async () => {
    (AnalysePredictiveService.getDrift as ReturnType<typeof vi.fn>).mockResolvedValue(
      null as never,
    );
    const { result } = renderHook(() => useModelStatus(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.status).toBe('loading');
  });

  it('status no_model on non-trained message', async () => {
    (AnalysePredictiveService.getDrift as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: 'No model trained yet',
    });
    const { result } = renderHook(() => useModelStatus(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.status).toBe('no_model');
  });

  it('status drift when drift detected', async () => {
    (AnalysePredictiveService.getDrift as ReturnType<typeof vi.fn>).mockResolvedValue({
      drift_detected: true,
      days_since_training: 10,
    });
    const { result } = renderHook(() => useModelStatus(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.status).toBe('drift');
  });

  it('status stale when drift and old', async () => {
    (AnalysePredictiveService.getDrift as ReturnType<typeof vi.fn>).mockResolvedValue({
      drift_detected: true,
      days_since_training: 120,
    });
    const { result } = renderHook(() => useModelStatus(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.status).toBe('stale');
  });

  it('status fresh when no drift', async () => {
    (AnalysePredictiveService.getDrift as ReturnType<typeof vi.fn>).mockResolvedValue({
      drift_detected: false,
    });
    const { result } = renderHook(() => useModelStatus(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.status).toBe('fresh');
  });

  it('status error on failure', async () => {
    (AnalysePredictiveService.getDrift as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('x'),
    );
    const { result } = renderHook(() => useModelStatus(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.status).toBe('error');
  });
});

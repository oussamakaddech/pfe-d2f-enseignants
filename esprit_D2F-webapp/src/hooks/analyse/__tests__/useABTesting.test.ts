import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushQuery } from '@/hooks/testUtils';
import { useABResults, useABWinner, useABAssign, useABEvent } from '@/hooks/analyse/useABTesting';
import ABTestingService from '@/services/analyse/ABTestingService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/analyse/ABTestingService', () => ({
  default: { getResults: vi.fn(), getWinner: vi.fn(), assign: vi.fn(), recordEvent: vi.fn() },
  __esModule: true,
}));

describe('useABTesting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useABResults disabled without experiment', async () => {
    const { result } = renderHook(() => useABResults(undefined), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it('useABResults fetches', async () => {
    (ABTestingService.getResults as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useABResults('exp1'), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(ABTestingService.getResults).toHaveBeenCalledWith('exp1');
  });

  it('useABWinner fetches with retry false', async () => {
    (ABTestingService.getWinner as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useABWinner('exp1'), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(ABTestingService.getWinner).toHaveBeenCalledWith('exp1');
  });

  it('useABAssign calls service', async () => {
    (ABTestingService.assign as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useABAssign(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ experiment_name: 'exp1', enseignant_id: 'e' } as never);
    });
    expect(ABTestingService.assign).toHaveBeenCalled();
  });

  it('useABEvent calls service', async () => {
    (ABTestingService.recordEvent as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useABEvent(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ experiment_name: 'exp1', event: 'shown' } as never);
    });
    expect(ABTestingService.recordEvent).toHaveBeenCalled();
  });
});

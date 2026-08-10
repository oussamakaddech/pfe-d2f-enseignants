import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushQuery } from '@/hooks/testUtils';
import { useRiceEnseignantsLoader } from '@/hooks/analyse/useRiceEnseignantsLoader';
import { useRiceEnseignants } from '@/hooks/analyse/useRiceService';
import RiceService from '@/services/analyse/RiceService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/analyse/RiceService', () => ({
  default: {
    getEnseignants: vi.fn(),
    getSavoirs: vi.fn(),
    getEnseignantAffectations: vi.fn(),
    analyze: vi.fn(),
  },
  __esModule: true,
}));

const msgApi = { warning: vi.fn(), success: vi.fn() } as any;

describe('useRiceEnseignantsLoader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads enseignants into state', async () => {
    (RiceService.getEnseignants as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, nom: 'A' },
    ]);
    const { result } = renderHook(() => useRiceEnseignantsLoader('INFO', msgApi), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(result.current.allEnseignants).toHaveLength(1);
    expect(result.current.enseignantsLoading).toBe(false);
  });

  it('sets error on failure with warning', async () => {
    (RiceService.getEnseignants as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 403 },
    });
    const { result } = renderHook(() => useRiceEnseignantsLoader('INFO', msgApi), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(result.current.enseignantsError).toBeTruthy();
    expect(msgApi.warning).toHaveBeenCalled();
  });

  it('continueWithoutEnseignants clears state', async () => {
    (RiceService.getEnseignants as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useRiceEnseignantsLoader('INFO', msgApi), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    act(() => {
      result.current.continueWithoutEnseignants();
    });
    expect(result.current.allEnseignants).toEqual([]);
    expect(result.current.ignoreEnseignants).toBe(true);
  });
});

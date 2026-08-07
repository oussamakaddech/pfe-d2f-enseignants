import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushQuery } from '@/hooks/testUtils';
import {
  useFormationCompetencesByFormation,
  useAddFormationCompetence,
  useUpdateFormationCompetence,
  useDeleteFormationCompetence,
  useReplaceAllFormationCompetences,
  useFormationCompetencesByCompetence,
} from '@/hooks/competence/useFormationCompetence';
import FormationCompetenceService from '@/services/competence/FormationCompetenceService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/competence/FormationCompetenceService', () => ({
  default: {
    getByFormation: vi.fn(),
    addFormationCompetence: vi.fn(),
    updateFormationCompetence: vi.fn(),
    deleteFormationCompetence: vi.fn(),
    replaceAllForFormation: vi.fn(),
    getByCompetence: vi.fn(),
  },
  __esModule: true,
}));

describe('useFormationCompetence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useFormationCompetencesByFormation disabled without id', async () => {
    const { result } = renderHook(() => useFormationCompetencesByFormation(undefined), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it('useFormationCompetencesByFormation fetches', async () => {
    (FormationCompetenceService.getByFormation as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1 },
    ]);
    const { result } = renderHook(() => useFormationCompetencesByFormation(3), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it('useAddFormationCompetence calls service', async () => {
    (
      FormationCompetenceService.addFormationCompetence as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    const { result } = renderHook(() => useAddFormationCompetence(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ formationId: 1, fc: {} } as never);
    });
    expect(FormationCompetenceService.addFormationCompetence).toHaveBeenCalled();
  });

  it('useUpdateFormationCompetence calls service', async () => {
    (
      FormationCompetenceService.updateFormationCompetence as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateFormationCompetence(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, fc: {} } as never);
    });
    expect(FormationCompetenceService.updateFormationCompetence).toHaveBeenCalledWith(1, {});
  });

  it('useDeleteFormationCompetence calls service', async () => {
    (
      FormationCompetenceService.deleteFormationCompetence as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteFormationCompetence(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(FormationCompetenceService.deleteFormationCompetence).toHaveBeenCalledWith(1);
  });

  it('useReplaceAllFormationCompetences calls service', async () => {
    (
      FormationCompetenceService.replaceAllForFormation as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    const { result } = renderHook(() => useReplaceAllFormationCompetences(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({ formationId: 1, newLinks: [] } as never);
    });
    expect(FormationCompetenceService.replaceAllForFormation).toHaveBeenCalled();
  });

  it('useFormationCompetencesByCompetence fetches', async () => {
    (FormationCompetenceService.getByCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationCompetencesByCompetence(2), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });
});

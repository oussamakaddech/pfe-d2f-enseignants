import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRiceReport } from '@/hooks/analyse/useRiceReport';
import RiceService from '@/services/analyse/RiceService';

vi.mock('@/services/analyse/RiceService', () => ({
  default: { importToDb: vi.fn(), getImportHistory: vi.fn() },
  __esModule: true,
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: qc }, children);

const msgApi = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } as any;

const tree = [
  {
    code: 'D1',
    nom: 'Domaine1',
    description: '',
    competences: [
      {
        code: 'C1',
        nom: 'Comp1',
        description: '',
        ordre: 1,
        savoirs: [
          { code: 'S1', nom: 'Sav1', type: 'THEORIQUE', niveau: null, enseignantsSuggeres: ['1'] },
        ],
        sousCompetences: [],
      },
    ],
  },
] as any;

describe('useRiceReport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('computeClientCoverage computes per-domain coverage', () => {
    const { result } = renderHook(() => useRiceReport({ tree, departement: 'INFO', msgApi }), {
      wrapper,
    });
    const cov = result.current.computeClientCoverage();
    expect(cov['Domaine1']).toBe(100);
  });

  it('handleImport imports and sets report', async () => {
    (RiceService.importToDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      affectationsCreated: 2,
      domainesCreated: 1,
    });
    const { result } = renderHook(() => useRiceReport({ tree, departement: 'INFO', msgApi }), {
      wrapper,
    });
    await act(async () => {
      await result.current.handleImport();
    });
    expect(RiceService.importToDb).toHaveBeenCalled();
    expect(result.current.report?.affectationsCreated).toBe(2);
    expect(msgApi.success).toHaveBeenCalled();
  });

  it('handleImport shows error on failure', async () => {
    (RiceService.importToDb as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: 'bad' } },
    });
    const { result } = renderHook(() => useRiceReport({ tree, departement: 'INFO', msgApi }), {
      wrapper,
    });
    await act(async () => {
      await result.current.handleImport();
    });
    expect(msgApi.error).toHaveBeenCalled();
  });

  it("handleImport envoie le departement COURANT apres un changement de selection", async () => {
    // Contrat : la charge utile porte le departement COURANT, pas celui d'un
    // rendu precedent. `departement` etait lu sans figurer dans les
    // dependances du useCallback ; la justesse ne tenait qu'a l'identite
    // instable de `importMutation`, qui forcait la recreation du callback.
    (RiceService.importToDb as ReturnType<typeof vi.fn>).mockResolvedValue({ domainesCreated: 1 });
    const { result, rerender } = renderHook(
      ({ departement }: { departement: string }) =>
        useRiceReport({ tree, departement, msgApi }),
      { wrapper, initialProps: { departement: 'INFO' } },
    );

    rerender({ departement: 'GENIE_CIVIL' });
    await act(async () => {
      await result.current.handleImport();
    });

    const payload = (RiceService.importToDb as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.departement).toBe('GENIE_CIVIL');
  });

  it("handleImport omet le departement en mode auto", async () => {
    (RiceService.importToDb as ReturnType<typeof vi.fn>).mockResolvedValue({ domainesCreated: 1 });
    const { result } = renderHook(() => useRiceReport({ tree, departement: 'auto', msgApi }), {
      wrapper,
    });
    await act(async () => {
      await result.current.handleImport();
    });
    const payload = (RiceService.importToDb as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.departement).toBeUndefined();
  });

  it('loadImportHistory refetches history', async () => {
    (RiceService.getImportHistory as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useRiceReport({ tree, departement: 'INFO', msgApi }), {
      wrapper,
    });
    await act(async () => {
      await result.current.loadImportHistory();
    });
    expect(RiceService.getImportHistory).toHaveBeenCalled();
  });
});

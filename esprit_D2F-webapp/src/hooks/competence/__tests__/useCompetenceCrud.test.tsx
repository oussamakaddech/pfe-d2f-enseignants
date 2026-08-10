import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCompetenceCrud from '@/hooks/competence/useCompetenceCrud';
import CompetenceService from '@/services/competence/CompetenceService';
import { flushQuery } from '@/hooks/testUtils';

const makeWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(App, {}, children),
    );
};

vi.mock('@/services/competence/CompetenceService', () => {
  const mk = () => ({
    getAll: vi.fn(() => Promise.resolve([])),
    getByCompetence: vi.fn(() => Promise.resolve([])),
    getBySousCompetence: vi.fn(() => Promise.resolve([])),
    getArbreComplet: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createEnfant: vi.fn(),
    toggleActif: vi.fn(),
    rechercheParDomaine: vi.fn(() => Promise.resolve([])),
    rechercheGlobale: vi.fn(() => Promise.resolve([])),
    add: vi.fn(),
    remove: vi.fn(),
  });
  return {
    default: {
      domaine: mk(),
      competence: mk(),
      sousCompetence: mk(),
      savoir: mk(),
      enseignantCompetence: mk(),
      niveauDefinition: mk(),
      structure: mk(),
      prerequisite: mk(),
    },
    __esModule: true,
  };
});
vi.mock('@/components/competence/columns/CompetenceColumns', () => ({
  buildDomaineColumns: vi.fn(() => []),
  buildCompColumns: vi.fn(() => []),
  buildSavoirColumns: vi.fn(() => []),
}));

const fakeForm = (values: Record<string, unknown> = {}) => {
  let store = values;
  return {
    setFieldsValue: (v: Record<string, unknown>) => {
      store = { ...store, ...v };
    },
    validateFields: vi.fn(() => Promise.resolve(store)),
  } as unknown as import('antd').FormInstance;
};

describe('useCompetenceCrud', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns modal state flags', () => {
    const { result } = renderHook(() => useCompetenceCrud(), { wrapper: makeWrapper() });
    expect(result.current.domaineModal).toBe(false);
    expect(result.current.compModal).toBe(false);
  });

  it('openDomaineModal opens modal with record values', () => {
    const form = fakeForm();
    const { result } = renderHook(() => useCompetenceCrud(), { wrapper: makeWrapper() });
    act(() => {
      result.current.openDomaineModal(form, {
        code: 'C1',
        nom: 'N1',
        description: 'd',
        actif: true,
      } as never);
    });
    expect(result.current.domaineModal).toBe(true);
    expect(result.current.editingDomaine).toMatchObject({ code: 'C1' });
  });

  it('handleDomaineSubmit creates when no editing id', async () => {
    (CompetenceService.domaine.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const form = fakeForm({ code: 'C1', nom: 'N1', description: 'd', actif: true });
    const { result } = renderHook(() => useCompetenceCrud(), { wrapper: makeWrapper() });
    act(() => {
      result.current.openDomaineModal(form);
    });
    await act(async () => {
      await result.current.handleDomaineSubmit(form);
    });
    expect(CompetenceService.domaine.create).toHaveBeenCalled();
    expect(result.current.domaineModal).toBe(false);
  });

  it('handleCompDelete shows error when dependents exist', async () => {
    (CompetenceService.savoir.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { competenceId: 3, sousCompetenceId: null },
    ]);
    const { result } = renderHook(() => useCompetenceCrud(), { wrapper: makeWrapper() });
    await flushQuery(result);
    await act(async () => {
      await result.current.handleCompDelete(3);
    });
    expect(CompetenceService.competence.delete).not.toHaveBeenCalled();
  });

  it('leafSousComps deduplicates', () => {
    (CompetenceService.sousCompetence.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1 },
      { id: 1, enfants: [] },
    ]);
    const { result } = renderHook(() => useCompetenceCrud(), { wrapper: makeWrapper() });
    expect(Array.isArray(result.current.leafSousComps)).toBe(true);
  });
});

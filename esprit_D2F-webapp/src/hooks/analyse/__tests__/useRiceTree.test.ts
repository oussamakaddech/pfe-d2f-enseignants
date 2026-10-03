import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRiceTree } from '@/hooks/analyse/useRiceTree';
import { secureRandomId } from '@/utils/secureRandom';

vi.mock('@/utils/secureRandom', () => ({ secureRandomId: () => 'id', __esModule: true }));
// Même implémentation que le vrai module (structuredClone) : une copie JSON
// masquait qu'un brouillon immer (Proxy) ne peut pas être cloné.
vi.mock('@/pages/competence/rice/constants', () => ({
  cloneDeep: <T>(x: T): T => structuredClone(x),
  __esModule: true,
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: qc }, children);

const msgApi = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } as any;

const seedTree = () =>
  [
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
            { code: 'S1', nom: 'Sav1', type: 'THEORIQUE', niveau: null, enseignantsSuggeres: [] },
          ],
          sousCompetences: [
            {
              code: 'SC1',
              nom: 'Sc1',
              description: '',
              savoirs: [
                {
                  code: 'S2',
                  nom: 'Sav2',
                  type: 'PRATIQUE',
                  niveau: null,
                  enseignantsSuggeres: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ] as any;

describe('useRiceTree', () => {
  it('addDomaine adds a domaine and starts rename', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.addDomaine();
    });
    expect(result.current.tree).toHaveLength(1);
    expect(result.current.editingNom).not.toBeNull();
  });

  it('addCompetence adds competence', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.addDomaine();
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addCompetence(0);
    });
    expect((result.current.tree[0] as { competences: unknown[] }).competences).toHaveLength(1);
  });

  it('addSavoir adds savoir under competence', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.addDomaine();
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addCompetence(0);
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addSavoir(0, 0);
    });
    const comp = (result.current.tree[0] as { competences: { savoirs: unknown[] }[] })
      .competences[0];
    expect(comp.savoirs).toHaveLength(1);
  });

  it('toggleType flips THEORIQUE to PRATIQUE', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.addDomaine();
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addCompetence(0);
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addSavoir(0, 0);
    });
    act(() => {
      result.current.toggleType(0, 0, -1, 0);
    });
    const savoir = (result.current.tree[0] as { competences: { savoirs: { type: string }[] }[] })
      .competences[0].savoirs[0];
    expect(savoir.type).toBe('PRATIQUE');
  });

  it('toggleEnsAssign assigns and unassigns', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.addDomaine();
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addCompetence(0);
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addSavoir(0, 0);
    });
    act(() => {
      result.current.toggleEnsAssign(0, 0, -1, 0, 'e1');
    });
    let savoir = (
      result.current.tree[0] as { competences: { savoirs: { enseignantsSuggeres: string[] }[] }[] }
    ).competences[0].savoirs[0];
    expect(savoir.enseignantsSuggeres).toContain('e1');
    act(() => {
      result.current.toggleEnsAssign(0, 0, -1, 0, 'e1');
    });
    savoir = (
      result.current.tree[0] as { competences: { savoirs: { enseignantsSuggeres: string[] }[] }[] }
    ).competences[0].savoirs[0];
    expect(savoir.enseignantsSuggeres).not.toContain('e1');
  });

  it('deleteSavoir removes a savoir', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.addDomaine();
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addCompetence(0);
    });
    act(() => {
      result.current.commitRename();
    });
    act(() => {
      result.current.addSavoir(0, 0);
    });
    act(() => {
      result.current.deleteSavoir(0, 0, -1, 0);
    });
    const comp = (result.current.tree[0] as { competences: { savoirs: unknown[] }[] })
      .competences[0];
    expect(comp.savoirs).toHaveLength(0);
  });

  it('liveStats computes counts', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.setTree(seedTree());
    });
    expect(result.current.liveStats).toMatchObject({ totalDomaines: 1, totalComp: 1 });
    expect(result.current.liveStats.totalSavoirs).toBe(2);
  });

  it('clearAllAssignments clears assignments', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    const tree = seedTree();
    (
      tree[0] as { competences: { savoirs: { enseignantsSuggeres: string[] }[] }[] }
    ).competences[0].savoirs[0].enseignantsSuggeres = ['e1'];
    act(() => {
      result.current.setTree(tree);
    });
    act(() => {
      result.current.clearAllAssignments();
    });
    const savoir = (
      result.current.tree[0] as { competences: { savoirs: { enseignantsSuggeres: string[] }[] }[] }
    ).competences[0].savoirs[0];
    expect(savoir.enseignantsSuggeres).toHaveLength(0);
    expect(msgApi.success).toHaveBeenCalled();
  });

  it('confirmMerge merges two savoirs', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.setTree(seedTree());
    });
    act(() => {
      result.current.toggleEnsAssign(0, 0, -1, 0, 'e1');
    });
    act(() => {
      result.current.openMerge(0, 0, -1, 0);
    });
    act(() => {
      result.current.setMergeDst({ di: 0, ci: 0, sci: 0, si: 0 });
    });
    act(() => {
      result.current.confirmMerge();
    });
    expect(msgApi.success).toHaveBeenCalled();
  });

  it('remapInTree replaces ids', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    const tree = seedTree();
    (
      tree[0] as { competences: { savoirs: { enseignantsSuggeres: string[] }[] }[] }
    ).competences[0].savoirs[0].enseignantsSuggeres = ['ext_1'];
    act(() => {
      result.current.setTree(tree);
    });
    act(() => {
      result.current.remapInTree('ext_1', 'real_1');
    });
    const savoir = (
      result.current.tree[0] as { competences: { savoirs: { enseignantsSuggeres: string[] }[] }[] }
    ).competences[0].savoirs[0];
    expect(savoir.enseignantsSuggeres).toContain('real_1');
  });

  it('treeFilteredIndices filters by search', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.setTree(seedTree());
    });
    act(() => {
      result.current.setTreeSearch('Sav1');
    });
    expect(result.current.treeFilteredIndices).not.toBeNull();
  });

  // Panneau de propriétés de l'étape Revue : ces deux actions étaient branchées
  // sur des fonctions vides, toute modification y était perdue.
  it('updateNodeField modifie le nœud désigné par son chemin, à chaque niveau', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.setTree(seedTree());
    });
    act(() => {
      result.current.updateNodeField([0], 'nom', 'Domaine renommé');
      result.current.updateNodeField([0, 0], 'description', 'desc comp');
      result.current.updateNodeField([0, 0, 0], 'nom', 'Sc renommée');
      result.current.updateNodeField([0, 0, -1, 0], 'niveau', 'N3_INTERMEDIAIRE');
      result.current.updateNodeField([0, 0, 0, 0], 'enseignantsSuggeres', ['E1']);
    });
    const d = result.current.tree[0] as any;
    expect(d.nom).toBe('Domaine renommé');
    expect(d.competences[0].description).toBe('desc comp');
    expect(d.competences[0].sousCompetences[0].nom).toBe('Sc renommée');
    expect(d.competences[0].savoirs[0].niveau).toBe('N3_INTERMEDIAIRE');
    expect(d.competences[0].sousCompetences[0].savoirs[0].enseignantsSuggeres).toEqual(['E1']);
  });

  it('moveSavoirToSC déplace un savoir vers une sous-compétence et inversement', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.setTree(seedTree());
    });
    act(() => {
      result.current.moveSavoirToSC([0, 0, -1, 0], [0, 0, 0]);
    });
    let c = (result.current.tree[0] as any).competences[0];
    expect(c.savoirs).toHaveLength(0);
    expect(c.sousCompetences[0].savoirs.map((s: { code: string }) => s.code)).toEqual(['S2', 'S1']);

    act(() => {
      result.current.moveSavoirToSC([0, 0, 0, 0], [0, 0, -1]);
    });
    c = (result.current.tree[0] as any).competences[0];
    expect(c.savoirs.map((s: { code: string }) => s.code)).toEqual(['S2']);
    expect(c.sousCompetences[0].savoirs.map((s: { code: string }) => s.code)).toEqual(['S1']);
  });

  it('moveSavoirToSC ne fait rien si la cible est le conteneur actuel', () => {
    const { result } = renderHook(() => useRiceTree(msgApi), { wrapper });
    act(() => {
      result.current.setTree(seedTree());
    });
    const before = JSON.stringify(result.current.tree);
    act(() => {
      result.current.moveSavoirToSC([0, 0, 0, 0], [0, 0, 0]);
    });
    expect(JSON.stringify(result.current.tree)).toBe(before);
  });
});

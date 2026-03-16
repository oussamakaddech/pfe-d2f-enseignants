import { describe, expect, it } from 'vitest';
import {
  buildD3TreeData,
  buildExportFileName,
  buildMatrixRows,
} from '../consultationUtils';

describe('consultationUtils', () => {
  it('builds recursive D3 tree and attaches savoirs only on leaf sous-competences', () => {
    const domaines = [{ id: 1, nom: 'Informatique', code: 'INF' }];
    const competences = [{ id: 10, domaineId: 1, nom: 'Web', code: 'WEB' }];
    const sousComps = [
      { id: 100, competenceId: 10, parentId: null, nom: 'Frontend', code: 'WEB-FE' },
      { id: 101, competenceId: 10, parentId: 100, nom: 'React', code: 'WEB-REACT' },
    ];
    const savoirs = [
      { id: 200, sousCompetenceId: 100, nom: 'Should be ignored', code: 'IGN', type: 'THEORIQUE' },
      { id: 201, sousCompetenceId: 101, nom: 'Hooks', code: 'HK', type: 'PRATIQUE' },
    ];

    const tree = buildD3TreeData(domaines, competences, sousComps, savoirs);

    expect(tree.name).toBe('Referentiel');
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].children).toHaveLength(1);

    const rootSc = tree.children[0].children[0].children[0];
    expect(rootSc.name).toBe('Frontend');
    expect(rootSc.children).toHaveLength(1);

    const leafSc = rootSc.children[0];
    expect(leafSc.name).toBe('React');
    expect(leafSc.children).toEqual([
      {
        name: 'Hooks',
        attributes: { code: 'HK', type: 'PRATIQUE' },
      },
    ]);
  });

  it('builds matrix rows by aligning savoir codes per level', () => {
    const rows = buildMatrixRows({
      N1_DEBUTANT: [{ savoirCode: 'A1' }, { savoirCode: 'A2' }],
      N3_INTERMEDIAIRE: [{ savoirCode: 'C1' }],
      N5_EXPERT: [{ savoirCode: 'E1' }, { savoirCode: 'E2' }],
    });

    expect(rows).toEqual([
      {
        'N 1': 'A1',
        'N 2': '',
        'N 3': 'C1',
        'N 4': '',
        'N 5': 'E1',
      },
      {
        'N 1': 'A2',
        'N 2': '',
        'N 3': '',
        'N 4': '',
        'N 5': 'E2',
      },
    ]);
  });

  it('returns one empty matrix row when matrix data is missing', () => {
    const rows = buildMatrixRows(undefined);

    expect(rows).toEqual([
      {
        'N 1': '',
        'N 2': '',
        'N 3': '',
        'N 4': '',
        'N 5': '',
      },
    ]);
  });

  it('builds export filename with sanitized code and ISO date', () => {
    const filename = buildExportFileName(
      'COMP/with spaces+specials-and-very-very-very-long-code-1234567890',
      new Date('2026-01-15T09:20:00.000Z'),
    );

    expect(filename).toBe(
      'affectation_niveaux_COMP_with_spaces_specials-and-very-very-_2026-01-15.xlsx',
    );
  });
});

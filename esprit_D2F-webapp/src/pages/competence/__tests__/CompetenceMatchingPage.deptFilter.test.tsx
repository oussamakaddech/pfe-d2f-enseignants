import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CompetenceMatchingPage from '../CompetenceMatchingPage';

// Formes réelles : savoirs rattachés à une compétence, domaines portant
// `departementId`, enseignants de l'annuaire portant `deptId`.
const SAVOIRS = [
  { id: 1, code: 'S.WEB', nom: 'Savoir Web', competenceId: 10 },
  { id: 2, code: 'S.GC', nom: 'Savoir GC', competenceId: 20 },
];
const ENSEIGNANTS = [
  { id: 'e1', prenom: 'Meriem', nom: 'Ali', deptId: 'DEPT_WEB', deptLibelle: 'Développement Web' },
  { id: 'e2', prenom: 'Sihem', nom: 'Mroueh', deptId: 'DEPT_GC', deptLibelle: 'Génie Civil' },
];
const REFERENTIEL = {
  domaines: [
    { id: 1, nom: 'Domaine Web', departementId: 'DEPT_WEB' },
    { id: 2, nom: 'Domaine GC', departementId: 'DEPT_GC' },
  ],
  competences: [
    { id: 10, nom: 'Comp Web', domaineId: 1 },
    { id: 20, nom: 'Comp GC', domaineId: 2 },
  ],
  sousCompetences: [],
};

vi.mock('@/hooks/analyse/useRiceService', () => ({
  useRiceSavoirs: vi.fn(() => ({ data: SAVOIRS, refetch: vi.fn() })),
  useRiceEnseignants: vi.fn(() => ({ data: ENSEIGNANTS, refetch: vi.fn() })),
  useRiceSaveAssignments: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceCreateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceUpdateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceDeactivateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/formation/useFormations', () => ({
  useDepartements: vi.fn(() => ({
    data: [
      { id: 'DEPT_WEB', libelle: 'Développement Web' },
      { id: 'DEPT_GC', libelle: 'Génie Civil' },
    ],
  })),
}));

vi.mock('../hooks/useMatchingReferential', () => ({
  useMatchingReferential: vi.fn(() => REFERENTIEL),
}));

describe('CompetenceMatchingPage — filtre département', () => {
  it('ne garde que les savoirs et enseignants du département choisi', async () => {
    render(
      <BrowserRouter>
        <CompetenceMatchingPage />
      </BrowserRouter>,
    );
    expect(await screen.findByText('Savoir Web')).toBeInTheDocument();
    expect(screen.getByText('Savoir GC')).toBeInTheDocument();
    expect(screen.getByText(/Sihem/)).toBeInTheDocument();

    // Le filtre propose les vrais départements (il n'avait que « Tous »).
    const deptSelect = screen.getByText('Tous les départements').closest('.ant-select')!;
    fireEvent.mouseDown(deptSelect.querySelector('.ant-select-selector')!);
    const dropdown = await waitFor(() => {
      const el = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    fireEvent.click(within(dropdown).getByText('Développement Web'));

    await waitFor(() => expect(screen.queryByText('Savoir GC')).toBeNull());
    expect(screen.getByText('Savoir Web')).toBeInTheDocument();
    expect(screen.queryByText(/Sihem/)).toBeNull();
    expect(screen.getByText(/Meriem/)).toBeInTheDocument();
  }, 20000);
});

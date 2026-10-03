import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CompetenceMatchingPage from '../CompetenceMatchingPage';

// Données STABLES (miroir react-query : même référence entre renders).
const STABLE_SAVOIRS = [{ id: 1, code: 'S1', nom: 'Savoir 1' }];
// Forme réelle de l'annuaire (service formation) : deptId/deptLibelle, pas `departement`.
const STABLE_ENSEIGNANTS = [
  { id: 'e1', prenom: 'Meriem', nom: 'Ali', deptId: 'DEPT_WEB', deptLibelle: 'Développement Web' },
];

vi.mock('@/hooks/analyse/useRiceService', () => ({
  useRiceSavoirs: vi.fn(() => ({ data: STABLE_SAVOIRS, refetch: vi.fn() })),
  useRiceEnseignants: vi.fn(() => ({ data: STABLE_ENSEIGNANTS, refetch: vi.fn() })),
  useRiceSaveAssignments: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceCreateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceUpdateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceDeactivateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

// Liste des départements (modale d'édition) : pas de QueryClient dans ces tests.
vi.mock('@/hooks/formation/useFormations', () => ({
  useDepartements: vi.fn(() => ({ data: [{ id: 'DEPT_WEB', libelle: 'Développement Web' }] })),
}));

vi.mock('../hooks/useMatchingReferential', () => ({
  useMatchingReferential: vi.fn(() => ({ domaines: [], competences: [], sousCompetences: [] })),
}));

describe('CompetenceMatchingPage (non-régression boucle #185)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rend la page sans boucle de re-rendus infinie', async () => {
    render(
      <BrowserRouter>
        <CompetenceMatchingPage />
      </BrowserRouter>,
    );
    expect(await screen.findByText('Matchmaking & Affectations')).toBeInTheDocument();
    expect(await screen.findByText('Savoir 1')).toBeInTheDocument();
  }, 15000);

  it("affiche le département de l'enseignant lu dans deptLibelle", async () => {
    render(
      <BrowserRouter>
        <CompetenceMatchingPage />
      </BrowserRouter>,
    );
    expect(await screen.findByText('Développement Web')).toBeInTheDocument();
    expect(screen.queryByText(/Département N\/A|Département non renseigné/)).toBeNull();
  }, 15000);
});

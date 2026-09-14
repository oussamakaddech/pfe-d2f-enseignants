import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CompetenceMatchingPage from '../CompetenceMatchingPage';

// Données STABLES (miroir react-query : même référence entre renders).
const STABLE_SAVOIRS = [{ id: 1, code: 'S1', nom: 'Savoir 1' }];
const STABLE_ENSEIGNANTS = [{ id: 'e1', prenom: 'Ali', nom: 'Ben' }];

vi.mock('@/hooks/analyse/useRiceService', () => ({
  useRiceSavoirs: vi.fn(() => ({ data: STABLE_SAVOIRS, refetch: vi.fn() })),
  useRiceEnseignants: vi.fn(() => ({ data: STABLE_ENSEIGNANTS, refetch: vi.fn() })),
  useRiceSaveAssignments: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceCreateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceUpdateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceDeactivateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
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
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CompetenceMatchingPage from '../CompetenceMatchingPage';

// PIRE CAS : nouvelles identités à chaque appel (refetch/normalisation
// instable côté prod). Sans garde idempotente, boucle infinie (#185).
vi.mock('@/hooks/analyse/useRiceService', () => ({
  useRiceSavoirs: vi.fn(() => ({
    data: [{ id: 1, code: 'S1', nom: 'Savoir 1' }],
    refetch: vi.fn(),
  })),
  useRiceEnseignants: vi.fn(() => ({
    data: [{ id: 'e1', prenom: 'Ali', nom: 'Ben' }],
    refetch: vi.fn(),
  })),
  useRiceSaveAssignments: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceCreateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceUpdateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceDeactivateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('../hooks/useMatchingReferential', () => ({
  useMatchingReferential: vi.fn(() => ({
    domaines: [{ id: 'd1', nom: 'D1' }],
    competences: [],
    sousCompetences: [],
  })),
}));

describe('CompetenceMatchingPage (stress données instables)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne boucle pas quand les identités changent à chaque render', async () => {
    render(
      <BrowserRouter>
        <CompetenceMatchingPage />
      </BrowserRouter>,
    );
    expect(await screen.findByText('Matchmaking & Affectations')).toBeInTheDocument();
  }, 10000);
});

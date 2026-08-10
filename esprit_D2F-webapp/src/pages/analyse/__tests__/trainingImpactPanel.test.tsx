import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  useTrainingImpact: vi.fn(),
  useTrainingImpactFormations: vi.fn(),
}));

vi.mock('@/hooks/analytics/useAnalyticsQueries', () => ({
  useTrainingImpact: mocks.useTrainingImpact,
  useTrainingImpactFormations: mocks.useTrainingImpactFormations,
}));

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainingImpactPanel from '@/components/analytics/TrainingImpactPanel';

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('TrainingImpactPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche un spinner pendant le chargement', () => {
    mocks.useTrainingImpact.mockReturnValue({ isLoading: true, data: undefined });
    mocks.useTrainingImpactFormations.mockReturnValue({ isLoading: true, data: undefined });
    const { container } = render(<TrainingImpactPanel />, { wrapper: createWrapper() });
    expect(container.querySelector('.ant-spin')).toBeTruthy();
  });

  it('affiche un message vide sans données', () => {
    mocks.useTrainingImpact.mockReturnValue({ isLoading: false, data: undefined });
    mocks.useTrainingImpactFormations.mockReturnValue({ isLoading: false, data: undefined });
    render(<TrainingImpactPanel />, { wrapper: createWrapper() });
    expect(screen.getByText(/Aucune donnée d'impact disponible/i)).toBeInTheDocument();
  });

  it("affiche les statistiques d'impact", () => {
    mocks.useTrainingImpact.mockReturnValue({
      isLoading: false,
      data: {
        nb_enseignants_suivis: 25,
        nb_formations_suivies: 15,
        gain_niveau_moyen: 0.85,
        reduction_risque_moyenne: 0.3,
        nb_risque_reduit: 10,
        nb_risque_augmente: 2,
      },
    });
    mocks.useTrainingImpactFormations.mockReturnValue({
      isLoading: false,
      data: { formations: [] },
    });
    render(<TrainingImpactPanel />, { wrapper: createWrapper() });
    expect(screen.getByText(/Enseignants suivis/i)).toBeInTheDocument();
  });
});

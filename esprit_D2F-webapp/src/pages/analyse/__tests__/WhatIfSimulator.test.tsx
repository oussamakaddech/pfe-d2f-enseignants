import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WhatIfSimulator from '../WhatIfSimulator';

vi.mock('@/hooks/analyse/useAnalysePredictive', () => ({
  useSimulateWhatIf: vi.fn(() => ({
    mutate: vi.fn(),
    data: undefined,
    isPending: false,
    isError: false,
  })),
}));

describe('WhatIfSimulator', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders builder fields and placeholder', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <WhatIfSimulator
          teachers={[{ teacher_id: 'E1', teacher_name: 'Alice', departement: 'GC' }]}
          competences={[{ competence_id: 1, competence_nom: 'Java' }]}
          defaultTeacherId="E1"
        />
      </QueryClientProvider>
    );
    expect(screen.getByText('Enseignant')).toBeInTheDocument();
    expect(screen.getByText('Horizon de projection')).toBeInTheDocument();
    expect(screen.getByText("Simuler l'impact")).toBeInTheDocument();
    expect(screen.getByText('Construisez un plan puis lancez la simulation')).toBeInTheDocument();
  });
});

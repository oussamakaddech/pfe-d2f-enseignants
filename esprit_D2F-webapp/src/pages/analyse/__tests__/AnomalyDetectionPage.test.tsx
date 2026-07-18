import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnomalyDetectionPage from '../AnomalyDetectionPage';

vi.mock('@/hooks/analyse/useNewFeatures', () => ({
  useDetectAnomalies: vi.fn(() => ({ mutate: vi.fn(), data: undefined, isPending: false, isError: false })),
  useDetectAnomaliesDepartment: vi.fn(() => ({ mutate: vi.fn(), data: undefined, isPending: false, isError: false })),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'ADMIN', id: 5 } })),
}));

describe('AnomalyDetectionPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders sections and detect button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AnomalyDetectionPage />
      </QueryClientProvider>
    );
    expect(screen.getByText("Détection d'anomalies")).toBeInTheDocument();
    expect(screen.getByText("Analyse d'un enseignant")).toBeInTheDocument();
    expect(screen.getByText('Lancez la détection')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PeerBenchmarkPage from '../PeerBenchmarkPage';

vi.mock('@/hooks/analyse/useNewFeatures', () => ({
  useBenchmark: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'ADMIN', id: 5 } })),
}));

describe('PeerBenchmarkPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders section header', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PeerBenchmarkPage />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Benchmark vs pairs')).toBeInTheDocument();
    expect(screen.getByText("Restreindre à l'UP")).toBeInTheDocument();
  });
});

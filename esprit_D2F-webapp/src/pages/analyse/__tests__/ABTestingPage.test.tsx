import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ABTestingPage from '../ABTestingPage';

vi.mock('@/hooks/analyse/useABTesting', () => ({
  useABResults: vi.fn(() => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() })),
  useABWinner: vi.fn(() => ({ data: undefined, isLoading: false })),
  useABAssign: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useABEvent: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

describe('ABTestingPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders title, stats and empty results', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ABTestingPage />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Tests A\/B/)).toBeInTheDocument();
    expect(screen.getByText('Total echantillon')).toBeInTheDocument();
    expect(screen.getByText('Aucune donnee pour cette experience')).toBeInTheDocument();
  });
});

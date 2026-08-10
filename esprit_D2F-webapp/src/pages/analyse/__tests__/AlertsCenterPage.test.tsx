import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AlertsCenterPage from '../AlertsCenterPage';

vi.mock('@/hooks/analyse/useAnalysePredictive', () => ({
  useAlertsSummary: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useBulkUpdateAlerts: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/components/charts/PriorityAlertsPanel', () => ({
  default: () => <div>panel</div>,
}));

describe('AlertsCenterPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders header', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AlertsCenterPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Centre d'alertes")).toBeInTheDocument();
    expect(screen.getByText('Rafraîchir')).toBeInTheDocument();
  });
});

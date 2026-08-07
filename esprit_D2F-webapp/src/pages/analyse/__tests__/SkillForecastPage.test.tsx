import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SkillForecastPage from '../SkillForecastPage';

vi.mock('@/hooks/analyse/useNewFeatures', () => ({
  useForecast: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'ADMIN', id: 5 } })),
}));

describe('SkillForecastPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders section header and empty state', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SkillForecastPage />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Prévision des niveaux de compétence')).toBeInTheDocument();
    expect(screen.getByText('Sélectionnez un enseignant')).toBeInTheDocument();
  });
});

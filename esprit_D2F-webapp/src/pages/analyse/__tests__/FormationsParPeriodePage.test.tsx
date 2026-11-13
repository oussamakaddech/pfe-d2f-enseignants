import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FormationsParPeriodePage from '../FormationsParPeriodePage';

vi.mock('@/hooks/analyse/useReporting', () => ({
  useFormationsParPeriode: vi.fn(() => ({
    data: { totalFormations: 12, moyenneParPeriode: 3, tendance: 'HAUSSE', periodes: [] },
    isLoading: false,
  })),
  useAnalyticsExport: vi.fn(() => ({
    exporting: false,
    exportPdf: vi.fn(() => Promise.resolve()),
  })),
}));

const authMock = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { role: authMock.role } }),
}));

describe('FormationsParPeriodePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    authMock.role = 'ADMIN';
  });

  const exportButton = () => screen.getByRole('button', { name: /Export PDF/ });

  it('renders title and stats', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FormationsParPeriodePage />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Formations par période')).toBeInTheDocument();
    expect(screen.getByText('Total formations')).toBeInTheDocument();
    expect(screen.getByText('Aucune formation sur la période')).toBeInTheDocument();
  });

  it("active l'export PDF pour l'administrateur", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FormationsParPeriodePage />
      </QueryClientProvider>,
    );
    expect(exportButton()).toBeEnabled();
  });

  it("désactive l'export PDF institutionnel pour un CUP (réservé à l'ADMIN côté service)", () => {
    authMock.role = 'CUP';
    render(
      <QueryClientProvider client={queryClient}>
        <FormationsParPeriodePage />
      </QueryClientProvider>,
    );
    expect(exportButton()).toBeDisabled();
  });
});

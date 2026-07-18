import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedAdministrationPage from '../UnifiedAdministrationPage';

const EMPTY_ACCOUNTS: unknown[] = [];

vi.mock('@/hooks/formation/useFormations', () => ({
  useAllAccounts: vi.fn(() => ({ data: EMPTY_ACCOUNTS, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('@/pages/admin/gererComptes/CreateAccountDrawer', () => ({
  default: () => null,
  ACCOUNT_ROLES: [{ value: 'ADMIN', label: 'Admin' }],
}));

vi.mock('@/components/enseignant/TeacherEditModal', () => ({
  default: () => null,
}));

vi.mock('@/hooks/auth/useAuthService', () => ({
  useBanAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useEnableAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
  usePermanentDeleteAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/services/formation/EnseignantService', () => ({
  default: { getAllEnseignants: vi.fn(() => Promise.resolve([])) },
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: vi.fn(() => ({
    message: { success: vi.fn(), error: vi.fn() },
    modal: { confirm: vi.fn() },
  })),
}));

describe('UnifiedAdministrationPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders hero and stats', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UnifiedAdministrationPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Total comptes')).toBeInTheDocument();
    expect(screen.getByText('Nouveau compte')).toBeInTheDocument();
  });
});

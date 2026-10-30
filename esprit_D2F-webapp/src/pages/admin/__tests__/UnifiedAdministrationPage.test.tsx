import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedAdministrationPage, {
  filterUnifiedRows,
  type UnifiedRow,
  type UnifiedRowFilters,
} from '../UnifiedAdministrationPage';

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
      </QueryClientProvider>,
    );
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Total comptes')).toBeInTheDocument();
    expect(screen.getByText('Nouveau compte')).toBeInTheDocument();
  });

  it('no longer exposes the source filter (Comptes/Enseignants uniquement)', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UnifiedAdministrationPage />
      </QueryClientProvider>,
    );
    expect(screen.queryByText('Comptes uniquement')).not.toBeInTheDocument();
    expect(screen.queryByText('Enseignants uniquement')).not.toBeInTheDocument();
  });
});

describe('filterUnifiedRows (filtre par rôle)', () => {
  const rows = (): UnifiedRow[] => [
    { _type: 'account', _key: 'a1', role: 'ADMIN' },
    { _type: 'account', _key: 'a2', role: 'ROLE_ADMIN' },
    { _type: 'account', _key: 'a3', role: 'enseignant' },
    { _type: 'merged', _key: 'm1', role: 'CUP', type: 'P' },
    { _type: 'teacher', _key: 't1', type: 'P' },
    { _type: 'teacher', _key: 't2', type: 'V' },
  ];

  const base: UnifiedRowFilters = {
    searchText: '',
    roleFilter: [],
    typeFilter: 'ALL',
    statusFilter: 'ALL',
  };

  it('ADMIN matche ADMIN et ROLE_ADMIN, exclut les fiches sans compte', () => {
    const out = filterUnifiedRows(rows(), { ...base, roleFilter: ['ADMIN'] });
    expect(out.map((r) => r._key)).toEqual(['a1', 'a2']);
  });

  it('ENSEIGNANT matche comptes enseignants, fusionnés et fiches sans compte', () => {
    const out = filterUnifiedRows(rows(), { ...base, roleFilter: ['ENSEIGNANT'] });
    // a3 = compte enseignant ; t1/t2 = fiches sans compte (rattachées à enseignant).
    // m1 = compte CUP fusionné → exclu.
    expect(out.map((r) => r._key)).toEqual(['a3', 't1', 't2']);
  });

  it('sans filtre rôle, toutes les lignes passent', () => {
    expect(filterUnifiedRows(rows(), base)).toHaveLength(6);
  });

  it('combine rôle + type enseignant', () => {
    const out = filterUnifiedRows(rows(), { ...base, roleFilter: ['ENSEIGNANT'], typeFilter: 'V' });
    // a3 (compte sans fiche) passe le filtre type (pas de fiche) ; t2 matche V.
    expect(out.map((r) => r._key)).toEqual(['a3', 't2']);
  });
});

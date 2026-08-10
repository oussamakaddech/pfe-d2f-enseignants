import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalendrierGestionPage from '../CalendrierGestionPage';
import * as cal from '@/hooks/formation/useCalendar';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { useAuth } from '@/hooks/auth/useAuth';

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'ADMIN' } })),
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  useAppNotification: vi.fn(() => ({ notification: { warning: vi.fn() } })),
}));

vi.mock('@/hooks/formation/useCalendar', () => ({
  usePreviewImport: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useImportCalendar: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCalendarConflicts: vi.fn(() => ({ data: undefined, isFetching: false, refetch: vi.fn() })),
  useCalendarFormations: vi.fn(() => ({ data: { totalElements: 5 }, refetch: vi.fn() })),
}));

vi.mock('@/components/calendar', () => ({
  CalendarFileUpload: ({
    onFileChange,
    loading,
    disabled,
  }: {
    onFileChange: (f: File) => void;
    loading?: boolean;
    disabled?: boolean;
  }) => (
    <div>
      <input
        type="file"
        data-testid="upload"
        disabled={disabled}
        onChange={(e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) onFileChange(f);
        }}
      />
      {loading && <span>loading-upload</span>}
    </div>
  ),
  ImportResultSummary: ({ report }: { report: unknown }) => (
    <div>summary {JSON.stringify(report)}</div>
  ),
  ConflictsTable: ({ report }: { report: unknown }) => (
    <div>conflicts-{report ? 'has' : 'none'}</div>
  ),
  CalendarFormationsTable: () => <div>formations-table</div>,
}));

function renderWith(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CalendrierGestionPage />
    </QueryClientProvider>,
  );
}

describe('CalendrierGestionPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders hero and stats', () => {
    renderWith(queryClient);
    expect(screen.getByText('Gestion du Calendrier des Ateliers')).toBeInTheDocument();
    expect(screen.getByText('Total Formations')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('shows admin badge for admin users', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: 'ADMIN' } } as never);
    renderWith(queryClient);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows read-only alert for non-admin users', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: 'ENSEIGNANT' } } as never);
    renderWith(queryClient);
    expect(screen.getByText('Accès limité')).toBeInTheDocument();
  });

  it('renders formations and conflicts tabs with content', () => {
    vi.mocked(cal.useCalendarFormations).mockReturnValue({
      data: { totalElements: 5 },
      refetch: vi.fn(),
    } as never);
    vi.mocked(cal.useCalendarConflicts).mockReturnValue({
      data: { totalConflicts: 3 },
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    renderWith(queryClient);
    const formationsTab = screen
      .getByText(/Formations & Export/)
      .closest('.ant-tabs-tab') as HTMLElement;
    fireEvent.click(formationsTab);
    expect(screen.getByText('formations-table')).toBeInTheDocument();
    const conflictsTab = screen.getByText(/Conflits/).closest('.ant-tabs-tab') as HTMLElement;
    fireEvent.click(conflictsTab);
    expect(screen.getByText('conflicts-has')).toBeInTheDocument();
  });

  it('switches to import tab and previews a file', async () => {
    const mutate = vi.fn((_f: File, opts: { onSuccess: (d: unknown) => void }) =>
      opts.onSuccess({
        sessions: [{ formationName: 'Python', date: '2026-01-01', room: 'A1', participants: [] }],
        participants: [],
      }),
    );
    vi.mocked(cal.usePreviewImport).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(cal.useCalendarFormations).mockReturnValue({
      data: { totalElements: 5 },
      refetch: vi.fn(),
    } as never);
    renderWith(queryClient);
    const file = new File(['x'], 'cal.xlsx', { type: 'application/vnd.ms-excel' });
    const input = screen.getByTestId('upload') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('Aperçu du fichier')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('shows conflict count badge on tabs', () => {
    vi.mocked(cal.useCalendarConflicts).mockReturnValue({
      data: { totalConflicts: 7 },
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(cal.useCalendarFormations).mockReturnValue({
      data: { totalElements: 5 },
      refetch: vi.fn(),
    } as never);
    renderWith(queryClient);
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });
});

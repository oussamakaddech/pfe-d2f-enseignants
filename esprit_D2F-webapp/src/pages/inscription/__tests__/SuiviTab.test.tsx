import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SuiviTab from '../SuiviTab';
import * as extras from '@/hooks/formation/useFormationExtras';
import * as forms from '@/hooks/formation/useFormations';
import useAppNotification from '@/hooks/ui/useAppNotification';

const allInscriptions = [
  { id: '1', etat: 'PENDING', dateDemande: '2026-01-05', enseignant: { id: 'E1', nom: 'Dupont', prenom: 'Jean', mail: 'j@e.fr', deptLibelle: 'INFO', upLibelle: 'UP1' }, formation: { idFormation: 'F1', titreFormation: 'Python', dateDebut: '2026-02-01', dateFin: '2026-02-10', inscriptionsOuvertes: true } },
  { id: '2', etat: 'APPROVED', dateDemande: '2026-01-06', enseignant: { id: 'E2', nom: 'Martin', prenom: 'Alice', mail: 'a@e.fr', deptLibelle: 'MATH', upLibelle: 'UP2' }, formation: { idFormation: 'F2', titreFormation: 'Java', dateDebut: '2026-03-01', dateFin: '2026-03-10', inscriptionsOuvertes: false } },
  { id: '3', etat: 'REJECTED', dateDemande: '2026-01-07', enseignant: { id: 'E3', nom: 'Bernard', prenom: 'Paul', mail: 'p@e.fr', deptLibelle: 'INFO', upLibelle: 'UP1' }, formation: { idFormation: 'F1', titreFormation: 'Python', dateDebut: '2026-02-01', dateFin: '2026-02-10', inscriptionsOuvertes: true } },
];

const formations = [
  { idFormation: 'F1', titreFormation: 'Python', inscriptionsOuvertes: true },
  { idFormation: 'F2', titreFormation: 'Java', inscriptionsOuvertes: false },
];

const excelMock = vi.hoisted(() => ({ writeExcel: vi.fn(), exportDateLabel: () => '', isoDate: () => '2026' }));

vi.mock('utils/helpers/excelExport', () => ({ writeExcel: excelMock.writeExcel, exportDateLabel: excelMock.exportDateLabel, isoDate: excelMock.isoDate }));

vi.mock('@/hooks/formation/useFormationExtras', () => ({
  useAllInscriptions: vi.fn(() => ({ data: allInscriptions, isLoading: false, refetch: vi.fn(), isFetching: false })),
  useInscriptionsByFormation: vi.fn(() => ({ data: [], isLoading: false })),
  useTraiterDemande: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
  useTraiterDemandeBulk: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
  useSendEmail: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/formation/useFormations', () => ({
  useAllFormations: vi.fn(() => ({ data: formations })),
  useFormationsVisibles: vi.fn(() => ({ data: [] })),
  useUpdateInscriptionsOuvertes: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
  useFormationById: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: vi.fn(() => ({
    message: { success: vi.fn(), error: vi.fn() },
    modal: { confirm: vi.fn((opts: { onOk?: () => void }) => opts.onOk && opts.onOk()) },
  })),
}));

function renderWith(queryClient: QueryClient) {
  return render(<QueryClientProvider client={queryClient}><SuiviTab /></QueryClientProvider>);
}

describe('SuiviTab', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders sections and stats', () => {
    vi.mocked(extras.useAllInscriptions).mockReturnValue({ data: allInscriptions, isLoading: false, refetch: vi.fn(), isFetching: false } as never);
    vi.mocked(forms.useAllFormations).mockReturnValue({ data: formations } as never);
    renderWith(queryClient);
    expect(screen.getByText('État des inscriptions par formation')).toBeInTheDocument();
    expect(screen.getByText('Gestion des demandes par formation')).toBeInTheDocument();
    expect(screen.getAllByText('Python').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Java').length).toBeGreaterThan(0);
    expect(screen.getByText('3 résultats')).toBeInTheDocument();
  });

  it('shows empty formation message when no formations', () => {
    vi.mocked(extras.useAllInscriptions).mockReturnValue({ data: allInscriptions, isLoading: false, refetch: vi.fn(), isFetching: false } as never);
    vi.mocked(forms.useAllFormations).mockReturnValue({ data: [] } as never);
    vi.mocked(forms.useFormationsVisibles).mockReturnValue({ data: [] } as never);
    renderWith(queryClient);
    expect(screen.getByText('Aucune formation trouvée.')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(extras.useAllInscriptions).mockReturnValue({ data: [], isLoading: true, refetch: vi.fn(), isFetching: false } as never);
    renderWith(queryClient);
    expect(document.querySelectorAll('.ant-spin').length).toBeGreaterThan(0);
  });

  it('filters inscriptions by search term', () => {
    vi.mocked(extras.useAllInscriptions).mockReturnValue({ data: allInscriptions, isLoading: false, refetch: vi.fn(), isFetching: false } as never);
    vi.mocked(forms.useAllFormations).mockReturnValue({ data: formations } as never);
    renderWith(queryClient);
    const input = screen.getByPlaceholderText('Rechercher (nom, email, formation…)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Martin' } });
    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument();
  });

  it('exports the global table to excel', () => {
    vi.mocked(extras.useAllInscriptions).mockReturnValue({ data: allInscriptions, isLoading: false, refetch: vi.fn(), isFetching: false } as never);
    vi.mocked(forms.useAllFormations).mockReturnValue({ data: formations } as never);
    renderWith(queryClient);
    const exportBtns = screen.getAllByText('Exporter');
    fireEvent.click(exportBtns[exportBtns.length - 1]);
    expect(excelMock.writeExcel).toHaveBeenCalled();
  });

  it('refreshes inscriptions via the refresh button', () => {
    const refetch = vi.fn();
    vi.mocked(extras.useAllInscriptions).mockReturnValue({ data: allInscriptions, isLoading: false, refetch, isFetching: false } as never);
    vi.mocked(forms.useAllFormations).mockReturnValue({ data: formations } as never);
    renderWith(queryClient);
    const reload = Array.from(document.querySelectorAll('button')) as HTMLElement[];
    const btn = reload.find((b) => b.querySelector('.anticon-reload'));
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(refetch).toHaveBeenCalled();
  });

  it('toggles inscriptions open/closed on a formation', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.mocked(forms.useUpdateInscriptionsOuvertes).mockReturnValue({ mutateAsync: update } as never);
    const success = vi.fn();
    vi.mocked(useAppNotification).mockReturnValue({ message: { success, error: vi.fn() }, modal: { confirm: vi.fn((opts: { onOk?: () => void }) => opts.onOk && opts.onOk()) } } as never);
    vi.mocked(extras.useAllInscriptions).mockReturnValue({ data: allInscriptions, isLoading: false, refetch: vi.fn(), isFetching: false } as never);
    vi.mocked(forms.useAllFormations).mockReturnValue({ data: formations } as never);
    renderWith(queryClient);
    const toggles = screen.getAllByText('Python');
    fireEvent.click(toggles[0]);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ id: 'F1', ouvert: false }));
  });
});


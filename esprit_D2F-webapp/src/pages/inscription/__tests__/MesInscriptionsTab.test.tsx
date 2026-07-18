import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MesInscriptionsTab from '../MesInscriptionsTab';
import * as extras from '@/hooks/formation/useFormationExtras';
import useAppNotification from '@/hooks/ui/useAppNotification';

const rows = [
  { id: '1', formationId: 'F1', titreFormation: 'Python', dateDebut: '2026-01-01', dateFin: '2026-01-05', etat: 'PENDING', dateDemande: '2025-12-01', chargeHoraire: '20', competencesCiblees: ['Java', 'Python', 'C++', 'Go', 'Rust'], dateTraitement: null },
  { id: '2', formationId: 'F2', titreFormation: 'Java', dateDebut: '2026-02-01', dateFin: '2026-02-05', etat: 'APPROVED', dateDemande: '2025-12-02', chargeHoraire: '10', competencesCiblees: ['Java'], dateTraitement: '2025-12-10' },
  { id: '3', formationId: 'F3', titreFormation: 'C++', dateDebut: '2026-03-01', dateFin: '2026-03-05', etat: 'REJECTED', dateDemande: '2025-12-03', chargeHoraire: '15', competencesCiblees: [], dateTraitement: '2025-12-11', motif: 'Complet' },
];

vi.mock('@/hooks/formation/useFormationExtras', () => ({
  useProfile: vi.fn(() => ({ data: { id: 'E1', email: 'e@esprit.tn' } })),
  useMyInscriptions: vi.fn(() => ({ data: rows, isLoading: false, error: null, refetch: vi.fn() })),
  useAnnulerInscription: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false })),
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: vi.fn(() => ({ message: { success: vi.fn(), error: vi.fn(), open: vi.fn() } })),
}));

const excelMock = vi.hoisted(() => ({ writeExcel: vi.fn(), exportDateLabel: () => '', isoDate: () => '2026' }));
vi.mock('utils/helpers/excelExport', () => ({ writeExcel: excelMock.writeExcel, exportDateLabel: excelMock.exportDateLabel, isoDate: excelMock.isoDate }));

function renderWith(queryClient: QueryClient) {
  return render(<QueryClientProvider client={queryClient}><BrowserRouter><MesInscriptionsTab /></BrowserRouter></QueryClientProvider>);
}

describe('MesInscriptionsTab', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    localStorage.clear();
  });

  it('renders header and inscription rows', () => {
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: rows, isLoading: false, error: null, refetch: vi.fn() } as never);
    renderWith(queryClient);
    expect(screen.getByText('Mes Inscriptions')).toBeInTheDocument();
    expect(screen.getAllByText('Python').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Java').length).toBeGreaterThan(0);
    expect(screen.getAllByText('C++').length).toBeGreaterThan(0);
  });

  it('filters rows by status segment', () => {
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: rows, isLoading: false, error: null, refetch: vi.fn() } as never);
    renderWith(queryClient);
    fireEvent.click(screen.getByText('Approuvées (1)'));
    expect(screen.getAllByText('Java').length).toBeGreaterThan(0);
    expect(screen.queryByText('C++')).not.toBeInTheDocument();
    expect(screen.queryAllByText('Python')).toHaveLength(0);
  });

  it('shows loading state', () => {
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: [], isLoading: true, error: null, refetch: vi.fn() } as never);
    renderWith(queryClient);
    expect(screen.getByText(/Chargement de vos inscriptions/)).toBeInTheDocument();
  });

  it('renders empty state when no inscriptions', () => {
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() } as never);
    renderWith(queryClient);
    expect(screen.getByText('Aucune demande')).toBeInTheDocument();
    expect(screen.getByText('Consulter le catalogue')).toBeInTheDocument();
  });

  it('renders error alert', () => {
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: rows, isLoading: false, error: { message: 'Boom' }, refetch: vi.fn() } as never);
    renderWith(queryClient);
    expect(screen.getByText('Erreur de chargement')).toBeInTheDocument();
  });

  it('cancels a pending inscription', async () => {
    const annuler = vi.fn().mockResolvedValue(undefined);
    const success = vi.fn();
    vi.mocked(extras.useAnnulerInscription).mockReturnValue({ mutateAsync: annuler, isPending: false } as never);
    vi.mocked(useAppNotification).mockReturnValue({ message: { success, error: vi.fn(), open: vi.fn() }, modal: { confirm: vi.fn() } } as never);
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: rows, isLoading: false, error: null, refetch: vi.fn() } as never);
    renderWith(queryClient);
    const cancelBtns = screen.getAllByText('Annuler');
    fireEvent.click(cancelBtns[0]);
    fireEvent.click(await screen.findByText('Oui'));
    await waitFor(() => expect(annuler).toHaveBeenCalledWith({ id: '1', enseignantId: 'e@esprit.tn' }));
  });

  it('exports to excel', () => {
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: rows, isLoading: false, error: null, refetch: vi.fn() } as never);
    renderWith(queryClient);
    const exportBtn = screen.getByText('Exporter');
    fireEvent.click(exportBtn);
    expect(excelMock.writeExcel).toHaveBeenCalled();
  });

  it('shows reject motif for rejected inscriptions', () => {
    vi.mocked(extras.useMyInscriptions).mockReturnValue({ data: rows, isLoading: false, error: null, refetch: vi.fn() } as never);
    renderWith(queryClient);
    expect(screen.getByText('Motif du rejet')).toBeInTheDocument();
    expect(screen.getByText('Complet')).toBeInTheDocument();
  });
});

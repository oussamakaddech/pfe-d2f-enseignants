import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalendarFormationsTable from '../CalendarFormationsTable';
import * as cal from '@/hooks/formation/useCalendar';
import * as forms from '@/hooks/formation/useFormations';
import CalendarService from '@/services/formation/CalendarService';

const messageSuccess = vi.fn();
const messageError = vi.fn();
const modalConfirm = vi.fn();

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({
    message: { success: messageSuccess, error: messageError, warning: vi.fn(), info: vi.fn() },
    notification: { error: vi.fn() },
    modal: { confirm: modalConfirm },
  }),
}));

vi.mock('@/hooks/formation/useCalendar', () => ({
  useCalendarFormations: vi.fn(),
  useSendInvitations: vi.fn(),
}));

vi.mock('@/hooks/formation/useFormations', () => ({
  useUpdateInscriptionsOuvertes: vi.fn(),
  useDeleteFormation: vi.fn(),
}));

vi.mock('@/services/formation/CalendarService', () => ({
  default: {
    downloadIcsFormation: vi.fn(() => Promise.resolve()),
  },
}));

const FORMATIONS = [
  {
    idFormation: 101,
    titre: 'Formation React & TypeScript',
    etat: 'PLANIFIE',
    dateDebut: '2026-11-10',
    dateFin: '2026-11-12',
    salle: 'Lab 1',
    sessionsCount: 3,
    participantsCount: 15,
  },
  {
    idFormation: 102,
    titre: 'Formation Docker & Kubernetes',
    etat: 'EN_COURS',
    dateDebut: '2026-11-01',
    dateFin: '2026-11-05',
    salle: 'Lab 2',
    sessionsCount: 2,
    participantsCount: 8,
  },
];

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App>
        <CalendarFormationsTable />
      </App>
    </QueryClientProvider>,
  );
}

describe('CalendarFormationsTable', () => {
  let refetchMock: ReturnType<typeof vi.fn>;
  let deleteMutateAsync: ReturnType<typeof vi.fn>;
  let updateInscriptionsMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    refetchMock = vi.fn().mockResolvedValue({});
    deleteMutateAsync = vi.fn().mockResolvedValue({});
    updateInscriptionsMutate = vi.fn();

    vi.mocked(cal.useCalendarFormations).mockReturnValue({
      data: {
        content: FORMATIONS,
        totalElements: FORMATIONS.length,
        totalPages: 1,
        number: 0,
        size: 10,
      },
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    } as never);

    vi.mocked(cal.useSendInvitations).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ status: 'SUCCESS', message: 'Invitations envoyées' }),
      isPending: false,
    } as never);

    vi.mocked(forms.useDeleteFormation).mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    } as never);

    vi.mocked(forms.useUpdateInscriptionsOuvertes).mockReturnValue({
      mutate: updateInscriptionsMutate,
      isPending: false,
    } as never);
  });

  it('affiche la liste des formations et les boutons d’action (y compris Supprimer et Actualiser)', () => {
    renderComponent();

    expect(screen.getByText('Formation React & TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Formation Docker & Kubernetes')).toBeInTheDocument();

    // Boutons de la barre d’outils
    expect(screen.getByRole('button', { name: /Filtrer/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actualiser/ })).toBeInTheDocument();

    // Boutons Supprimer par ligne
    expect(screen.getByLabelText('Supprimer Formation React & TypeScript')).toBeInTheDocument();
    expect(screen.getByLabelText('Supprimer Formation Docker & Kubernetes')).toBeInTheDocument();
  });

  it('le bouton Actualiser rafraîchit les données', async () => {
    renderComponent();

    const refreshBtn = screen.getByRole('button', { name: /Actualiser/ });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalledTimes(1);
      expect(messageSuccess).toHaveBeenCalledWith('Données actualisées.');
    });
  });

  it('suppression unitaire : demande confirmation et appelle la mutation de suppression', async () => {
    renderComponent();

    const deleteBtn = screen.getByLabelText('Supprimer Formation React & TypeScript');
    fireEvent.click(deleteBtn);

    // Popconfirm s'affiche
    expect(screen.getByText(/Supprimer « Formation React & TypeScript » \?/)).toBeInTheDocument();

    // Clic sur le bouton de confirmation Popconfirm
    const confirmBtn = screen.getByRole('button', { name: 'Supprimer' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith(101);
      expect(messageSuccess).toHaveBeenCalledWith('Formation « Formation React & TypeScript » supprimée.');
    });
  });

  it('sélection multiple : affiche le bouton Supprimer groupé et supprime les éléments cochés', async () => {
    renderComponent();

    const checkboxes = screen.getAllByRole('checkbox');
    // Le premier est le "select all" dans le header, ou cocher la première ligne
    fireEvent.click(checkboxes[1]);

    // Le bouton groupé "Supprimer (1)" apparaît
    const bulkDeleteBtn = await screen.findByRole('button', { name: /Supprimer \(1\)/ });
    expect(bulkDeleteBtn).toBeInTheDocument();

    fireEvent.click(bulkDeleteBtn);

    // Confirmation Popconfirm
    expect(screen.getByText(/Supprimer les 1 formation\(s\) sélectionnée\(s\) \?/)).toBeInTheDocument();

    const confirmBtn = screen.getAllByRole('button', { name: 'Supprimer' }).find(
      (b) => b.classList.contains('ant-btn-dangerous') || b.textContent === 'Supprimer',
    );
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn!);

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith(101);
      expect(messageSuccess).toHaveBeenCalledWith('1 formation(s) supprimée(s).');
    });
  });

  it('filtre et réinitialisation', () => {
    renderComponent();

    const input = screen.getByPlaceholderText('Rechercher une formation…');
    fireEvent.change(input, { target: { value: 'Docker' } });
    fireEvent.click(screen.getByRole('button', { name: /Filtrer/ }));

    // Le bouton Réinitialiser apparaît quand un filtre est actif
    const resetBtn = screen.getByRole('button', { name: /Réinitialiser/ });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(input).toHaveValue('');
  });
});

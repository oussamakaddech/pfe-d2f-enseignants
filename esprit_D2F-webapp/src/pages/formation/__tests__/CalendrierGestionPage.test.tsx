import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalendrierGestionPage from '../CalendrierGestionPage';
import * as cal from '@/hooks/formation/useCalendar';
import * as extras from '@/hooks/formation/useFormationExtras';

const confirm = vi.fn();

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    notification: { error: vi.fn() },
    modal: { confirm },
  }),
}));

vi.mock('@/hooks/formation/useCalendar', () => ({
  usePreviewImport: vi.fn(),
  useImportCalendar: vi.fn(),
  useCalendarConflicts: vi.fn(),
  useCalendarFormations: vi.fn(),
}));

vi.mock('@/services/formation/CalendarService', () => ({
  default: { downloadIcsAll: vi.fn(() => Promise.resolve()) },
}));

vi.mock('@/hooks/formation/useFormationExtras', () => ({
  useExportFormations: vi.fn(),
}));

vi.mock('@/components/calendar', () => ({
  CalendarFileUpload: ({ onFileChange }: { onFileChange: (f: File) => void }) => (
    <input
      type="file"
      data-testid="upload"
      onChange={(e) => {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (f) onFileChange(f);
      }}
    />
  ),
  ImportErrorsTable: ({ errors }: { errors: unknown[] }) => <div>erreurs-{errors.length}</div>,
  ImportResultSummary: ({ report }: { report: { status: string } }) => (
    <div>resume-{report.status}</div>
  ),
  ConflictsTable: ({ report }: { report: unknown }) => <div>conflits-{report ? 'oui' : 'non'}</div>,
  CalendarFormationsTable: () => <div>table-formations</div>,
}));

const PREVIEW = {
  sessions: [
    {
      formationName: 'Conteneurisation',
      date: '2026-09-07',
      startTime: '08:30',
      endTime: '14:30',
      room: 'B12',
      trainerName: 'K. Trabelsi',
      sessionNumber: 1,
      totalSessions: 2,
      sourceRow: 4,
    },
    {
      formationName: 'Conteneurisation',
      date: '2026-09-08',
      room: 'B12',
      sessionNumber: 2,
      totalSessions: 2,
      sourceRow: 5,
    },
    { formationName: 'MLOPS', date: '2026-09-09', room: 'C3', sourceRow: 6 },
  ],
  participants: [
    { formationName: 'conteneurisation', email: 'a@esprit.tn', sourceRow: 1 },
    { formationName: 'Conteneurisation', email: 'b@esprit.tn', sourceRow: 2 },
    { formationName: 'MLOPS', email: 'a@esprit.tn', sourceRow: 1 },
  ],
  errors: [{ row: 9, field: 'date', message: 'Date illisible', severity: 'ERROR' }],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App>
          <CalendrierGestionPage />
        </App>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function analyserFichier() {
  const file = new File(['x'], 'calendrier.xlsx');
  fireEvent.change(screen.getByTestId('upload'), { target: { files: [file] } });
  return file;
}

describe('CalendrierGestionPage', () => {
  let importMutate: ReturnType<typeof vi.fn>;
  let exportMutate: ReturnType<typeof vi.fn>;
  let formationsRefetch: ReturnType<typeof vi.fn>;
  let conflictsRefetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    importMutate = vi.fn();
    exportMutate = vi.fn();
    formationsRefetch = vi.fn();
    conflictsRefetch = vi.fn();
    vi.mocked(extras.useExportFormations).mockReturnValue({
      mutateAsync: exportMutate,
      isPending: false,
    } as never);
    vi.mocked(cal.usePreviewImport).mockReturnValue({
      mutate: vi.fn((_f: File, opts: { onSuccess: (d: unknown) => void }) =>
        opts.onSuccess(PREVIEW),
      ),
      isPending: false,
    } as never);
    vi.mocked(cal.useImportCalendar).mockReturnValue({
      mutate: importMutate,
      isPending: false,
    } as never);
    vi.mocked(cal.useCalendarConflicts).mockReturnValue({
      data: { totalConflicts: 3 },
      isFetching: false,
      isLoading: false,
      refetch: conflictsRefetch,
    } as never);
    vi.mocked(cal.useCalendarFormations).mockReturnValue({
      data: { totalElements: 12 },
      isLoading: false,
      isFetching: false,
      refetch: formationsRefetch,
    } as never);
  });

  it('affiche les trois étapes et les compteurs serveur (formations, conflits)', () => {
    renderPage();
    expect(screen.getByText('Gestion du calendrier des ateliers')).toBeInTheDocument();
    expect(screen.getByText('Aperçu et vérification')).toBeInTheDocument();
    expect(screen.getByText('Formations du calendrier')).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('aperçu : formations distinctes, séances, participants par formation, lignes en erreur', () => {
    renderPage();
    analyserFichier();
    expect(screen.getByText('2 formation(s)')).toBeInTheDocument();
    expect(screen.getByText('3 séance(s)')).toBeInTheDocument();
    expect(screen.getByText('2 participant(s)')).toBeInTheDocument();
    expect(screen.getByText('1 erreur(s)')).toBeInTheDocument();
    expect(screen.getByText('erreurs-1')).toBeInTheDocument();
    const ligne = screen.getByText('08:30 – 14:30').closest('tr') as HTMLElement;
    expect(within(ligne).getByText('1/2')).toBeInTheDocument();
    expect(within(ligne).getByText('2')).toBeInTheDocument(); // participants de « Conteneurisation »
    expect(importMutate).not.toHaveBeenCalled(); // l'aperçu n'enregistre rien
  });

  it('« Enregistrer le calendrier » demande confirmation puis importe (doublons ignorés si cochés)', async () => {
    renderPage();
    const file = analyserFichier();
    fireEvent.click(screen.getByLabelText(/Ignorer les doublons/));
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le calendrier/ }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(importMutate).not.toHaveBeenCalled();
    confirm.mock.calls[0][0].onOk();
    expect(importMutate).toHaveBeenCalledWith({ file, force: true }, expect.any(Object));

    importMutate.mock.calls[0][1].onSuccess({ status: 'SUCCESS', sessionsCreated: 3 });
    expect(await screen.findByText('resume-SUCCESS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nouvel import/ })).toBeInTheDocument();
  });

  it('fichier déjà importé (409) : avertissement et on reste sur l’aperçu', async () => {
    renderPage();
    analyserFichier();
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le calendrier/ }));
    confirm.mock.calls[0][0].onOk();
    expect(importMutate).toHaveBeenCalledWith(
      expect.objectContaining({ force: false }),
      expect.any(Object),
    );
    importMutate.mock.calls[0][1].onError({ response: { status: 409 } });
    await waitFor(() =>
      expect(screen.getByText('Ce fichier a déjà été importé')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Enregistrer le calendrier/ })).toBeInTheDocument();
  });

  it('statut DUPLICATE (200) : avertissement, aperçu conservé, pas de résultat affiché', async () => {
    renderPage();
    analyserFichier();
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le calendrier/ }));
    confirm.mock.calls[0][0].onOk();
    importMutate.mock.calls[0][1].onSuccess({
      status: 'DUPLICATE',
      sessionsCreated: 0,
      rowsSkipped: 0,
    });
    expect(await screen.findByText('Ce fichier a déjà été importé')).toBeInTheDocument();
    expect(screen.queryByText(/resume-/)).not.toBeInTheDocument();
  });

  it('onglets Formations et Conflits et boutons Actualiser', () => {
    renderPage();
    // Bouton Actualiser du Hero
    const heroRefresh = screen.getAllByRole('button', { name: /Actualiser/ })[0];
    expect(heroRefresh).toBeInTheDocument();
    fireEvent.click(heroRefresh);
    expect(formationsRefetch).toHaveBeenCalled();
    expect(conflictsRefetch).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Formations et export/));
    expect(screen.getByText('table-formations')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Exporter tout/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Seules les formations extraites/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nouvelle formation/ })).not.toBeInTheDocument();

    // Bouton Actualiser de la section Formations
    const sectionRefresh = screen.getAllByRole('button', { name: /Actualiser/ })[1];
    expect(sectionRefresh).toBeInTheDocument();
    fireEvent.click(sectionRefresh);
    expect(formationsRefetch).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText(/^Conflits$/));
    expect(screen.getByText('conflits-oui')).toBeInTheDocument();
  });

  it('« Exporter en Excel » télécharge le classeur du calendrier (toutes dates par défaut)', async () => {
    const createObjectURL = vi.fn(() => 'blob:calendrier');
    const revokeObjectURL = vi.fn();
    (globalThis.URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (globalThis.URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
    exportMutate.mockResolvedValue({ data: new Blob(['x']) });

    renderPage();
    fireEvent.click(screen.getByText(/Formations et export/));
    fireEvent.click(screen.getByRole('button', { name: /Exporter en Excel/ }));

    await waitFor(() =>
      expect(exportMutate).toHaveBeenCalledWith({ start: '2000-01-01', end: '2100-12-31' }),
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:calendrier');
  });

  it('bouton « Supprimer l’aperçu » réinitialise l’étape et vide le fichier', () => {
    renderPage();
    analyserFichier();
    expect(screen.getByText('2 formation(s)')).toBeInTheDocument();

    const deletePreviewBtn = screen.getByRole('button', { name: /Supprimer l'aperçu/ });
    expect(deletePreviewBtn).toBeInTheDocument();
    fireEvent.click(deletePreviewBtn);

    // Retour à l'étape Fichier
    expect(screen.getByTestId('upload')).toBeInTheDocument();
    expect(screen.queryByText('2 formation(s)')).not.toBeInTheDocument();
  });
});

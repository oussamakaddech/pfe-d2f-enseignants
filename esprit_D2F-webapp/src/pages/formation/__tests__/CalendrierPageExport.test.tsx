import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalendrierPage from '../CalendrierPage';
import * as extras from '@/hooks/formation/useFormationExtras';

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    notification: { error: vi.fn() },
    modal: { confirm: vi.fn() },
  }),
}));

vi.mock('@/hooks/formation/useFormationExtras', () => ({
  useProfile: vi.fn(() => ({ data: { role: 'ADMIN' }, isLoading: false })),
  useExportFormations: vi.fn(),
}));

vi.mock('@/hooks/formation', () => ({
  useAllFormations: vi.fn(() => ({ data: [], isLoading: false })),
  useFormationsForCalendar: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/formation/useUpCrud', () => ({
  useAllUps: vi.fn(() => ({
    data: [
      { id: 'UP_GC', name: 'Génie Civil' },
      { id: 'UP_GL', name: 'Génie Logiciel' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/formation/useDeptCrud', () => ({
  useAllDepts: vi.fn(() => ({
    data: [{ id: 'DEPT_GC', name: 'Génie Civil' }],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/enseignant/useEnseignants', () => ({
  useEnseignantById: vi.fn(() => ({ data: null })),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App>
          <CalendrierPage />
        </App>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CalendrierPage — Export Excel', () => {
  const exportMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extras.useExportFormations).mockReturnValue({
      mutateAsync: exportMutate,
      isPending: false,
    } as unknown as ReturnType<typeof extras.useExportFormations>);
  });

  it('affiche le bouton « Exporter en Excel » et déclenche le téléchargement', async () => {
    const createObjectURL = vi.fn(() => 'blob:calendrier-export');
    const revokeObjectURL = vi.fn();
    (globalThis.URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (globalThis.URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
    exportMutate.mockResolvedValue({ data: new Blob(['content']) });

    renderPage();

    const exportBtn = screen.getByRole('button', { name: /Exporter en Excel/i });
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    await waitFor(() =>
      expect(exportMutate).toHaveBeenCalledWith({ start: '2000-01-01', end: '2100-12-31' }),
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:calendrier-export');
  });

  it('affiche le sélecteur de période (date de début et date de fin) à côté du bouton', () => {
    renderPage();

    const rangePicker = document.querySelector('.cal-export-range');
    expect(rangePicker).toBeInTheDocument();
    const inputs = rangePicker!.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveAttribute('placeholder', 'Début (toutes dates)');
    expect(inputs[1]).toHaveAttribute('placeholder', 'Fin (toutes dates)');
  });

  it('affiche aussi les filtres UP et département (accessibles à tous les rôles)', () => {
    renderPage();

    const selects = document.querySelectorAll('.cal-export-select');
    expect(selects).toHaveLength(2);
    expect(screen.getByText('UP (toutes)')).toBeInTheDocument();
    expect(screen.getByText('Département (tous)')).toBeInTheDocument();
  });
});

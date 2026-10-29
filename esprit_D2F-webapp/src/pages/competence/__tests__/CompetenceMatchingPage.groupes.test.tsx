import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CompetenceMatchingPage from '../CompetenceMatchingPage';

// Deux savoirs d'une MÊME compétence : S1 la porte directement, S2 via la
// sous-compétence 5 (cas réel : `savoirs.competence_id` n'est pas renseigné
// pour un savoir rangé sous une sous-compétence).
const STABLE_SAVOIRS = [
  { id: 1, code: 'S1', nom: 'Savoir 1', competenceId: 10 },
  { id: 2, code: 'S2', nom: 'Savoir 2', sousCompetenceId: 5 },
];

const STABLE_ENSEIGNANTS = [
  { id: 'e1', prenom: 'Meriem', nom: 'Ali', deptId: 'DEPT_WEB', deptLibelle: 'Développement Web' },
];

vi.mock('@/hooks/analyse/useRiceService', () => ({
  useRiceSavoirs: vi.fn(() => ({ data: STABLE_SAVOIRS, refetch: vi.fn() })),
  useRiceEnseignants: vi.fn(() => ({ data: STABLE_ENSEIGNANTS, refetch: vi.fn() })),
  useRiceSaveAssignments: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceCreateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceUpdateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRiceDeactivateEnseignant: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/hooks/formation/useFormations', () => ({
  useDepartements: vi.fn(() => ({ data: [{ id: 'DEPT_WEB', libelle: 'Développement Web' }] })),
}));

// `App.useApp()` d'antd n'est pas fourni ici : sans ce mock, `message.success`
// n'existe pas et le dépôt lève une exception.
vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({
    message: {
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
    },
    notification: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
    modal: { confirm: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
  }),
}));

vi.mock('../hooks/useMatchingReferential', () => ({
  useMatchingReferential: vi.fn(() => ({
    domaines: [{ id: 1, code: 'D1', nom: 'Domaine 1' }],
    competences: [{ id: 10, code: 'C10', nom: 'Compétence 10', domaineId: 1 }],
    sousCompetences: [{ id: 5, code: 'SC5', nom: 'Sous-compétence 5', competenceId: 10 }],
  })),
}));

/** Clic sur une option du `Segmented` de périmètre (Savoir / Compétence / Sous-compétence). */
function clickSegmented(container: HTMLElement, label: string) {
  const segment = container.querySelector('.ant-segmented');
  const item = Array.from(segment?.querySelectorAll('label') ?? []).find(
    (el) => el.textContent?.trim() === label,
  );
  if (!item) throw new Error(`Option « ${label} » introuvable dans le Segmented`);
  fireEvent.click(item);
}

/** `dataTransfer` minimal : jsdom n'en fournit pas pour les événements de glisser-déposer. */
function fakeDataTransfer() {
  const store: Record<string, string> = {};
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: (type: string, value: string) => {
      store[type] = value;
    },
    getData: (type: string) => store[type] ?? '',
  };
}

describe('CompetenceMatchingPage — affectation par compétence / sous-compétence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propose un groupe glissable par compétence, couvrant tous ses savoirs', async () => {
    const { container } = render(
      <BrowserRouter>
        <CompetenceMatchingPage />
      </BrowserRouter>,
    );
    expect(await screen.findByText('Savoir 1')).toBeInTheDocument();

    clickSegmented(container, 'Compétence');

    // Le panneau bascule sur les compétences…
    expect(await screen.findByText('Compétences (tous leurs savoirs)')).toBeInTheDocument();
    // …et la compétence 10 est proposée avec ses DEUX savoirs (direct + sous-compétence).
    expect(await screen.findByText('C10')).toBeInTheDocument();
    expect(screen.getByText('2 savoir(s)')).toBeInTheDocument();
    expect(screen.getByText(/1 groupe\(s\) glissable\(s\) · 2 savoir\(s\)/)).toBeInTheDocument();
    // Les cartes de savoir unitaires ne sont plus affichées dans ce mode.
    expect(screen.queryByText('Savoir 1')).toBeNull();
  });

  it('déposer une compétence met TOUS ses savoirs en attente', async () => {
    const { container } = render(
      <BrowserRouter>
        <CompetenceMatchingPage />
      </BrowserRouter>,
    );
    expect(await screen.findByText('Savoir 1')).toBeInTheDocument();
    clickSegmented(container, 'Compétence');
    const groupeCard = (await screen.findByText('C10')).closest('button');
    expect(groupeCard).not.toBeNull();

    const dataTransfer = fakeDataTransfer();
    fireEvent.dragStart(groupeCard as HTMLElement, { dataTransfer });

    const ensCard = (await screen.findByText('Meriem Ali')).closest('button');
    expect(ensCard).not.toBeNull();
    fireEvent.dragOver(ensCard as HTMLElement, { dataTransfer });
    fireEvent.drop(ensCard as HTMLElement, { dataTransfer });

    // Un seul dépôt = deux savoirs en attente (aucune couverture partielle).
    await waitFor(() =>
      expect(screen.getByText('2 modification(s) non sauvegardée(s)')).toBeInTheDocument(),
    );
  }, 15000);
});

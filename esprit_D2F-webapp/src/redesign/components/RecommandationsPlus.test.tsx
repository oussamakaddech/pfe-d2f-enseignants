import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import RecommandationsPlus from '@/redesign/components/RecommandationsPlus';
import type {
  GroupedRecommendationsResponse,
  RecommendationGroup,
  WhatIfResponse,
  Recommendation,
} from '@/models/analyse';

vi.mock('@/hooks/analyse/useAnalytics', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  interface SimConfig {
    result?: unknown;
    isPending?: boolean;
    isError?: boolean;
  }
  const useGroupedRecommendations = vi.fn(() => ({
    data: { total: 0, groups: [] },
    isLoading: false,
    isError: false,
  }));
  const simConfig: { value: SimConfig } = {
    value: { result: null, isPending: false, isError: false },
  };
  const useSimulateWhatIf = vi.fn(() => {
    const [state, setState] = React.useState<{
      data: unknown;
      isError: boolean;
      isPending: boolean;
    }>({
      data: null,
      isError: simConfig.value.isError ?? false,
      isPending: simConfig.value.isPending ?? false,
    });
    const mutateAsync = vi.fn(async () => {
      setState({ data: simConfig.value.result ?? null, isError: false, isPending: false });
      return simConfig.value.result ?? null;
    });
    return { ...state, mutateAsync };
  });
  (useSimulateWhatIf as unknown as { __config: { value: SimConfig } }).__config = simConfig;
  return { useGroupedRecommendations, useSimulateWhatIf };
});

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return { ...actual, message: { success: vi.fn(), error: vi.fn() } };
});

import { useGroupedRecommendations, useSimulateWhatIf } from '@/hooks/analyse/useAnalytics';

function setSimResult(result: unknown, opts: { isError?: boolean; isPending?: boolean } = {}) {
  (
    useSimulateWhatIf as unknown as {
      __config: { value: { result?: unknown; isError?: boolean; isPending?: boolean } };
    }
  ).__config.value = {
    result,
    isError: opts.isError ?? false,
    isPending: opts.isPending ?? false,
  };
}

const groupReco = (over: Partial<Recommendation> = {}): Recommendation => ({
  id: 1,
  formation_id: 1,
  formation_titre: 'Python avancé',
  formation_type: 'WORKSHOP',
  competence_id: 1,
  competence_nom: 'Python',
  score_global: 0.8,
  score_pertinence: 0.7,
  score_reussite: 0.6,
  score_disponibilite: 0.5,
  probabilite_reussite: 0.7,
  facteurs_score: { pairs: 0.4 },
  rang_dans_parcours: 1,
  justification: null,
  statut: 'PROPOSEE',
  ...over,
});

const group = (over: Partial<RecommendationGroup> = {}): RecommendationGroup => ({
  group_key: 'k1',
  group_label: 'Python',
  nb: 2,
  score_moyen: 0.6,
  score_max: 0.8,
  nb_acceptees: 0,
  items: [groupReco(), groupReco({ id: 2, formation_titre: 'SQL base' })],
  ...over,
});

const groupedResponse = (
  over: Partial<GroupedRecommendationsResponse> = {},
): GroupedRecommendationsResponse => ({
  enseignant_id: 'ENS-1',
  group_by: 'competence',
  total: 1,
  groups: [group()],
  ...over,
});

const whatIfResponse = (over: Partial<WhatIfResponse> = {}): WhatIfResponse => ({
  enseignant_id: 'ENS-1',
  horizon_mois: 6,
  risk_before: { score: 0.8, niveau: 'ELEVE' },
  risk_after: { score: 0.4, niveau: 'MODERE' },
  risk_reduction: 0.5,
  nb_gaps_before: 10,
  nb_gaps_after: 5,
  nb_gaps_resolus: 5,
  details: [
    {
      competence_id: 1,
      niveau_actuel: 2,
      niveau_requis: 4,
      niveau_vise: 4,
      gap_avant: 2,
      gap_apres: 0,
      urgence_apres: 'FAIBLE',
      resolu: true,
    },
    {
      competence_id: 2,
      niveau_actuel: 1,
      niveau_requis: 4,
      niveau_vise: 3,
      gap_avant: 3,
      gap_apres: 1,
      urgence_apres: 'MODERE',
      resolu: false,
    },
  ],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  (useGroupedRecommendations as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { total: 0, groups: [] },
    isLoading: false,
    isError: false,
  });
  setSimResult(null);
});

function renderReco(enseignantId: string | null) {
  return render(
    <MemoryRouter>
      <App>
        <RecommandationsPlus enseignantId={enseignantId} />
      </App>
    </MemoryRouter>,
  );
}

describe('RecommandationsPlus', () => {
  it('demande de sélectionner un enseignant sans id', () => {
    renderReco(null);
    expect(screen.getByText(/Sélectionnez un enseignant/i)).toBeInTheDocument();
  });
  it('rend les sections Regroupement et What-if', () => {
    renderReco('ENS-1');
    expect(screen.getByText('Regroupement des recommandations')).toBeInTheDocument();
    expect(
      screen.getByText("Simulation what-if — impact d'un plan de formation"),
    ).toBeInTheDocument();
  });
  it('affiche un message quand aucune recommandation', () => {
    renderReco('ENS-1');
    expect(screen.getByText(/Aucune recommandation à regrouper/i)).toBeInTheDocument();
  });
  it('change le regroupement via les segments', () => {
    renderReco('ENS-1');
    const btn = screen.getByRole('button', { name: 'Urgence' });
    fireEvent.click(btn);
    expect(btn.className).toContain('active');
  });

  it('change le regroupement sur Type et Competence', () => {
    renderReco('ENS-1');
    const type = screen.getByRole('button', { name: 'Type' });
    const comp = screen.getByRole('button', { name: 'Compétence' });
    fireEvent.click(type);
    expect(type.className).toContain('active');
    fireEvent.click(comp);
    expect(comp.className).toContain('active');
  });

  it('affiche le skeleton en chargement du regroupement', () => {
    (useGroupedRecommendations as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderReco('ENS-1');
    expect(document.querySelector('.rd-skel-block')).toBeInTheDocument();
  });

  it("affiche un message d'erreur si le regroupement échoue", () => {
    (useGroupedRecommendations as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderReco('ENS-1');
    expect(screen.getByText(/Impossible de charger le regroupement/i)).toBeInTheDocument();
  });

  it('rend les groupes et leurs recommandations', () => {
    (useGroupedRecommendations as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: groupedResponse(),
      isLoading: false,
      isError: false,
    });
    renderReco('ENS-1');
    expect(screen.getAllByText('Python').length).toBeGreaterThan(0);
    expect(screen.getByText('Python avancé')).toBeInTheDocument();
    expect(screen.getByText('SQL base')).toBeInTheDocument();
    expect(screen.getByText('max 80%')).toBeInTheDocument();
  });

  it("ajoute et retire des lignes d'action dans le what-if", () => {
    renderReco('ENS-1');
    const add = screen.getByRole('button', { name: /\+ Ajouter une action/ });
    fireEvent.click(add);
    expect(screen.getAllByPlaceholderText('ID')).toHaveLength(2);
    const removeButtons = screen.getAllByRole('button', { name: 'Retirer' });
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText('ID')).toHaveLength(1);
  });

  it("ne retire pas la dernière ligne d'action", () => {
    renderReco('ENS-1');
    expect(screen.getAllByPlaceholderText('ID')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Retirer' })).toBeNull();
  });

  it("met à jour une ligne d'action via les inputs", () => {
    renderReco('ENS-1');
    const idInput = screen.getByPlaceholderText('ID') as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: '42' } });
    expect(idInput.value).toBe('42');
    const select = screen.getByDisplayValue('N4') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '2' } });
    expect(select.value).toBe('2');
  });

  it("change l'horizon via les segments", () => {
    renderReco('ENS-1');
    const h12 = screen.getByRole('button', { name: '12 mois' });
    fireEvent.click(h12);
    expect(h12.className).toContain('active');
  });

  it('lance la simulation et affiche le résultat', async () => {
    setSimResult(whatIfResponse());
    renderReco('ENS-1');
    fireEvent.click(screen.getByRole('button', { name: /Simuler l'impact/ }));
    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument());
    expect(screen.getByText('10 → 5')).toBeInTheDocument();
    expect(screen.getByText('Réduction risque')).toBeInTheDocument();
    expect(screen.getByText('C1')).toBeInTheDocument();
    expect(screen.getByText('C2')).toBeInTheDocument();
    expect(
      within(screen.getByText('C1').closest('.rd-reco-row') as HTMLElement).getByText('Oui'),
    ).toBeInTheDocument();
  });

  it('ne simule pas un plan vide', async () => {
    setSimResult(whatIfResponse());
    renderReco('ENS-1');
    fireEvent.change(screen.getByPlaceholderText('ID'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Simuler l'impact/ }));
    await waitFor(() => {});
    expect(screen.queryByText('Réduction risque')).toBeNull();
  });

  it('affiche le résultat en cours de chargement', () => {
    setSimResult(null, { isPending: true });
    renderReco('ENS-1');
    expect(screen.getByRole('button', { name: /Simulation…/ })).toBeDisabled();
  });

  it("affiche un message d'erreur de simulation", () => {
    setSimResult(null, { isError: true });
    renderReco('ENS-1');
    expect(screen.getByText(/La simulation a échoué/i)).toBeInTheDocument();
  });

  it('affiche uniquement le détail quand pas de détails', async () => {
    setSimResult(whatIfResponse({ details: [] }));
    renderReco('ENS-1');
    fireEvent.click(screen.getByRole('button', { name: /Simuler l'impact/ }));
    await waitFor(() => expect(screen.getByText(/Aucun détail retourné/i)).toBeInTheDocument());
  });
});

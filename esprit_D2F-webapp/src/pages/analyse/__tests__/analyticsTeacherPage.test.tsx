import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAnalyzeTeacher: vi.fn(),
  useTeacherRisk: vi.fn(),
  useTeacherGaps: vi.fn(),
  useTeacherRecommendations: vi.fn(),
  useTeacherTrainingPath: vi.fn(),
  useTeacherScopeAnalysis: vi.fn(),
  useRiskHistory: vi.fn(),
  useAlerts: vi.fn(),
  useUpdateAlert: vi.fn(),
}));

vi.mock('@/hooks/analytics/useAnalyticsQueries', () => ({
  useAnalyzeTeacher: mocks.useAnalyzeTeacher,
  useTeacherRisk: mocks.useTeacherRisk,
  useTeacherGaps: mocks.useTeacherGaps,
  useTeacherRecommendations: mocks.useTeacherRecommendations,
  useTeacherTrainingPath: mocks.useTeacherTrainingPath,
  useTeacherScopeAnalysis: mocks.useTeacherScopeAnalysis,
  useRiskHistory: mocks.useRiskHistory,
  useAlerts: mocks.useAlerts,
  useUpdateAlert: mocks.useUpdateAlert,
}));

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsTeacherPage from '@/pages/analyse/AnalyticsTeacherPage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

const setup = () => {
  mocks.useAnalyzeTeacher.mockReturnValue({ isPending: false, isError: false, mutate: vi.fn() });
  mocks.useTeacherRisk.mockReturnValue({ isLoading: false, data: undefined });
  mocks.useTeacherGaps.mockReturnValue({ isLoading: false, data: { gaps: [] } });
  mocks.useTeacherRecommendations.mockReturnValue({
    isLoading: false,
    data: { recommendations: [] },
  });
  mocks.useTeacherTrainingPath.mockReturnValue({ isLoading: false, data: undefined });
  mocks.useTeacherScopeAnalysis.mockReturnValue({ isLoading: false, data: undefined });
  mocks.useRiskHistory.mockReturnValue({ isLoading: false, data: { points: [] } });
  mocks.useAlerts.mockReturnValue({ isLoading: false, data: { alerts: [] } });
  mocks.useUpdateAlert.mockReturnValue({ mutate: vi.fn() });
};

describe('AnalyticsTeacherPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le titre de la page', () => {
    setup();
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.getByText(/Analyse prédictive — Enseignant/i)).toBeInTheDocument();
  });

  it('accessibilité : le nom de l enseignant est le titre principal (h1)', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      data: {
        enseignant_id: 'T1',
        enseignant_nom: 'Wafa BenYoussef',
        score: 0.76,
        score_percent: 76,
        niveau: 'MODERE',
        level_label: 'Modéré',
        facteurs: [],
        tendance: 'STABLE',
        precedent_score: null,
        computed_at: new Date().toISOString(),
      },
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Wafa BenYoussef');
  });

  it("affiche le bouton Lancer l'analyse", () => {
    setup();
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.getByText(/Lancer l'analyse/i)).toBeInTheDocument();
  });

  it('affiche le score et le libellé dérivés du backend (76 / 100 / Modéré)', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      data: {
        enseignant_id: 'T1',
        enseignant_nom: 'Nom Test',
        score: 0.76,
        score_percent: 76,
        niveau: 'MODERE',
        level_label: 'Modéré',
        facteurs: [],
        tendance: 'STABLE',
        precedent_score: null,
        computed_at: new Date().toISOString(),
        model_mode: 'PRODUCTION_ML',
        model_version: 'v3',
      },
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    // Gouvernance 7.6 : indice non calibré, jamais présenté en « % de probabilité ».
    expect(screen.getAllByText(/76 \/ 100/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\(non calibré\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Modéré')).toBeInTheDocument();
  });

  it('utilise gaps_summary du service pour les compteurs', () => {
    setup();
    mocks.useTeacherGaps.mockReturnValue({
      isLoading: false,
      data: {
        gaps: [],
        gaps_summary: { total: 3, critical: 1, high: 1, stagnant: 1, declining: 0 },
      },
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.getByText('Gaps détectés')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);
  });

  it('affiche un indicateur de chargement quand le risque se charge', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({ isLoading: true, data: undefined });
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(document.querySelector('.ant-spin')).not.toBeNull();
  });

  it('affiche une alerte quand le chargement du risque échoue', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      data: undefined,
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.getByText(/Impossible de charger l'analyse du risque/i)).toBeInTheDocument();
  });

  it('affiche la provenance du modèle renvoyée par l API (observations réelles, part synthétique, version dataset)', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      data: {
        enseignant_id: 'T1',
        enseignant_nom: 'Nom Test',
        score: 0.76,
        score_percent: 76,
        niveau: 'MODERE',
        level_label: 'Modéré',
        facteurs: [],
        tendance: 'STABLE',
        precedent_score: null,
        computed_at: new Date().toISOString(),
        model_mode: 'PRODUCTION_ML',
        model_version: 'v3',
      },
    });
    mocks.useTeacherGaps.mockReturnValue({
      isLoading: false,
      data: {
        gaps: [],
        gaps_summary: { total: 0, critical: 0, high: 0, stagnant: 0, declining: 0 },
        model: {
          model_mode: 'PRODUCTION_ML',
          model_version: 'v3',
          dataset_version: 'v1.0.0',
          prediction_horizon: '3m',
          synthetic_share_pct: 0,
          total_rows: 107,
          real_rows: 107,
        },
      },
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    screen.getByText('Modèles').click();
    expect(screen.getByText(/Version du jeu de données/)).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText(/Observations réelles/)).toBeInTheDocument();
    expect(screen.getAllByText('107')).toHaveLength(2);
    expect(screen.getByText(/Part synthétique/)).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it("n'affiche aucun champ de provenance quand l API n en fournit pas", () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      data: {
        enseignant_id: 'T1',
        enseignant_nom: 'Nom Test',
        score: 0.76,
        score_percent: 76,
        niveau: 'MODERE',
        level_label: 'Modéré',
        facteurs: [],
        tendance: 'STABLE',
        precedent_score: null,
        computed_at: new Date().toISOString(),
        model_mode: 'HEURISTIC_FALLBACK',
        model_version: null,
      },
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.queryByText('Version du jeu de données')).not.toBeInTheDocument();
    expect(screen.queryByText('Observations réelles')).not.toBeInTheDocument();
    expect(screen.queryByText('Part synthétique')).not.toBeInTheDocument();
  });

  it('badge modèle : nom et version de l artefact viennent de l API (jamais codés en dur)', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      data: {
        enseignant_id: 'T1',
        enseignant_nom: 'Nom Test',
        score: 0.9,
        score_percent: 90,
        niveau: 'CRITIQUE',
        level_label: 'Critique',
        facteurs: [],
        tendance: 'STABLE',
        precedent_score: null,
        computed_at: new Date().toISOString(),
        model_mode: 'PRODUCTION_ML',
        model_version: 'v1.0.0',
        model_name: 'gap_predictor_temporal',
      },
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    screen.getByText('Modèles').click();
    // Deux badges (hero + panneau Modèles) portent le mode réel et l'artefact.
    expect(screen.getAllByText(/ML actif/).length).toBeGreaterThanOrEqual(2);
    // Nom de l'artefact : dans les badges ET dans la ligne « Artefact du modèle ».
    expect(screen.getAllByText(/gap_predictor_temporal/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/Artefact du modèle/)).toBeInTheDocument();
    expect(screen.getByText(/Version de l'artefact/)).toBeInTheDocument();
    expect(screen.getAllByText(/v1\.0\.0/).length).toBeGreaterThanOrEqual(2);
  });

  it('non-régression : aucun libellé hérité (Réussite, mode hérité, Probabilités ML (classifier))', () => {
    setup();
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.queryByText(/mode hérité/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Probabilités ML \(classifier\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Réussite/i)).not.toBeInTheDocument();
  });

  it('gouvernance 7.6 : affiche la mention « Cible extrapolée » quand target_validity=EXTRAPOLATED_TARGET', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      data: {
        enseignant_id: 'T1',
        enseignant_nom: 'Nom Test',
        score: 0.4,
        score_percent: 40,
        niveau: 'MODERE',
        level_label: 'Modéré',
        facteurs: [],
        tendance: 'STABLE',
        precedent_score: null,
        computed_at: new Date().toISOString(),
        model_mode: 'PRODUCTION_ML',
        model_version: 'v1.0.0',
        model_name: 'gap_predictor_temporal',
        target_validity: 'EXTRAPOLATED_TARGET',
      },
    });
    render(<AnalyticsTeacherPage />, { wrapper });
    // Badge cible extrapolée visible (hero).
    expect(screen.getAllByText(/Cible extrapolée/i).length).toBeGreaterThanOrEqual(1);
    // Onglet Modèles : mention détaillée.
    screen.getByText('Modèles').click();
    expect(
      screen.getAllByText(/Cible extrapolée — validation démonstration/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('gouvernance 7.6 (test_no_probability_wording_in_frontend) : l indice de risque n est jamais libellé « probabilité »', () => {
    setup();
    mocks.useTeacherRisk.mockReturnValue({
      isLoading: false,
      data: {
        enseignant_id: 'T1',
        enseignant_nom: 'Nom Test',
        score: 0.9,
        score_percent: 90,
        niveau: 'CRITIQUE',
        level_label: 'Critique',
        facteurs: [],
        tendance: 'STABLE',
        precedent_score: null,
        computed_at: new Date().toISOString(),
        model_mode: 'PRODUCTION_ML',
        model_version: 'v1.0.0',
      },
    });
    const { container } = render(<AnalyticsTeacherPage />, { wrapper });
    // L'indice est affiché avec son étiquette honnête.
    expect(screen.getAllByText(/non calibré/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Indice de risque/i).length).toBeGreaterThanOrEqual(1);
    // Aucun libellé « probabilité » attaché à l'indice de risque dans le DOM rendu.
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain('probabilité de risque');
    expect(html).not.toContain('probabilite de risque');
    expect(html).not.toContain('probability of risk');
  });
});

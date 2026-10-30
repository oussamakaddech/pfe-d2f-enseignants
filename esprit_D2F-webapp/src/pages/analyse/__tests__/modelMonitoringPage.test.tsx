import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useModelStatus: vi.fn(),
  useModelDrift: vi.fn(),
  useModelRetrain: vi.fn(),
  useModelRollback: vi.fn(),
}));

vi.mock('@/hooks/analytics/useAnalyticsQueries', () => ({
  useModelStatus: mocks.useModelStatus,
  useModelDrift: mocks.useModelDrift,
  useModelRetrain: mocks.useModelRetrain,
  useModelRollback: mocks.useModelRollback,
}));

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModelMonitoringPage from '@/pages/analyse/ModelMonitoringPage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

const setup = () => {
  mocks.useModelStatus.mockReturnValue({ data: undefined, isLoading: false });
  mocks.useModelDrift.mockReturnValue({ data: undefined, isLoading: false });
  mocks.useModelRetrain.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mocks.useModelRollback.mockReturnValue({ mutate: vi.fn(), isPending: false });
};

describe('ModelMonitoringPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le titre du monitoring', () => {
    setup();
    render(<ModelMonitoringPage />, { wrapper });
    expect(screen.getByText(/Monitoring du modèle/i)).toBeInTheDocument();
  });

  it('affiche les boutons réentraîner et rollback', () => {
    setup();
    render(<ModelMonitoringPage />, { wrapper });
    expect(screen.getByText(/Réentraîner/i)).toBeInTheDocument();
    expect(screen.getByText(/Rollback/i)).toBeInTheDocument();
  });

  // ── Honnêteté de l'affichage (correctif d'audit) ──────────────
  // Ces tests ne passaient PAS avant que le chemin de mock soit corrigé :
  // `vi.mock('../hooks/useAnalyticsQueries')` visait un module inexistant
  // (les pages importent `@/hooks/analytics/useAnalyticsQueries`), donc la
  // page tournait sur le vrai hook et aucune donnée de test ne l'atteignait.

  it('rend « non contrôlée » quand la dérive n a pas été mesurée', () => {
    setup();
    mocks.useModelDrift.mockReturnValue({
      data: {
        drift_detected: null,
        metric: 'kolmogorov_smirnov_2samp',
        valeur_actuelle: 0,
        seuil: 0.01,
        jours_depuis_entrainement: 0,
        message: 'Contrôle de dérive pas encore exécuté',
        detected_at: '2026-09-22T00:00:00Z',
      },
      isLoading: false,
    });
    render(<ModelMonitoringPage />, { wrapper });
    expect(screen.getByText('NON CONTRÔLÉE')).toBeInTheDocument();
    // Une absence de mesure ne doit jamais s'afficher comme une absence de dérive.
    expect(screen.queryByText('AUCUNE')).toBeNull();
    expect(screen.queryByText(/Dérive du modèle détectée/i)).toBeNull();
  });

  it('affiche la vraie exactitude du modèle servi, pas un R² déguisé', () => {
    setup();
    mocks.useModelStatus.mockReturnValue({
      data: {
        version: 'v1.2.0-gb',
        entraîné_le: null,
        algorithme: 'gradient_boosting',
        features_count: 29,
        accuracy: 0.349,
        accuracy_metric: 'accuracy_pm10',
        accuracy_pm05: 0.14,
        r2: 0.2458,
        rmse: 1.214,
        mae: 1.1082,
        f1_score: null,
        drift_detected: false,
        derniere_verification_integrite: null,
        integrite_ok: true,
        source: 'modele',
        disponible: true,
        inert_features: ['nb_besoins_approuves'],
      },
      isLoading: false,
    });
    render(<ModelMonitoringPage />, { wrapper });
    expect(screen.getByText('34.9 %')).toBeInTheDocument();
    expect(screen.getByText('14.0 %')).toBeInTheDocument();
    expect(screen.getByText(/0\.2458/)).toBeInTheDocument();
    expect(screen.getByText('gradient_boosting')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.getByText('nb_besoins_approuves')).toBeInTheDocument();
    // L'ancien affichage montrait 1.000 (R2 d'un artefact obsolete).
    expect(screen.queryByText('1.000')).toBeNull();
    expect(screen.queryByText('100.0 %')).toBeNull();
  });

  it('signale un artefact non chargé au lieu d affirmer l intégrité', () => {
    setup();
    mocks.useModelStatus.mockReturnValue({
      data: {
        version: 'n/a',
        entraîné_le: null,
        algorithme: 'inconnu',
        features_count: 0,
        accuracy: null,
        f1_score: null,
        drift_detected: null,
        derniere_verification_integrite: null,
        integrite_ok: false,
        source: 'heuristique',
        disponible: false,
        fallback_reason: 'artefact absent ou integrite invalide',
      },
      isLoading: false,
    });
    render(<ModelMonitoringPage />, { wrapper });
    expect(screen.getByText(/INTÉGRITÉ NON VÉRIFIÉE/i)).toBeInTheDocument();
    expect(screen.getByText(/Fallback heuristique/i)).toBeInTheDocument();
    expect(screen.getByText('artefact absent ou integrite invalide')).toBeInTheDocument();
  });
});

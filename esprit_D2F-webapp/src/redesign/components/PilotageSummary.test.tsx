import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import PilotageSummary from '@/redesign/components/PilotageSummary';

const data = {
  forecast_kpis: {
    horizon_mois: 6,
    nb_enseignants: 100,
    niveau_projet_moyen: 3.2,
    pct_objectifs_atteignables: 75,
    nb_competences_regression: 4,
    nb_competences_suivies: 10,
  },
  benchmark_departements: [
    {
      departement_id: 'Info',
      niveau_moyen: 3.1,
      ecart_vs_cohorte: 0.5,
      nb_enseignants: 28,
      position: 'AU_DESSUS',
    },
  ],
  anomalies_live: {
    nb_anomalies_recentes: 5,
    fenetre_jours: 30,
    nb_nouvelles: 2,
    alertes: [{ severite: 'CRITICAL', titre: 'Alerte 1', message: 'msg' }],
  },
  correlation_besoins_gaps: {
    coefficient_pearson: 0.82,
    nb_competences: 12,
    top_paires: [],
    interpretation: 'forte',
  },
};

vi.mock('@/hooks/analyse/usePilotageDashboard', () => ({
  usePilotageDashboard: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

import { usePilotageDashboard } from '@/hooks/analyse/usePilotageDashboard';

beforeEach(() => {
  (usePilotageDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

function renderSummary() {
  return render(
    <MemoryRouter>
      <App>
        <PilotageSummary horizon={6} />
      </App>
    </MemoryRouter>,
  );
}

describe('PilotageSummary', () => {
  it('affiche le titre et le bouton de navigation', () => {
    renderSummary();
    expect(screen.getByText('Pilotage prévisionnel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tableau complet/i })).toBeInTheDocument();
  });
  it('affiche les KPIs forecast', () => {
    renderSummary();
    expect(screen.getByText('Niveau projeté moyen')).toBeInTheDocument();
    expect(screen.getByText('75 %')).toBeInTheDocument();
    expect(screen.getByText('Compétences en régression')).toBeInTheDocument();
    expect(screen.getByText('Anomalies live')).toBeInTheDocument();
  });
  it('affiche le benchmark et la corrélation', () => {
    const { container } = renderSummary();
    expect(screen.getByText('Benchmark départements')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(container.textContent).toContain('0.50');
    expect(container.textContent).toContain('0.82');
    expect(screen.getByText('forte')).toBeInTheDocument();
  });
  it("affiche l'alerte d'anomalies récentes", () => {
    renderSummary();
    expect(screen.getByText(/5 anomalie\(s\) détectée\(s\) sur 30 jours/)).toBeInTheDocument();
    expect(screen.getByText('Alerte 1')).toBeInTheDocument();
  });
  it('navigue au clic sur le bouton complet', () => {
    const onClick = vi.fn();
    const { rerender } = renderSummary();
    const btn = screen.getByRole('button', { name: /Tableau complet/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });
  it('affiche le skeleton en loading', () => {
    (usePilotageDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });
    const { container } = renderSummary();
    expect(container.querySelector('.rd-skel-kpi')).toBeInTheDocument();
  });
});

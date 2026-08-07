import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AlertsPanel from '@/redesign/components/AlertsPanel';
import type { AlertSummary } from '@/models/analyse';

const summary: AlertSummary = {
  total: 18,
  nouvelles: 4,
  critiques_ouvertes: 2,
  by_severite: [
    { key: 'CRITICAL', count: 5 },
    { key: 'WARNING', count: 8 },
    { key: 'INFO', count: 5 },
  ],
  by_type: [],
  by_statut: [],
  top_competences: [{ competence_id: 1, competence_nom: 'Python', count: 6 }],
  top_departements: [{ departement_id: 'd1', departement_nom: 'Info', count: 4 }],
  trend_30j: [
    { date: '2024-01-01', total: 10, critiques: 3 },
    { date: '2024-01-02', total: 12, critiques: 4 },
  ],
} as AlertSummary;

describe('AlertsPanel', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<AlertsPanel alerts={null} loading />);
    expect(container.querySelector('.rd-list-item')).toBeInTheDocument();
  });
  it('affiche un message vide sans alertes', () => {
    render(<AlertsPanel alerts={null} loading={false} />);
    expect(screen.getByText("Aucune donnée d'alertes")).toBeInTheDocument();
  });
  it('affiche les totaux', () => {
    render(<AlertsPanel alerts={summary} loading={false} />);
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
  it("affiche les sévérités triées (Critique d'abord)", () => {
    render(<AlertsPanel alerts={summary} loading={false} />);
    expect(screen.getByText('Critique')).toBeInTheDocument();
    const crit = screen.getByText('Critique').closest('.rd-alerts-bar-row')!;
    expect(crit.querySelector('.rd-alerts-bar-count')!.textContent).toBe('5');
  });
  it('affiche les compétences et départements alertés', () => {
    render(<AlertsPanel alerts={summary} loading={false} />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });
  it('affiche la tendre 30j', () => {
    render(<AlertsPanel alerts={summary} loading={false} />);
    expect(screen.getByText('Tendance sur 30 jours')).toBeInTheDocument();
  });
});

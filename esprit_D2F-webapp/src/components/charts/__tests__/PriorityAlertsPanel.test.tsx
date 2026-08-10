import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PriorityAlertsPanel from '../PriorityAlertsPanel';
import type { AlertSummary } from '@/models/analyse';

const data: AlertSummary = {
  by_type: [{ key: 'GAP_CRITIQUE', count: 3 }],
  by_severite: [
    { key: 'CRITICAL', count: 2 },
    { key: 'WARNING', count: 4 },
  ],
  by_statut: [{ key: 'LUE', count: 1 }],
  total: 6,
  nouvelles: 2,
  critiques_ouvertes: 1,
  top_competences: [{ competence_id: 5, count: 3 }],
  top_departements: [{ departement_id: 'INFO', count: 2 }],
  trend_30j: [],
};

describe('PriorityAlertsPanel', () => {
  it('renders the title and KPI statistics', () => {
    render(<PriorityAlertsPanel data={data} loading={false} onBulkUpdate={vi.fn()} />);
    expect(screen.getByText(/Alertes Prioritaires/i)).toBeInTheDocument();
    expect(screen.getByText('Total alertes')).toBeInTheDocument();
    expect(screen.getByText('Nouvelles')).toBeInTheDocument();
    expect(screen.getByText('Critiques ouvertes')).toBeInTheDocument();
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('renders severity breakdown tags', () => {
    render(<PriorityAlertsPanel data={data} loading={false} onBulkUpdate={vi.fn()} />);
    expect(screen.getAllByText(/CRITICAL/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/WARNING/).length).toBeGreaterThan(0);
  });

  it('renders top competences and departements', () => {
    render(<PriorityAlertsPanel data={data} loading={false} onBulkUpdate={vi.fn()} />);
    expect(screen.getByText(/Compétences les plus alertées/i)).toBeInTheDocument();
    expect(screen.getByText(/C5 \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Départements les plus alertés/i)).toBeInTheDocument();
  });

  it('shows empty state when no alert rows', () => {
    render(
      <PriorityAlertsPanel
        data={{ ...data, by_severite: [], by_type: [] }}
        loading={false}
        onBulkUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Aucune alerte/i)).toBeInTheDocument();
  });

  it('disables bulk action until a row is selected and calls onBulkUpdate', async () => {
    const onBulkUpdate = vi.fn().mockResolvedValue(undefined);
    render(<PriorityAlertsPanel data={data} loading={false} onBulkUpdate={onBulkUpdate} />);
    const applyBtn = screen.getByRole('button', { name: /Trier en masse/i });
    expect(applyBtn).toBeDisabled();
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);
    const confirmBtn = await screen.findByRole('button', { name: /Appliquer/i });
    fireEvent.click(confirmBtn);
    await vi.waitFor(() => expect(onBulkUpdate).toHaveBeenCalled());
  });
});

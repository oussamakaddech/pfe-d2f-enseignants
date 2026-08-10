import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RiskDistributionChart from '@/redesign/components/RiskDistributionChart';
import type { RiskDistribution } from '@/redesign/contract';

const dist: RiskDistribution = {
  total: 128,
  byLevel: { CRITIQUE: 9, ELEVE: 21, MODERE: 44, FAIBLE: 54 },
  byDepartment: [
    { department: 'Info', avgRiskPct: 78, teachers: 28 },
    { department: 'Math', avgRiskPct: 41, teachers: 24 },
  ],
};

describe('RiskDistributionChart', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<RiskDistributionChart distribution={null} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans données', () => {
    render(<RiskDistributionChart distribution={null} loading={false} />);
    expect(screen.getByText('Aucune donnée de distribution')).toBeInTheDocument();
  });
  it('affiche le total, les niveaux et les départements', () => {
    render(<RiskDistributionChart distribution={dist} loading={false} />);
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('Critique')).toBeInTheDocument();
    expect(screen.getByText('Faible')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('78 %')).toBeInTheDocument();
    expect(screen.getByText('28 ens.')).toBeInTheDocument();
  });
  it('met à jour le niveau survolé au mouseEnter', () => {
    render(<RiskDistributionChart distribution={dist} loading={false} />);
    const item = screen.getByText('Critique').closest('.rd-dist-legend-item')!;
    fireEvent.mouseEnter(item);
    expect(item.className).toContain('hovered');
    fireEvent.mouseLeave(item);
    expect(item.className).not.toContain('hovered');
  });
});

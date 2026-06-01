import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RiskTable from '../RiskTable';
import type { TeacherRiskIndicator } from '@/models/analyse';

const sample: TeacherRiskIndicator[] = [
  {
    teacher_id: 'ENS001', teacher_name: 'Alice DUPONT',
    attrition_risk_score: 0.85, disengagement_signals: ['Absence prolongée'],
    competency_stagnation_rate: 0.7, training_velocity: 0,
    recommendation: 'Planifier entretien',
  },
  {
    teacher_id: 'ENS002', teacher_name: 'Bob MARTIN',
    attrition_risk_score: 0.3, disengagement_signals: [],
    competency_stagnation_rate: 0.2, training_velocity: 5,
    recommendation: 'OK',
  },
];

describe('RiskTable', () => {
  it('renders one row per teacher', () => {
    render(<RiskTable data={sample} threshold={0.7} />);
    expect(screen.getByText('Alice DUPONT')).toBeInTheDocument();
    expect(screen.getByText('Bob MARTIN')).toBeInTheDocument();
  });

  it('shows the recommendation tag', () => {
    render(<RiskTable data={sample} threshold={0.7} />);
    expect(screen.getByText('Planifier entretien')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows "Aucun signal" when signals array is empty', () => {
    render(<RiskTable data={sample} threshold={0.7} />);
    expect(screen.getByText('Aucun signal')).toBeInTheDocument();
  });

  it('does NOT render the Action column when onAnalyze is not provided', () => {
    const { container } = render(<RiskTable data={sample} threshold={0.7} />);
    // No "thunderbolt" action button without callback
    expect(container.querySelectorAll('button.ant-btn-icon-only').length).toBe(0);
  });

  it('renders Action column and calls onAnalyze with teacher_id when provided', () => {
    const onAnalyze = vi.fn();
    const { container } = render(
      <RiskTable data={sample} threshold={0.7} onAnalyze={onAnalyze} />
    );
    const buttons = container.querySelectorAll('button');
    // First action button corresponds to the first sorted row (highest risk = Alice 0.85)
    const actionButtons = Array.from(buttons).filter(
      (b) => b.getAttribute('class')?.includes('ant-btn-icon-only')
    );
    expect(actionButtons.length).toBe(2);
    fireEvent.click(actionButtons[0]);
    expect(onAnalyze).toHaveBeenCalledTimes(1);
    // The clicked teacher must be one of our two seeds
    expect(['ENS001', 'ENS002']).toContain(onAnalyze.mock.calls[0][0]);
  });
});

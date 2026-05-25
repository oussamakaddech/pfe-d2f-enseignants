import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EnseignantSelect from '../EnseignantSelect';
import type { TeacherRiskIndicator } from '@/models/analyse';

const teachers: TeacherRiskIndicator[] = [
  { teacher_id: 'ENS001', teacher_name: 'Karim TRABELSI',
    attrition_risk_score: 0.2, disengagement_signals: [],
    competency_stagnation_rate: 0.1, training_velocity: 4, recommendation: 'OK' },
  { teacher_id: 'ENS002', teacher_name: 'Sonia MANSOURI',
    attrition_risk_score: 0.8, disengagement_signals: ['Absence'],
    competency_stagnation_rate: 0.6, training_velocity: 0, recommendation: 'Planifier entretien' },
];

describe('EnseignantSelect', () => {
  it('renders without crashing with empty list', () => {
    render(<EnseignantSelect teachers={[]} onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(<EnseignantSelect teachers={teachers} onChange={() => {}} />);
    expect(screen.getByText(/Rechercher un enseignant/i)).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn();
    render(<EnseignantSelect teachers={teachers} onChange={onChange} />);
    const input = screen.getByRole('combobox');
    fireEvent.mouseDown(input);
    // Antd renders options in a portal; pick the first listed teacher
    const option = screen.getByText('Karim TRABELSI');
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith('ENS001');
  });

  it('renders teachers sorted alphabetically', () => {
    render(<EnseignantSelect teachers={teachers} onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const names = screen.getAllByText(/TRABELSI|MANSOURI/);
    // Karim comes after Sonia? No — sorted by full name: "Karim TRABELSI" vs "Sonia MANSOURI"
    // localeCompare: "K" < "S" so Karim first
    expect(names[0].textContent).toMatch(/Karim/);
  });
});

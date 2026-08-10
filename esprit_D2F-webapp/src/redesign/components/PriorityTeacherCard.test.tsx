import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriorityTeacherCard from '@/redesign/components/PriorityTeacherCard';
import type { UnifiedRiskTeacher } from '@/redesign/contract';

const teacher: UnifiedRiskTeacher = {
  id: 'ENS-1',
  name: 'Amel Benali',
  department: 'Info',
  riskScore: 0.86,
  riskLevel: 'CRITIQUE',
  signals: ['Stagnation des compétences', 'Écarts critiques'],
  trend: 'REGRESSION',
  criticalGaps: 3,
  recommendedAction: 'Former',
  recommendedTraining: null,
  openAlerts: 0,
};

describe('PriorityTeacherCard', () => {
  it('affiche le nom, le département et les écarts', () => {
    const { container } = render(<PriorityTeacherCard teacher={teacher} />);
    expect(screen.getByText('Amel Benali')).toBeInTheDocument();
    expect(container.textContent).toContain('Info');
    expect(container.textContent).toMatch(/3 écarts critiques/);
  });
  it('affiche les signaux (max 3)', () => {
    render(<PriorityTeacherCard teacher={teacher} />);
    expect(screen.getByText('Stagnation des compétences')).toBeInTheDocument();
    expect(screen.getByText('Écarts critiques')).toBeInTheDocument();
  });
  it("affiche '—' sans département et sans signaux", () => {
    render(
      <PriorityTeacherCard
        teacher={{ ...teacher, department: null, signals: [], criticalGaps: 0 }}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

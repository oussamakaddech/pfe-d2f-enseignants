import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GlassRiskTable from '../GlassRiskTable';
import type { TeacherRiskIndicator } from '@/models/analyse';

const sample: TeacherRiskIndicator[] = [
  {
    teacher_id: 'E00003',
    teacher_name: 'Marie DUPONT',
    attrition_risk_score: 0.82,
    disengagement_signals: ['Absence prolongée de formation'],
    competency_stagnation_rate: 0.7,
    training_velocity: 0,
    recommendation: 'Planifier entretien',
  },
  {
    teacher_id: 'E00004',
    teacher_name: 'Ahmed BEN ALI',
    attrition_risk_score: 0.58,
    disengagement_signals: ['Stagnation des compétences'],
    competency_stagnation_rate: 0.4,
    training_velocity: 2,
    recommendation: 'Proposer formation',
  },
];

describe('GlassRiskTable', () => {
  it('displays "Score de risque" column header (not "Risque d\'attrition")', () => {
    render(<GlassRiskTable data={sample} />);
    expect(screen.getByText('Score de risque')).toBeInTheDocument();
    expect(screen.queryByText("Risque d'attrition")).not.toBeInTheDocument();
  });

  it('converts score_risque from 0-1 to 0-100% (single multiplication)', () => {
    render(<GlassRiskTable data={sample} />);
    // 0.82 * 100 = 82%
    expect(screen.getByText('82%')).toBeInTheDocument();
    // 0.58 * 100 = 58%
    expect(screen.getByText('58%')).toBeInTheDocument();
  });

  it('handles zero score', () => {
    const zeroData: TeacherRiskIndicator[] = [
      {
        teacher_id: 'E00005',
        teacher_name: 'Zero TEST',
        attrition_risk_score: 0,
        disengagement_signals: [],
        competency_stagnation_rate: 0,
        training_velocity: 0,
        recommendation: 'OK',
      },
    ];
    render(<GlassRiskTable data={zeroData} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles score of 1.0 (100%)', () => {
    const maxData: TeacherRiskIndicator[] = [
      {
        teacher_id: 'E00006',
        teacher_name: 'Max TEST',
        attrition_risk_score: 1.0,
        disengagement_signals: [],
        competency_stagnation_rate: 0,
        training_velocity: 0,
        recommendation: 'Planifier entretien',
      },
    ];
    render(<GlassRiskTable data={maxData} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

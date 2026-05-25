import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GapTable from '../GapTable';
import type { AnalyseGap } from '@/models/analyse';

const gaps: AnalyseGap[] = [
  { competenceCode: 'C1', competenceLabel: 'Spring Boot', niveauActuel: 1, niveauCible: 4,
    gap: 3, gravite: 'elevee', explication: 'Gap critique' },
  { competenceCode: 'C2', competenceLabel: 'Docker', niveauActuel: 2, niveauCible: 3,
    gap: 1, gravite: 'moyenne', explication: 'Mise à niveau modérée' },
  { competenceCode: 'C3', competenceLabel: 'Git', niveauActuel: 3, niveauCible: 3,
    gap: 0, gravite: 'faible', explication: 'OK' },
];

describe('GapTable', () => {
  it('renders one row per gap', () => {
    render(<GapTable data={gaps} />);
    expect(screen.getByText('Spring Boot')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText('Git')).toBeInTheDocument();
  });

  it('renders gravite labels uppercased', () => {
    render(<GapTable data={gaps} />);
    expect(screen.getByText('ELEVEE')).toBeInTheDocument();
    expect(screen.getByText('MOYENNE')).toBeInTheDocument();
    expect(screen.getByText('FAIBLE')).toBeInTheDocument();
  });

  it('renders competence codes', () => {
    render(<GapTable data={gaps} />);
    expect(screen.getByText('C1')).toBeInTheDocument();
    expect(screen.getByText('C2')).toBeInTheDocument();
  });

  it('renders empty table without crashing', () => {
    const { container } = render(<GapTable data={[]} />);
    expect(container.querySelector('.ant-table')).toBeInTheDocument();
  });
});

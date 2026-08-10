import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PolarAreaChart from '@/redesign/components/charts/PolarAreaChart';

describe('PolarAreaChart', () => {
  it('affiche un message vide sans items', () => {
    render(<PolarAreaChart items={[]} />);
    expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
  });
  it('affiche le total et les labels', () => {
    render(
      <PolarAreaChart
        items={[
          { label: 'Python', value: 30 },
          { label: 'SQL', value: 10 },
        ]}
      />,
    );
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });
  it('affiche les pourcentages par segment', () => {
    render(
      <PolarAreaChart
        items={[
          { label: 'A', value: 75 },
          { label: 'B', value: 25 },
        ]}
      />,
    );
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});

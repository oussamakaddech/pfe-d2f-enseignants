import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HorizontalBarChart from '@/redesign/components/charts/HorizontalBarChart';

describe('HorizontalBarChart', () => {
  it('affiche un message vide sans items', () => {
    render(<HorizontalBarChart items={[]} />);
    expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
  });
  it('affiche chaque item avec sa valeur', () => {
    render(
      <HorizontalBarChart
        items={[
          { label: 'Python', value: 31 },
          { label: 'SQL', value: 18 },
        ]}
      />,
    );
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });
  it('respecte maxValue', () => {
    const { container } = render(
      <HorizontalBarChart items={[{ label: 'A', value: 50 }]} maxValue={100} />,
    );
    expect(container.querySelector('.hbc-fill')).toHaveStyle({ width: '50%' });
  });
  it('masque les valeurs quand showValues=false', () => {
    render(<HorizontalBarChart items={[{ label: 'A', value: 50 }]} showValues={false} />);
    expect(screen.queryByText('50')).not.toBeInTheDocument();
  });
});

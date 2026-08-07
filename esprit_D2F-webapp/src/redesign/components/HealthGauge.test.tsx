import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HealthGauge from '@/redesign/components/HealthGauge';

describe('HealthGauge', () => {
  it('affiche le score et /100', () => {
    render(<HealthGauge score={72} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });
  it('borne un score négatif à 0', () => {
    const { container } = render(<HealthGauge score={-10} />);
    expect(container.querySelector('svg text')!.textContent).toContain('0');
  });
  it('affiche le score brut (>100 non clampé dans le texte)', () => {
    const { container } = render(<HealthGauge score={150} />);
    expect(container.querySelector('svg text')!.textContent).toContain('150');
  });
  it('utilise la couleur fournie', () => {
    const { container } = render(<HealthGauge score={50} color="#ff0000" />);
    expect(container.querySelector("circle[stroke='#ff0000']")).toBeInTheDocument();
  });
});

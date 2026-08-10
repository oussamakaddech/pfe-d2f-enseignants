import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskBadge, RiskDot } from '@/redesign/components/Risk';

describe('RiskBadge', () => {
  it("affiche 'Non calculable' pour null", () => {
    render(<RiskBadge score={null} />);
    expect(screen.getByText('Non calculable')).toBeInTheDocument();
  });
  it('affiche le pourcentage et le libellé pour un score', () => {
    const { container } = render(<RiskBadge score={0.86} />);
    expect(container.textContent).toContain('86 %');
    expect(container.textContent).toContain('Critique');
  });
  it('applique la taille sm', () => {
    const { container } = render(<RiskBadge score={0.4} size="sm" />);
    expect(container.querySelector('.rd-risk.sm')).toBeInTheDocument();
  });
});

describe('RiskDot', () => {
  it('rend un point coloré (smoke)', () => {
    const { container } = render(<RiskDot score={0.8} />);
    expect(container.querySelector('.rd-risk-dot')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GlassKpi from '../GlassKpi';

describe('GlassKpi', () => {
  it('renders label, value and icon', () => {
    render(
      <GlassKpi label="Enseignants suivis" value={42} icon={<span>I</span>} />
    );
    expect(screen.getByText('Enseignants suivis')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('shows a flat delta when undefined', () => {
    render(<GlassKpi label="X" value={1} icon={<span>I</span>} />);
    expect(screen.getByText(/stable/i)).toBeInTheDocument();
  });

  it('shows an up delta marked good when deltaGoodWhenUp is true', () => {
    const { container } = render(
      <GlassKpi label="X" value={1} icon={<span>I</span>} delta={5} deltaGoodWhenUp />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(container.querySelector('.glass-kpi-delta.up')).toBeInTheDocument();
  });

  it('shows a down delta marked bad when deltaGoodWhenUp is true', () => {
    const { container } = render(
      <GlassKpi label="X" value={1} icon={<span>I</span>} delta={-5} deltaGoodWhenUp />
    );
    expect(container.querySelector('.glass-kpi-delta.down')).toBeInTheDocument();
  });
});

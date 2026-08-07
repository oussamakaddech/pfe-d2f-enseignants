import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KpiCard from '@/components/analytics/KpiCard';

describe('KpiCard', () => {
  it('affiche le titre et la valeur', () => {
    render(<KpiCard title="Enseignants" value={42} />);
    expect(screen.getByText('Enseignants')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('affiche le suffixe', () => {
    render(<KpiCard title="Taux" value={75} suffix="%" />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });
});

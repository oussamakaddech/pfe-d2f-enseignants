import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ModelBadge, { formatModelVersion } from '@/components/analytics/ModelBadge';

describe('formatModelVersion', () => {
  it('v1.0.0 reste v1.0.0 (pas de double v)', () => {
    expect(formatModelVersion('v1.0.0')).toBe('v1.0.0');
  });

  it('1.0.0 devient v1.0.0', () => {
    expect(formatModelVersion('1.0.0')).toBe('v1.0.0');
  });

  it('valeur null donne Version inconnue', () => {
    expect(formatModelVersion(null)).toBe('Version inconnue');
    expect(formatModelVersion(undefined)).toBe('Version inconnue');
  });
});

describe('ModelBadge', () => {
  it('affiche ML actif pour PRODUCTION_ML', () => {
    render(<ModelBadge modelMode="PRODUCTION_ML" modelVersion="v3" />);
    expect(screen.getByText('ML actif')).toBeInTheDocument();
  });

  it('affiche ML de démonstration pour DEMO_ML', () => {
    render(<ModelBadge modelMode="DEMO_ML" />);
    expect(screen.getByText('ML de démonstration')).toBeInTheDocument();
  });

  it('affiche le repli heuristique pour HEURISTIC_FALLBACK', () => {
    render(<ModelBadge modelMode="HEURISTIC_FALLBACK" />);
    expect(screen.getByText('Heuristique')).toBeInTheDocument();
  });

  it('gère un mode absent comme fallback heuristique', () => {
    render(<ModelBadge modelMode={undefined} />);
    expect(screen.getByText('Heuristique')).toBeInTheDocument();
  });

  it('affiche le nom et la version de l artefact fournis par l API (PRODUCTION_ML)', () => {
    render(
      <ModelBadge
        modelMode="PRODUCTION_ML"
        modelVersion="v1.0.0"
        modelName="gap_predictor_temporal"
      />,
    );
    const badge = screen.getByText(
      (_, el) => el?.getAttribute('class')?.includes('at-badge') ?? false,
    );
    expect(badge.textContent).toContain('ML actif');
    expect(badge.textContent).toContain('gap_predictor_temporal');
    expect(badge.textContent).toContain('v1.0.0');
    // Non-régression : jamais de double v (vv1.0.0)
    expect(badge.textContent).not.toContain('vv1.0.0');
  });

  it('version 1.0.0 sans préfixe est formatée en v1.0.0 (pas de double v)', () => {
    render(
      <ModelBadge
        modelMode="PRODUCTION_ML"
        modelVersion="1.0.0"
        modelName="gap_predictor_temporal"
      />,
    );
    const badge = screen.getByText(
      (_, el) => el?.getAttribute('class')?.includes('at-badge') ?? false,
    );
    expect(badge.textContent).toContain('v1.0.0');
    expect(badge.textContent).not.toContain('vv1.0.0');
  });

  it('n affiche pas d artefact pour le fallback heuristique (pas de nom codé en dur)', () => {
    render(<ModelBadge modelMode="HEURISTIC_FALLBACK" modelVersion={null} />);
    expect(screen.getByText('Heuristique')).toBeInTheDocument();
    expect(screen.queryByText(/gap_predictor/)).not.toBeInTheDocument();
  });
});

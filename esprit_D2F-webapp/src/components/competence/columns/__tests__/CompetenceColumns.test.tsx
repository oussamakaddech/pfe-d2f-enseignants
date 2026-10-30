import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { buildDomaineColumns } from '../CompetenceColumns';
import type { Domaine } from '@/models/competence';

type RenderFn = (value: unknown, record: Domaine, index: number) => ReactNode;

function renderActif(canEdit: boolean, actif: boolean) {
  const onToggle = vi.fn();
  const column = buildDomaineColumns(onToggle, canEdit).find((c) => c.key === 'actif');
  const cell = (column as { render: RenderFn }).render(actif, { id: 1, actif } as Domaine, 0);
  render(<>{cell}</>);
  return onToggle;
}

describe('buildDomaineColumns — colonne « Actif »', () => {
  it('affiche un interrupteur quand la modification est autorisée (admin)', () => {
    renderActif(true, true);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it("n'affiche qu'un libellé en consultation seule (CUP, chef)", () => {
    renderActif(false, false);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('Inactif')).toBeInTheDocument();
  });
});

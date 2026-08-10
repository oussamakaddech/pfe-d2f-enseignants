import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DecliningCompetencies from '@/redesign/components/charts/DecliningCompetencies';
import type { DecliningCompetency } from '@/models/analyse';

const items: DecliningCompetency[] = [
  {
    competence_id: 1,
    competence_nom: 'Structures',
    domaine_nom: 'GC',
    delta: -0.6,
    niveau_actuel: 2.4,
    niveau_ancien: 3.0,
  } as unknown as DecliningCompetency,
  {
    competence_id: 2,
    competence_nom: 'Anglais',
    domaine_nom: 'Langues',
    delta: -0.2,
    niveau_actuel: 3.0,
    niveau_ancien: 3.2,
  } as unknown as DecliningCompetency,
];

describe('DecliningCompetencies', () => {
  it('affiche le skeleton en loading sans items', () => {
    const { container } = render(<DecliningCompetencies items={[]} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans items', () => {
    render(<DecliningCompetencies items={[]} loading={false} />);
    expect(screen.getByText('Aucune compétence en déclin détectée')).toBeInTheDocument();
  });
  it('affiche les compétences et leurs niveaux', () => {
    const { container } = render(<DecliningCompetencies items={items} loading={false} />);
    expect(screen.getByText('Structures')).toBeInTheDocument();
    expect(screen.getByText('Anglais')).toBeInTheDocument();
    expect(container.textContent).toContain('3.0 → 2.4');
    expect(container.textContent).toMatch(/▼ 0\.6 pts/);
  });
  it('tolère la convention camelCase (niveauActuel)', () => {
    const { container } = render(
      <DecliningCompetencies
        items={[
          {
            competence_id: 1,
            competence_nom: 'X',
            domaine_nom: 'D',
            delta: -0.1,
            niveau_actuel: 1,
            niveau_ancien: 2,
          } as unknown as DecliningCompetency,
        ]}
        loading={false}
      />,
    );
    expect(container.textContent).toContain('X');
    expect(container.textContent).toContain('2.0 → 1.0');
  });
});

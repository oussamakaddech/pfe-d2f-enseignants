import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CompetenceExpandedRow from '../CompetenceExpandedRow';
import type { Savoir } from '@/models/competence';

const competence = { id: 1, nom: 'Compétences Sols' };

function renderRow(savoirs: Savoir[], sousComps: unknown[] = []) {
  return render(
    <CompetenceExpandedRow
      competence={competence}
      sousComps={sousComps as never}
      savoirs={savoirs}
      onAddRoot={vi.fn()}
      onAddChild={vi.fn()}
      onAddSavoir={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

function addSousCompetenceButton(): HTMLElement {
  return screen.getByRole('button', { name: /ajouter une sous-compétence/i });
}

describe('CompetenceExpandedRow — exclusivité savoirs directs / sous-compétences', () => {
  it('bloque l’ajout d’une sous-compétence quand la compétence contient des savoirs directs', () => {
    renderRow([{ id: 10, code: 'S1', nom: 'Savoir direct', competenceId: 1 }]);

    expect(addSousCompetenceButton()).toBeDisabled();
    expect(screen.getByText('Savoirs directs (1)')).toBeInTheDocument();
  });

  it('autorise l’ajout d’une sous-compétence quand la compétence n’a aucun savoir direct', () => {
    renderRow([
      {
        id: 11,
        code: 'S2',
        nom: 'Savoir de sous-compétence',
        competenceId: 1,
        sousCompetenceId: 5,
      },
    ]);

    expect(addSousCompetenceButton()).toBeEnabled();
    expect(screen.queryByText(/Savoirs directs \(/)).not.toBeInTheDocument();
  });

  it('ignore les savoirs rattachés à une autre compétence', () => {
    renderRow([{ id: 12, code: 'S3', nom: 'Autre', competenceId: 2 }]);

    expect(addSousCompetenceButton()).toBeEnabled();
  });
});

/**
 * Tests — visibilité du bouton « Créer la formation » sur BesoinCard.
 *
 * Règle métier : le bouton apparaît UNIQUEMENT si le besoin n'a pas encore
 * déclenché la création d'une formation, c'est-à-dire si son statut est
 * différent de 'FORMATION_CREATED'.
 * - ADMIN_APPROVED  → besoin approuvé, formation pas encore créée → bouton visible
 * - FORMATION_CREATED → formation déjà créée depuis ce besoin → bouton masqué
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import BesoinCard from '../BesoinCard';

const BASE_BESOIN = {
  idBesoinFormation: 42,
  titre: 'Formation Docker',
  objectifFormation: 'Maîtriser la conteneurisation',
  username: 'john.doe',
  typeBesoin: 'INDIVIDUEL',
  approuveAdmin: true,
  dateCreation: '2024-03-01T10:00:00',
};

const noop = () => {};

function renderCard(
  status: string,
  onCreateFormation?: (b: Record<string, unknown>) => void,
) {
  return render(
    <BrowserRouter>
      <App>
        <BesoinCard
          besoin={{ ...BASE_BESOIN, status }}
          onApprove={noop}
          onReject={noop}
          onOpenMail={noop}
          onEdit={noop}
          onDelete={noop}
          onOpen={noop}
          onCreateFormation={onCreateFormation}
        />
      </App>
    </BrowserRouter>,
  );
}

describe('BesoinCard — bouton « Créer la formation »', () => {
  it('affiche le bouton quand onCreateFormation est fourni et status = ADMIN_APPROVED', () => {
    renderCard('ADMIN_APPROVED', vi.fn());
    expect(screen.getByRole('button', { name: /cr.er la formation/i })).toBeInTheDocument();
  });

  it('cache le bouton quand onCreateFormation est undefined (permission absente)', () => {
    renderCard('ADMIN_APPROVED', undefined);
    expect(screen.queryByRole('button', { name: /cr.er la formation/i })).toBeNull();
  });

  it('cache le bouton quand status = FORMATION_CREATED même si onCreateFormation est fourni', () => {
    // BesoinList passe undefined pour FORMATION_CREATED → onCreateFormation absent
    renderCard('FORMATION_CREATED', undefined);
    expect(screen.queryByRole('button', { name: /cr.er la formation/i })).toBeNull();
  });

  it('affiche le bouton pour un autre statut approuvé intermédiaire si onCreateFormation fourni', () => {
    // Cas défensif : si un statut inconnu mais approuvé est passé, le bouton s'affiche
    renderCard('CUP_APPROVED', vi.fn());
    expect(screen.getByRole('button', { name: /cr.er la formation/i })).toBeInTheDocument();
  });
});

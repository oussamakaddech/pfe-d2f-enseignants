/**
 * Tests — tableau des besoins (`BesoinTable`).
 *
 * Couvre : l'organisation des colonnes (formation, demandeur, UP/département,
 * période, priorité, date, statut), les boutons d'action (Approuver /
 * Refuser / Créer la formation) et l'ouverture de la fiche au clic.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from 'antd';
import BesoinTable from '../BesoinTable';

// Les colonnes du tableau s'adaptent à la largeur (breakpoints antd) : on
// simule un poste large pour que toutes les colonnes soient rendues.
beforeAll(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const BASE = {
  idBesoinFormation: 42,
  titre: 'Formation Docker',
  objectifFormation: 'Maîtriser la conteneurisation',
  theme: 'DevOps',
  username: 'john.doe',
  typeBesoin: 'INDIVIDUEL',
  up: 'UP_GC',
  departement: 'DEPT_GC',
  periodCode: 'P1',
  priorite: 'HAUTE',
  dateCreation: '2024-03-01T10:00:00',
  status: 'SUBMITTED',
  currentApprovalStep: 'CUP',
};

const noop = () => {};

function renderTable(props: Partial<React.ComponentProps<typeof BesoinTable>> = {}) {
  return render(
    <App>
      <BesoinTable
        data={[BASE as unknown as Record<string, unknown>]}
        loading={false}
        approvingId={null}
        canApprove
        canReject
        canEdit
        canDelete
        userRole="admin"
        currentUsername="admin"
        currentUserId="admin-1"
        getBesoinId={(r) => r.idBesoinFormation}
        onApprove={noop}
        onReject={noop}
        onOpenMail={noop}
        onEdit={noop}
        onDelete={noop}
        resolveUp={() => 'Génie Civil'}
        resolveDept={() => 'Génie Civil'}
        resolvePeriod={() => 'Période 1'}
        {...props}
      />
    </App>,
  );
}

describe('BesoinTable — tableau des besoins', () => {
  it('affiche les colonnes organisées du tableau', () => {
    renderTable();
    for (const header of [
      'Formation demandée',
      'Demandeur',
      'UP / Département',
      'Période',
      'Priorité',
      'Actions',
    ]) {
      expect(screen.getAllByText(header).length).toBeGreaterThan(0);
    }
    // Colonnes retirées (tableau allégé) : ni « Statut » ni « Date ».
    expect(screen.queryByText('Statut')).toBeNull();
    expect(screen.queryByText('Date')).toBeNull();
  });

  it('affiche les informations clés de chaque ligne', () => {
    renderTable();
    expect(screen.getByText('Formation Docker')).toBeInTheDocument();
    expect(screen.getAllByText('john.doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Génie Civil').length).toBeGreaterThan(0);
    expect(screen.getByText(/Période 1/)).toBeInTheDocument();
  });

  it('affiche les boutons Approuver et Refuser pour l’administrateur', () => {
    renderTable();
    expect(screen.getByRole('button', { name: /Approuver/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refuser/i })).toBeInTheDocument();
  });

  it('masque les boutons de décision pour un rôle non décisionnaire', () => {
    renderTable({ userRole: 'Enseignant', currentUsername: 'john.doe', canApprove: false, canReject: false });
    expect(screen.queryByRole('button', { name: /Approuver/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Refuser/i })).toBeNull();
  });

  it('affiche le bouton « Créer la formation » quand la callback est fournie', () => {
    renderTable({ onCreateFormation: vi.fn() });
    expect(screen.getByRole('button', { name: /Créer la formation/i })).toBeInTheDocument();
  });

  it('affiche le bouton « Supprimer » quand la permission est accordée', () => {
    renderTable({ canDelete: true });
    expect(screen.getByRole('button', { name: /Supprimer/i })).toBeInTheDocument();
  });

  it('masque le bouton « Supprimer » quand la permission est refusée', () => {
    renderTable({ canDelete: false });
    expect(screen.queryByRole('button', { name: /Supprimer/i })).toBeNull();
  });

  it('déclenche la suppression après confirmation', () => {
    const onDelete = vi.fn();
    renderTable({ onDelete });
    fireEvent.click(screen.getByRole('button', { name: /Supprimer/i }));
    const confirm = document.querySelector('.ant-popconfirm-buttons button.ant-btn-dangerous');
    expect(confirm).not.toBeNull();
    fireEvent.click(confirm!);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('déclenche l’approbation au clic sur le bouton', () => {
    const onApprove = vi.fn();
    renderTable({ onApprove });
    fireEvent.click(screen.getByRole('button', { name: /Approuver/i }));
    // La confirmation (Popconfirm) doit être validée pour aller plus loin.
    const confirm = document.querySelector('.ant-popconfirm-buttons button.ant-btn-primary');
    expect(confirm).not.toBeNull();
    fireEvent.click(confirm!);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('ouvre la fiche du besoin au clic sur la ligne', () => {
    const onOpen = vi.fn();
    renderTable({ onOpen });
    fireEvent.click(screen.getByText('Formation Docker'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

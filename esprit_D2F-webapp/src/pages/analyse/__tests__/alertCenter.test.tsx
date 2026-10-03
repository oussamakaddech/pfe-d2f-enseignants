import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import AlertCenter from '@/components/analytics/AlertCenter';
import type { AlertEvent } from '@/models/analyse/analyticsFeature';

const alert: AlertEvent = {
  id: 1,
  type_alerte: 'GAP_CRITIQUE',
  cible_type: 'INDIVIDUEL',
  enseignant_id: 'T1',
  departement_id: null,
  competence_id: null,
  severite: 'CRITICAL',
  titre: 'Alerte critique',
  message: 'Un gap critique détecté',
  statut: 'NOUVELLE',
  created_at: '2024-01-01T10:00:00Z',
};

const warningAlert: AlertEvent = {
  id: 2,
  type_alerte: 'STAGNATION',
  cible_type: 'INDIVIDUEL',
  enseignant_id: 'T2',
  departement_id: null,
  competence_id: null,
  severite: 'WARNING',
  titre: 'Alerte stagnation',
  message: 'Enseignant en stagnation',
  statut: 'NOUVELLE',
  created_at: '2024-01-02T10:00:00Z',
};

describe('AlertCenter', () => {
  it('affiche un message vide sans alertes', () => {
    render(<AlertCenter alerts={[]} />);
    expect(screen.getByText(/Aucune alerte/i)).toBeInTheDocument();
  });

  it("affiche le titre et le message de l'alerte", () => {
    render(<AlertCenter alerts={[alert]} />);
    expect(screen.getByText('Alerte critique')).toBeInTheDocument();
    expect(screen.getByText(/Un gap critique détecté/)).toBeInTheDocument();
  });

  it('propose les actions de cycle de vie pour une alerte ouverte', () => {
    const onUpdate = vi.fn();
    render(<AlertCenter alerts={[alert]} onUpdate={onUpdate} />);
    const items = document.querySelector('.ac-group__items');
    expect(items).not.toBeNull();
    const primary = within(items as HTMLElement)
      .getAllByRole('button')
      .find((b) => (b as HTMLButtonElement).classList.contains('ant-btn-primary'));
    expect(primary).toBeDefined();
    primary!.click();
    expect(onUpdate).toHaveBeenCalledWith(1, { statut: 'TRAITEE' });
  });

  it('trie les critiques avant les warnings (même groupe ou non)', () => {
    // Ordre d'entrée inverse : le tri doit remettre la critique en premier.
    render(<AlertCenter alerts={[warningAlert, alert]} />);
    const titles = Array.from(document.querySelectorAll('.ac-item__link, .ac-item__title')).map(
      (e) => e.textContent,
    );
    const critPos = titles.findIndex((t) => t?.includes('Alerte critique'));
    const warnPos = titles.findIndex((t) => t?.includes('Alerte stagnation'));
    expect(critPos).toBeGreaterThanOrEqual(0);
    expect(warnPos).toBeGreaterThanOrEqual(0);
    expect(critPos).toBeLessThan(warnPos);
  });

  it('filtre par recherche texte (enseignant)', () => {
    render(<AlertCenter alerts={[alert, warningAlert]} />);
    fireEvent.change(screen.getByPlaceholderText(/Rechercher/), {
      target: { value: 'T2' },
    });
    expect(screen.queryByText('Alerte critique')).not.toBeInTheDocument();
    expect(screen.getByText('Alerte stagnation')).toBeInTheDocument();
  });

  it('la pastille critiques ne garde que les critiques', () => {
    render(<AlertCenter alerts={[alert, warningAlert]} />);
    fireEvent.click(screen.getByText(/1 critiques/));
    expect(screen.getByText('Alerte critique')).toBeInTheDocument();
    expect(screen.queryByText('Alerte stagnation')).not.toBeInTheDocument();
  });

  it('remonte le bucket de sévérité au backend', () => {
    const onServerFilterChange = vi.fn();
    render(<AlertCenter alerts={[alert, warningAlert]} onServerFilterChange={onServerFilterChange} />);
    fireEvent.click(screen.getByText(/1 critiques/));
    expect(onServerFilterChange).toHaveBeenLastCalledWith({ severity_bucket: 'CRITICAL' });
  });

  it('la réinitialisation vide les filtres serveur', () => {
    const onServerFilterChange = vi.fn();
    render(<AlertCenter alerts={[alert, warningAlert]} onServerFilterChange={onServerFilterChange} />);
    fireEvent.click(screen.getByText(/1 critiques/));
    fireEvent.click(screen.getByText('Réinitialiser'));
    expect(onServerFilterChange).toHaveBeenLastCalledWith({});
  });
});

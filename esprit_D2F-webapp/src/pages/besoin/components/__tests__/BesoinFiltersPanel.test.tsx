/**
 * Tests — panneau de filtres des besoins.
 *
 * Vérifie la présence des filtres métier (Statut, Priorité, Période, Type,
 * UP, Département) et de la plage de dates, la remontée du filtre « Période »
 * et l'affichage des pastilles de filtres actifs.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from 'antd';
import BesoinFiltersPanel from '../BesoinFiltersPanel';

const noop = () => {};

function renderPanel(filters: Record<string, unknown> = {}) {
  const onFiltersChange = vi.fn();
  const utils = render(
    <App>
      <BesoinFiltersPanel
        searchText=""
        filters={filters}
        ups={[{ id: 'UP_GC', name: 'Génie Civil' }]}
        departements={[{ id: 'DEPT_GC', name: 'Génie Civil' }]}
        onSearchChange={noop}
        onFiltersChange={onFiltersChange}
        onReset={noop}
      />
    </App>,
  );
  return { ...utils, onFiltersChange };
}

describe('BesoinFiltersPanel — filtres', () => {
  it('affiche les filtres Statut, Priorité, Période, UP et Département', () => {
    renderPanel();
    expect(screen.getByText('Statut')).toBeInTheDocument();
    expect(screen.getByText('Priorité')).toBeInTheDocument();
    expect(screen.getByText('Période')).toBeInTheDocument();
    expect(screen.getByText('Unité Pédagogique')).toBeInTheDocument();
    expect(screen.getByText('Département')).toBeInTheDocument();
  });

  it('n’expose plus de filtre « Type »', () => {
    renderPanel();
    expect(screen.queryByText('Type')).toBeNull();
  });

  it('affiche la plage de dates (début / fin)', () => {
    renderPanel();
    expect(screen.getByPlaceholderText('Date début')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Date fin')).toBeInTheDocument();
  });

  it('remonte la période sélectionnée', () => {
    const { onFiltersChange } = renderPanel();
    const selects = document.querySelectorAll('.bf-filters__secondary .ant-select');
    const periodSelect = selects[2]; // Statut, Priorité, Période
    fireEvent.mouseDown(periodSelect.querySelector('.ant-select-selector')!);
    const option = [...document.querySelectorAll('.ant-select-item-option')].find((o) =>
      o.textContent?.includes("Session d'Hiver"),
    );
    expect(option).toBeTruthy();
    fireEvent.click(option!);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ periodCode: 'WINTER' }),
    );
  });

  it('affiche la pastille du filtre Période actif', () => {
    renderPanel({ periodCode: 'WINTER' });
    expect(screen.getByText(/Période : Session d'Hiver/)).toBeInTheDocument();
  });
});

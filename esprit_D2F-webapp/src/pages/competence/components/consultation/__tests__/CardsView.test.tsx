import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardsView from '../CardsView';
import { buildFlatSavoirs, type FlatSavoir } from '@/utils/helpers/consultationViewUtils';

const domaines = [{ id: 1, code: 'GC', nom: 'Génie Civil' }];

const competences = [
  { id: 10, code: 'GC-TECH', nom: 'Techniques GC', domaineId: 1 },
  { id: 11, code: 'GC-ORG', nom: 'Organisation', domaineId: 1 },
];

const sousComps = [
  { id: 50, code: 'S1', nom: 'Sols', competenceId: 10, parentId: null },
  { id: 51, code: 'S2', nom: 'Fondations', competenceId: 10, parentId: null },
  // Sous-compétence sans aucun savoir : doit être signalée en pied de carte.
  { id: 52, code: 'S3', nom: 'Vide', competenceId: 10, parentId: null },
];

const savoirs = [
  {
    id: 100,
    code: 'S1-01',
    nom: 'Analyse granulométrique',
    type: 'THEORIQUE',
    niveau: 'N2',
    sousCompetenceId: 50,
  },
  {
    id: 101,
    code: 'S1-02',
    nom: 'Compactage',
    type: 'PRATIQUE',
    niveau: 'N3',
    sousCompetenceId: 50,
  },
  { id: 102, code: 'S2-01', nom: 'Pieux', type: 'PRATIQUE', niveau: 'N4', sousCompetenceId: 51 },
  { id: 103, code: 'ORG-01', nom: 'Béton armé', type: 'THEORIQUE', niveau: 'N1', competenceId: 11 },
];

const crud = { competences, sousComps, domaines };
const flatSavoirs = buildFlatSavoirs({
  domaines,
  competences,
  sousComps,
  savoirs,
}) as unknown as FlatSavoir[];

function renderView(overrides: Record<string, unknown> = {}) {
  return render(
    <CardsView
      crud={crud}
      selectedDomaine={null}
      allowedCompetenceIds={null}
      flatSavoirs={flatSavoirs}
      onOpenSavoir={vi.fn()}
      openAll={false}
      onOpenAllConsumed={vi.fn()}
      {...overrides}
    />,
  );
}

/** Titres des cartes de compétence (accordéons), hors barre latérale. */
function accTitles(): string[] {
  return Array.from(document.querySelectorAll('.ctp-acc-title')).map((el) => el.textContent ?? '');
}

/** En-tête (bouton) de la carte d'une compétence. */
function accHeader(title: string): HTMLElement {
  const header = Array.from(document.querySelectorAll('.ctp-acc-header')).find((btn) =>
    (btn.textContent ?? '').includes(title),
  );
  if (!header) throw new Error(`En-tête introuvable pour « ${title} »`);
  return header as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
});

describe('CardsView — affichage des sous-compétences', () => {
  it('groupe les savoirs par sous-compétence avec un en-tête dédié', () => {
    renderView();

    expect(accTitles()).toContain('Techniques GC');
    // Une pastille « N sous-comp. » dans l'en-tête de la compétence.
    expect(screen.getByText('3 sous-comp.')).toBeInTheDocument();
    // Un en-tête de groupe par sous-compétence porteuse de savoirs.
    expect(screen.getByText('Sols')).toBeInTheDocument();
    expect(screen.getByText('Fondations')).toBeInTheDocument();
    expect(screen.getAllByText('Sous-competence')).toHaveLength(2);
  });

  it('signale les sous-compétences sans savoir', () => {
    renderView();

    expect(screen.getByText(/Sous-competences sans savoir \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Vide')).toBeInTheDocument();
  });

  it('distingue les savoirs directs des savoirs de sous-compétence', () => {
    renderView();

    // La 2e compétence est repliée par défaut : on l'ouvre.
    fireEvent.click(accHeader('Organisation'));

    expect(accTitles()).toContain('Organisation');
    expect(screen.getByText('Savoirs directs')).toBeInTheDocument();
    expect(screen.getAllByText('Direct').length).toBeGreaterThan(0);
    expect(screen.getByText('direct')).toBeInTheDocument();
    expect(screen.getByText('Béton armé')).toBeInTheDocument();
  });
});

describe('CardsView — filtres', () => {
  it('restreint les compétences au périmètre UP / département', () => {
    renderView({ allowedCompetenceIds: new Set(['999']) });

    expect(accTitles()).toHaveLength(0);
    expect(screen.getByText('Aucune competence')).toBeInTheDocument();
  });

  it('conserve les compétences autorisées', () => {
    renderView({ allowedCompetenceIds: new Set(['10', '11']) });

    expect(accTitles()).toEqual(['Techniques GC', 'Organisation']);
  });

  it('filtre par recherche (debounce)', async () => {
    vi.useFakeTimers();
    try {
      renderView();
      const search = screen.getByPlaceholderText(/Rechercher un savoir/i);

      fireEvent.change(search, { target: { value: 'Pieux' } });
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(screen.getByText('Pieux')).toBeInTheDocument();
      // Le groupe « Sols » n'a plus aucun savoir correspondant : il disparaît.
      expect(screen.queryByText('Sols')).not.toBeInTheDocument();
      expect(screen.queryByText('Analyse granulométrique')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('filtre par type de savoir', () => {
    renderView();

    const select = screen.getByText('Tous les types').closest('.ant-select') as HTMLElement;
    expect(select).not.toBeNull();
    fireEvent.mouseDown(within(select).getByRole('combobox'));

    const dropdown = document.querySelector('.ant-select-dropdown') as HTMLElement;
    expect(dropdown).not.toBeNull();
    fireEvent.click(within(dropdown).getByText('Pratique'));

    expect(screen.getByText('Compactage')).toBeInTheDocument();
    expect(screen.queryByText('Analyse granulométrique')).not.toBeInTheDocument();
  });
});

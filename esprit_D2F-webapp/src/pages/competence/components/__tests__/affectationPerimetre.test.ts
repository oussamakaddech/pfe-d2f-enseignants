import { describe, expect, it } from 'vitest';
import {
  NO_SCOPE_ID,
  allowedEnseignantIds,
  filterByAllowedIds,
  isPerimetreVide,
  perimetreLabel,
} from '../affectationPerimetre';
import type { AffectationPerimetre } from '@/models/competence';

const adminPerimetre: AffectationPerimetre = { global: true, enseignantIds: [] };
const cupPerimetre: AffectationPerimetre = {
  global: false,
  upId: 'UP_GC',
  deptId: null,
  enseignantIds: ['E00011', 'E00012'],
};
const chefPerimetre: AffectationPerimetre = {
  global: false,
  upId: null,
  deptId: 'DEPT_RT',
  enseignantIds: ['E00012'],
};

describe('allowedEnseignantIds', () => {
  it('null pour un administrateur (aucun filtrage)', () => {
    expect(allowedEnseignantIds(adminPerimetre)).toBeNull();
  });

  it("null quand le périmètre n'est pas chargé", () => {
    expect(allowedEnseignantIds(null)).toBeNull();
    expect(allowedEnseignantIds(undefined)).toBeNull();
  });

  it('ensemble des identifiants du périmètre CUP', () => {
    expect(allowedEnseignantIds(cupPerimetre)).toEqual(new Set(['E00011', 'E00012']));
  });

  it('périmètre restreint sans enseignant → ensemble vide', () => {
    expect(allowedEnseignantIds({ global: false, enseignantIds: [] })).toEqual(new Set());
  });
});

describe('isPerimetreVide', () => {
  it('faux pour un administrateur', () => {
    expect(isPerimetreVide(adminPerimetre)).toBe(false);
  });

  it('faux quand le périmètre contient des enseignants', () => {
    expect(isPerimetreVide(cupPerimetre)).toBe(false);
    expect(isPerimetreVide(chefPerimetre)).toBe(false);
  });

  it('vrai quand le périmètre restreint est vide', () => {
    expect(isPerimetreVide({ global: false, upId: 'UP_GC', enseignantIds: [] })).toBe(true);
  });
});

describe('filterByAllowedIds', () => {
  const enseignants = [
    { id: 'E00011', nom: 'Alpha' },
    { id: 'E00007', nom: 'Beta' },
    { id: 12, nom: 'Gamma' },
  ];

  it('liste intacte sans filtrage (admin)', () => {
    expect(filterByAllowedIds(enseignants, null, (e) => e.id)).toHaveLength(3);
  });

  it('ne garde que les enseignants du périmètre (ids hétérogènes)', () => {
    const allowed = new Set(['E00011', '12']);
    const filtered = filterByAllowedIds(enseignants, allowed, (e) => e.id);
    expect(filtered.map((e) => e.nom)).toEqual(['Alpha', 'Gamma']);
  });

  it('filtre des affectations par enseignantId', () => {
    const affectations = [
      { id: 1, enseignantId: 'E00011' },
      { id: 2, enseignantId: 'E00007' },
    ];
    const filtered = filterByAllowedIds(affectations, new Set(['E00011']), (a) => a.enseignantId);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.id).toBe(1);
  });

  it('ignore les éléments sans identifiant', () => {
    const items = [{ id: undefined }, { id: 'E00011' }];
    const filtered = filterByAllowedIds(items, new Set(['E00011']), (i) => i.id);
    expect(filtered).toHaveLength(1);
  });
});

describe('perimetreLabel', () => {
  it("null pour un administrateur (aucune restriction à afficher)", () => {
    expect(perimetreLabel(adminPerimetre)).toBeNull();
    expect(perimetreLabel(null)).toBeNull();
  });

  it("libellé de l'UP pour un CUP", () => {
    expect(perimetreLabel(cupPerimetre)).toBe("l'UP UP_GC");
  });

  it('libellé du département pour un chef', () => {
    expect(perimetreLabel(chefPerimetre)).toBe('le département DEPT_RT');
  });

  it('cumul CUP + chef : les deux périmètres', () => {
    expect(perimetreLabel({ global: false, upId: 'UP_GC', deptId: 'DEPT_RT' })).toBe(
      "l'UP UP_GC et le département DEPT_RT",
    );
  });

  it('null quand le périmètre est indéterminé (sentinelle)', () => {
    expect(perimetreLabel({ global: false, upId: NO_SCOPE_ID, enseignantIds: [] })).toBeNull();
  });
});

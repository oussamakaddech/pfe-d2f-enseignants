import { describe, it, expect } from 'vitest';
import {
  ACCENT,
  COMP_PALETTE,
  DISPLAY_MODE_KEY,
  OPEN_COMPS_KEY,
  ACTIVE_COMP_KEY,
  toNiveauRank,
  formatNiveau,
  getNiveauStyle,
  getTypeLabel,
  getTypeBadge,
  buildFlatSavoirs,
  getFilteredCrud,
  hasAnyActiveFilters,
  buildFilterChips,
} from './consultationViewUtils';

describe('consultationViewUtils', () => {
  it('exposes constants', () => {
    expect(ACCENT.domaine.color).toBe('#2563eb');
    expect(COMP_PALETTE.length).toBeGreaterThan(0);
    expect(DISPLAY_MODE_KEY).toBe('ctp-display-mode-v2');
    expect(OPEN_COMPS_KEY).toBe('ctp-open-comps');
    expect(ACTIVE_COMP_KEY).toBe('ctp-active-comp');
  });

  describe('toNiveauRank', () => {
    it('returns 999 for null', () => {
      expect(toNiveauRank(null)).toBe(999);
      expect(toNiveauRank(undefined)).toBe(999);
    });
    it('extracts first number', () => {
      expect(toNiveauRank('N3_INTERMEDIAIRE')).toBe(3);
      expect(toNiveauRank(5)).toBe(5);
    });
    it('returns 999 when no number found', () => {
      expect(toNiveauRank('abc')).toBe(999);
    });
  });

  describe('formatNiveau', () => {
    it('maps known values to labels', () => {
      expect(formatNiveau('N1_DEBUTANT')).toBe('N1 – Débutant');
    });
    it('falls back to Niveau X', () => {
      expect(formatNiveau('X')).toBe('Niveau X');
    });
    it('returns dash for empty', () => {
      expect(formatNiveau('')).toBe('-');
      expect(formatNiveau(null)).toBe('-');
    });
  });

  describe('getNiveauStyle', () => {
    it('returns a style for known ranks', () => {
      expect(getNiveauStyle('N1_DEBUTANT')).toEqual({ color: '#9a3412', bg: '#ffedd5', border: '#fdba74' });
    });
    it('returns default style for unknown', () => {
      expect(getNiveauStyle('abc')).toEqual({ color: '#334155', bg: '#e2e8f0', border: '#cbd5e1' });
    });
  });

  describe('getTypeLabel / getTypeBadge', () => {
    it('maps THEORIQUE / PRATIQUE', () => {
      expect(getTypeLabel('THEORIQUE')).toBe('theorique');
      expect(getTypeLabel('PRATIQUE')).toBe('pratique');
      expect(getTypeLabel('OTHER')).toBe('-');
      expect(getTypeBadge('THEORIQUE')).toBe('theorique');
      expect(getTypeBadge('PRATIQUE')).toBe('pratique');
      expect(getTypeBadge('X')).toBe('pratique');
    });
  });

  describe('buildFlatSavoirs', () => {
    it('returns empty array for empty crud', () => {
      expect(buildFlatSavoirs({})).toEqual([]);
    });
    it('resolves savoir via sous-competence chain', () => {
      const result = buildFlatSavoirs({
        domaines: [{ id: 1, code: 'D1', nom: 'Dom' }],
        competences: [{ id: 10, domaineId: 1, code: 'C1', nom: 'Comp' }],
        sousComps: [{ id: 100, competenceId: 10, nom: 'SC' }],
        savoirs: [{ id: 1000, code: 'S1', nom: 'Sav', type: 'THEORIQUE', niveau: 'N1', sousCompetenceId: 100 }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].sousCompetenceNom).toBe('SC');
      expect(result[0].competenceNom).toBe('Comp');
      expect(result[0].domaineNom).toBe('Dom');
      expect(result[0].isDirect).toBe(false);
    });
    it('handles direct competence savoirs', () => {
      const result = buildFlatSavoirs({
        domaines: [{ id: 1, code: 'D1', nom: 'Dom' }],
        competences: [{ id: 10, domaineId: 1, code: 'C1', nom: 'Comp' }],
        sousComps: [],
        savoirs: [{ id: 1000, code: 'S1', nom: 'Sav', type: 'PRATIQUE', niveau: 'N2', competenceId: 10 }],
      });
      expect(result[0].isDirect).toBe(true);
      expect(result[0].competenceNom).toBe('Comp');
    });
    it('uses fallback names when unresolved', () => {
      const result = buildFlatSavoirs({
        savoirs: [{ id: 1, nom: 'Orphan' }],
      });
      expect(result[0].competenceNom).toBe('Sans competence');
      expect(result[0].domaineNom).toBe('Sans domaine');
      expect(result[0].code).toBe('-');
    });
  });

  describe('getFilteredCrud', () => {
    const crud = {
      domaines: [{ id: 1 }, { id: 2 }],
      competences: [{ id: 10, domaineId: 1 }, { id: 20, domaineId: 2 }],
      sousComps: [{ id: 100, competenceId: 10 }],
      savoirs: [{ id: 1000, sousCompetenceId: 100 }, { id: 1001, competenceId: 10 }],
    };
    it('returns all data when no domaineId', () => {
      expect(getFilteredCrud(crud, null)).toEqual(crud);
    });
    it('filters by domaineId', () => {
      const res = getFilteredCrud(crud, 1);
      expect(res.domaines).toEqual([{ id: 1 }]);
      expect(res.competences).toEqual([{ id: 10, domaineId: 1 }]);
      expect(res.sousComps).toEqual([{ id: 100, competenceId: 10 }]);
      expect(res.savoirs).toHaveLength(2);
    });
    it('excludes savoirs of other domaines', () => {
      const res = getFilteredCrud(crud, 2);
      expect(res.savoirs).toEqual([]);
    });
  });

  describe('hasAnyActiveFilters', () => {
    it('returns false for null filters', () => {
      expect(hasAnyActiveFilters(null, '')).toBe(false);
    });
    it('detects active query', () => {
      expect(hasAnyActiveFilters({ q: '', type: 'ALL', niveau: 'ALL' }, 'search')).toBe(true);
    });
    it('detects active type/niveau', () => {
      expect(hasAnyActiveFilters({ q: '', type: 'THEORIQUE', niveau: 'ALL' }, '')).toBe(true);
      expect(hasAnyActiveFilters({ q: '', type: 'ALL', niveau: 'N1' }, '')).toBe(true);
    });
    it('returns false when everything is default', () => {
      expect(hasAnyActiveFilters({ q: '', type: 'ALL', niveau: 'ALL' }, '')).toBe(false);
    });
  });

  describe('buildFilterChips', () => {
    it('returns empty array for null', () => {
      expect(buildFilterChips(null)).toEqual([]);
    });
    it('builds chips for active filters', () => {
      const chips = buildFilterChips({ q: 'react', type: 'THEORIQUE', niveau: 'N1_DEBUTANT' });
      expect(chips.map((c) => c.key)).toEqual(['type', 'niveau', 'q']);
      expect(chips[0].label).toBe('Theorique');
      expect(chips[2].label).toBe('"react"');
    });
    it('returns empty when all default', () => {
      expect(buildFilterChips({ q: '', type: 'ALL', niveau: 'ALL' })).toEqual([]);
    });
  });
});

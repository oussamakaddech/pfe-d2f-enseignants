import { describe, it, expect } from 'vitest';
import { resolvePeriodLabel, resolveStructureLabel } from '../FicheFormation';

describe('resolvePeriodLabel', () => {
  it('mappe tous les codes backend (dont SPRINT/WORKSHOP)', () => {
    expect(resolvePeriodLabel('P1')).toBe('Période 1');
    expect(resolvePeriodLabel('P2')).toBe('Période 2');
    expect(resolvePeriodLabel('WINTER')).toBe("Session d'Hiver");
    expect(resolvePeriodLabel('SUMMER')).toBe("Session d'Été");
    expect(resolvePeriodLabel('SPRINT')).toBe('Sprint');
    expect(resolvePeriodLabel('WORKSHOP')).toBe('Atelier');
  });

  it('OTHER utilise le libellé personnalisé ou Autre', () => {
    expect(resolvePeriodLabel('OTHER', 'Sprint Ramadan')).toBe('Sprint Ramadan');
    expect(resolvePeriodLabel('OTHER')).toBe('Autre');
  });

  it("replit sur l'ancien champ puis le tiret", () => {
    expect(resolvePeriodLabel('UNKNOWN', undefined, 'Trimestre 2')).toBe('Trimestre 2');
    expect(resolvePeriodLabel(undefined)).toBe('—');
  });
});

describe('resolveStructureLabel', () => {
  it('préfère la variante listes (up1/departement1)', () => {
    expect(
      resolveStructureLabel(
        { libelle: 'Listes' },
        { libelle: 'Détail' },
      ),
    ).toBe('Listes');
  });

  it('replit sur la variante détail (up/departement)', () => {
    expect(resolveStructureLabel(undefined, { libelle: 'Détail' })).toBe('Détail');
    expect(resolveStructureLabel(null, { nom: 'Nom' })).toBe('Nom');
  });

  it('tiret quand rien', () => {
    expect(resolveStructureLabel(undefined, undefined)).toBe('—');
    expect(resolveStructureLabel({}, {})).toBe('—');
  });
});

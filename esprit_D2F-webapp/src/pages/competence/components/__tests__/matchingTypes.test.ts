import { describe, expect, it } from 'vitest';
import { dataSignature, shouldHydrateData } from '../matchingTypes';

describe('shouldHydrateData (garde anti-boucle #185)', () => {
  const savoirs = [{ id: 1 }];
  const enseignants = [{ id: 'e1' }];

  it('hydrate au premier chargement non vide', () => {
    expect(shouldHydrateData('', savoirs, [])).toBe(true);
    expect(shouldHydrateData('', [], enseignants)).toBe(true);
  });

  it('ignore les données vides', () => {
    expect(shouldHydrateData('', [], [])).toBe(false);
    expect(shouldHydrateData('', undefined, undefined)).toBe(false);
  });

  it('ignore le même contenu même avec de nouvelles références (idempotent)', () => {
    const sig = `${dataSignature(savoirs)}|${dataSignature(enseignants)}`;
    // Copies profondes : contenu identique, identités différentes.
    const savoirsCopie = [{ id: 1 }];
    const enseignantsCopie = [{ id: 'e1' }];
    expect(savoirsCopie).not.toBe(savoirs);
    expect(shouldHydrateData(sig, savoirsCopie, enseignantsCopie)).toBe(false);
  });

  it('hydrate quand le contenu change (refetch explicite)', () => {
    const sig = `${dataSignature(savoirs)}|${dataSignature(enseignants)}`;
    expect(shouldHydrateData(sig, [{ id: 2 }], enseignants)).toBe(true);
    expect(shouldHydrateData(sig, savoirs, [{ id: 'e2' }])).toBe(true);
  });
});

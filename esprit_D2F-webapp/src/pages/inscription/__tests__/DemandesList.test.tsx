import { describe, it, expect } from 'vitest';
import { normalizeDemandes } from '../DemandesList';

describe('normalizeDemandes', () => {
  it('remplace un enseignant null par un objet vide (pas de crash .prenom)', () => {
    const rows = normalizeDemandes([
      { id: 1, etat: 'PENDING', dateDemande: '2026-01-01', enseignant: null },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].enseignant).toEqual({});
    // Lecture sûre comme dans le rendu :
    expect(`${rows[0].enseignant.prenom ?? ''} ${rows[0].enseignant.nom ?? ''}`.trim()).toBe(
      '',
    );
  });

  it('accepte le format Page {content} et garde les enseignants présents', () => {
    const rows = normalizeDemandes({
      content: [
        {
          id: 2,
          etat: 'APPROVED',
          dateDemande: '2026-01-02',
          enseignant: { prenom: 'Amira', nom: 'Haddad' },
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].enseignant.prenom).toBe('Amira');
  });

  it('tableau vide pour données inconnues', () => {
    expect(normalizeDemandes(undefined)).toEqual([]);
    expect(normalizeDemandes({})).toEqual([]);
  });
});

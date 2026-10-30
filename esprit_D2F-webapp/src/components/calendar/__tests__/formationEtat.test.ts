import { describe, expect, it } from 'vitest';
import {
  ETAT_FORMATION_AFFICHAGES,
  ETAT_FORMATION_OPTIONS,
  etatFormationAffichage,
} from '../formationEtat';

describe('formationEtat', () => {
  it('affiche un libellé lisible pour chaque état du serveur', () => {
    expect(etatFormationAffichage('ACHEVE')).toEqual({
      value: 'ACHEVE',
      label: 'Achevée',
      color: 'green',
    });
    expect(etatFormationAffichage('PLANIFIE').label).toBe('Planifiée');
    expect(etatFormationAffichage('EN_COURS').label).toBe('En cours');
    expect(etatFormationAffichage('ANNULE').label).toBe('Annulée');
  });

  it('couvre tous les états de l’énumération EtatFormation', () => {
    expect(ETAT_FORMATION_AFFICHAGES.map((e) => e.value)).toEqual([
      'NOUVEAU',
      'ENREGISTRE',
      'PLANIFIE',
      'VISIBLE',
      'EN_COURS',
      'ACHEVE',
      'ANNULE',
    ]);
  });

  it('n’affiche jamais la valeur brute pour un état connu', () => {
    for (const etat of ETAT_FORMATION_AFFICHAGES) {
      expect(etatFormationAffichage(etat.value).label).not.toBe(etat.value);
    }
  });

  it('garde la valeur brute d’un état inconnu au lieu de la masquer', () => {
    expect(etatFormationAffichage('ARCHIVE')).toEqual({
      value: 'ARCHIVE',
      label: 'ARCHIVE',
      color: 'default',
    });
  });

  it('affiche un tiret quand l’état est absent', () => {
    expect(etatFormationAffichage(undefined).label).toBe('—');
    expect(etatFormationAffichage(null).label).toBe('—');
    expect(etatFormationAffichage('').label).toBe('—');
  });

  it('expose les mêmes libellés dans le filtre et dans la colonne', () => {
    expect(ETAT_FORMATION_OPTIONS).toHaveLength(ETAT_FORMATION_AFFICHAGES.length);
    const acheve = ETAT_FORMATION_OPTIONS.find((o) => o.value === 'ACHEVE');
    expect(acheve?.label).toBe(etatFormationAffichage('ACHEVE').label);
  });
});

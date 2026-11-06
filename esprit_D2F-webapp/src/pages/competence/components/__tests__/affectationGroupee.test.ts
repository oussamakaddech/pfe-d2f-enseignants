import { describe, expect, it } from 'vitest';
import type { Competence, SousCompetence } from '@/models/competence';
import {
  PERIMETRE_FIELD,
  PERIMETRE_LABEL,
  PERIMETRE_OPTIONS,
  buildGroupeeRequest,
  buildSavoirGroupes,
  collectSousCompetenceIds,
  competenceKeyOfSavoir,
  groupeeResultMessage,
  savoirsOfPerimetre,
} from '../affectationGroupee';

const sousCompetences: SousCompetence[] = [
  { id: 5, code: 'SC-A', nom: 'Sous-comp A', competenceId: 10, parentId: null },
  { id: 6, code: 'SC-A1', nom: 'Sous-comp A1', competenceId: 10, parentId: 5 },
  { id: 7, code: 'SC-A1a', nom: 'Sous-comp A1a', competenceId: 10, parentId: 6 },
  { id: 8, code: 'SC-B', nom: 'Sous-comp B', competenceId: 20, parentId: null },
];

const competences: Competence[] = [
  { id: 10, code: 'GC-TECH', nom: 'Techniques du bâtiment', domaineId: 1 },
  { id: 20, code: 'GC-SEC', nom: 'Sécurité', domaineId: 1 },
  { id: 30, code: 'GC-VIDE', nom: 'Compétence sans savoir', domaineId: 1 },
];

// S1 : savoir direct de la compétence 10 ; S2 : sous SC-A ; S3 : sous SC-A1a ;
// S4 : sous SC-B (compétence 20, jamais renseignée en direct).
const savoirs = [
  { id: 1, code: 'S1', nom: 'Béton armé', competenceId: 10 },
  { id: 2, code: 'S2', nom: 'Semelle', sousCompetenceId: 5 },
  { id: 3, code: 'S3', nom: 'Pieu', sousCompetenceId: 7 },
  { id: 4, code: 'S4', nom: 'Équipement de protection', sousCompetenceId: 8 },
];

describe('competenceKeyOfSavoir', () => {
  it('lit le champ direct quand il existe', () => {
    expect(competenceKeyOfSavoir(savoirs[0], sousCompetences)).toBe('10');
  });

  it('remonte par la sous-compétence quand competenceId est absent', () => {
    expect(competenceKeyOfSavoir(savoirs[1], sousCompetences)).toBe('10');
    expect(competenceKeyOfSavoir(savoirs[3], sousCompetences)).toBe('20');
  });

  it('renvoie une chaîne vide sans lien exploitable', () => {
    expect(competenceKeyOfSavoir(undefined, sousCompetences)).toBe('');
    expect(competenceKeyOfSavoir({ id: 9, sousCompetenceId: 999 }, sousCompetences)).toBe('');
  });
});

describe('collectSousCompetenceIds', () => {
  it('inclut la racine et toute la descendance', () => {
    expect([...collectSousCompetenceIds(sousCompetences, 5)].sort()).toEqual(['5', '6', '7']);
  });

  it('ne descend pas dans une autre branche', () => {
    expect([...collectSousCompetenceIds(sousCompetences, 8)]).toEqual(['8']);
  });

  it('résiste à un cycle parent/enfant', () => {
    const boucle: SousCompetence[] = [
      { id: 1, parentId: 2 },
      { id: 2, parentId: 1 },
    ];
    expect([...collectSousCompetenceIds(boucle, 1)].sort()).toEqual(['1', '2']);
  });

  it('renvoie un ensemble vide sans identifiant', () => {
    expect(collectSousCompetenceIds(sousCompetences, undefined).size).toBe(0);
  });
});

describe('savoirsOfPerimetre', () => {
  it('une compétence couvre ses savoirs directs ET ceux de ses sous-compétences', () => {
    const resultat = savoirsOfPerimetre({
      perimetre: 'competence',
      id: 10,
      savoirs,
      sousCompetences,
    });
    expect(resultat.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('une compétence sans savoir ne couvre rien', () => {
    expect(
      savoirsOfPerimetre({ perimetre: 'competence', id: 30, savoirs, sousCompetences }),
    ).toEqual([]);
  });

  it('une sous-compétence couvre ses savoirs et ceux de ses descendantes', () => {
    const resultat = savoirsOfPerimetre({
      perimetre: 'sousCompetence',
      id: 5,
      savoirs,
      sousCompetences,
    });
    expect(resultat.map((s) => s.id)).toEqual([2, 3]);
  });

  it('une sous-compétence feuille ne couvre que son savoir', () => {
    const resultat = savoirsOfPerimetre({
      perimetre: 'sousCompetence',
      id: 7,
      savoirs,
      sousCompetences,
    });
    expect(resultat.map((s) => s.id)).toEqual([3]);
  });

  it('un savoir ne couvre que lui-même', () => {
    const resultat = savoirsOfPerimetre({ perimetre: 'savoir', id: 4, savoirs });
    expect(resultat.map((s) => s.id)).toEqual([4]);
  });

  it('sans identifiant, aucun savoir', () => {
    expect(savoirsOfPerimetre({ perimetre: 'competence', id: undefined, savoirs })).toEqual([]);
  });
});

describe('buildGroupeeRequest', () => {
  const base = { enseignantId: 'E00007', niveau: 'N3_INTERMEDIAIRE' };

  it('transmet uniquement competenceId pour une compétence', () => {
    expect(
      buildGroupeeRequest(
        { ...base, competenceId: 10, sousCompetenceId: 5, savoirId: 1 },
        'competence',
      ),
    ).toEqual({ enseignantId: 'E00007', niveau: 'N3_INTERMEDIAIRE', competenceId: 10 });
  });

  it('transmet uniquement sousCompetenceId pour une sous-compétence', () => {
    expect(
      buildGroupeeRequest({ ...base, competenceId: 10, sousCompetenceId: 5 }, 'sousCompetence'),
    ).toEqual({ enseignantId: 'E00007', niveau: 'N3_INTERMEDIAIRE', sousCompetenceId: 5 });
  });

  it('transmet une liste savoirIds pour un savoir', () => {
    expect(buildGroupeeRequest({ ...base, savoirId: 1 }, 'savoir')).toEqual({
      enseignantId: 'E00007',
      niveau: 'N3_INTERMEDIAIRE',
      savoirIds: [1],
    });
  });

  it('reporte les champs optionnels seulement s’ils sont remplis', () => {
    const requete = buildGroupeeRequest(
      {
        enseignantId: 'E00007',
        competenceId: 10,
        dateAcquisition: '2026-10-27',
        commentaire: '',
      },
      'competence',
    );
    expect(requete).toEqual({
      enseignantId: 'E00007',
      competenceId: 10,
      dateAcquisition: '2026-10-27',
    });
  });

  it('renvoie null sans enseignant ou sans sélection', () => {
    expect(buildGroupeeRequest({ competenceId: 10 }, 'competence')).toBeNull();
    expect(buildGroupeeRequest({ enseignantId: 'E1' }, 'competence')).toBeNull();
    expect(buildGroupeeRequest({ enseignantId: 'E1' }, 'savoir')).toBeNull();
  });
});

describe('groupeeResultMessage', () => {
  it('annonce les créations', () => {
    expect(groupeeResultMessage({ total: 4, crees: 4, dejaAffectes: 0 })).toBe(
      '4 savoir(s) affecté(s)',
    );
  });

  it('signale les savoirs déjà affectés', () => {
    expect(groupeeResultMessage({ total: 4, crees: 3, dejaAffectes: 1 })).toBe(
      '3 savoir(s) affecté(s) · 1 déjà affecté(s)',
    );
  });

  it('annonce un rejeu sans effet', () => {
    expect(groupeeResultMessage({ total: 2, crees: 0, dejaAffectes: 2 })).toBe(
      'Aucune nouvelle affectation : les 2 savoir(s) étaient déjà affectés',
    );
  });

  it('annonce un périmètre vide', () => {
    expect(groupeeResultMessage({ total: 0, crees: 0, dejaAffectes: 0 })).toBe(
      'Aucun savoir dans le périmètre sélectionné',
    );
    expect(groupeeResultMessage(undefined)).toBe('Aucun savoir dans le périmètre sélectionné');
  });
});

describe('buildSavoirGroupes', () => {
  it('groupe par compétence et ignore les compétences sans savoir', () => {
    const groupes = buildSavoirGroupes({
      perimetre: 'competence',
      savoirs,
      competences,
      sousCompetences,
    });
    expect(groupes.map((g) => g.id)).toEqual(['10', '20']);
    expect(groupes[0]).toMatchObject({
      perimetre: 'competence',
      code: 'GC-TECH',
      nom: 'Techniques du bâtiment',
      competenceId: '10',
      savoirIds: ['1', '2', '3'],
    });
    expect(groupes[1].savoirIds).toEqual(['4']);
  });

  it('groupe par sous-compétence avec sa compétence parente', () => {
    const groupes = buildSavoirGroupes({
      perimetre: 'sousCompetence',
      savoirs,
      competences,
      sousCompetences,
    });
    // SC-A1 (6) apparaît aussi : son savoir est porté par sa descendante SC-A1a.
    expect(groupes.map((g) => g.id)).toEqual(['5', '6', '7', '8']);
    expect(groupes[0]).toMatchObject({
      parentLabel: 'Techniques du bâtiment',
      competenceId: '10',
      savoirIds: ['2', '3'],
    });
    expect(groupes[1]).toMatchObject({ parentLabel: 'Techniques du bâtiment', savoirIds: ['3'] });
    expect(groupes[2]).toMatchObject({ parentLabel: 'Techniques du bâtiment', savoirIds: ['3'] });
    expect(groupes[3]).toMatchObject({ parentLabel: 'Sécurité', savoirIds: ['4'] });
  });

  it('n’expose pas une sous-compétence sans aucun savoir couvert', () => {
    const groupes = buildSavoirGroupes({
      perimetre: 'sousCompetence',
      savoirs: savoirs.filter((s) => s.id !== 3),
      competences,
      sousCompetences,
    });
    expect(groupes.map((g) => g.id)).toEqual(['5', '8']);
  });

  it('retombe sur le code quand le libellé manque', () => {
    const groupes = buildSavoirGroupes({
      perimetre: 'competence',
      savoirs,
      competences: [{ id: 10, code: 'GC-CODE', nom: undefined, nomCompetence: undefined }],
      sousCompetences,
    });
    expect(groupes[0].nom).toBe('GC-CODE');
  });

  it('renvoie une liste vide sans référentiel chargé', () => {
    expect(buildSavoirGroupes({ perimetre: 'competence', savoirs })).toEqual([]);
  });
});

describe('constantes de périmètre', () => {
  it('expose les trois périmètres avec un champ de formulaire dédié', () => {
    expect(PERIMETRE_OPTIONS).toHaveLength(3);
    expect(PERIMETRE_FIELD.competence).toBe('competenceId');
    expect(PERIMETRE_FIELD.sousCompetence).toBe('sousCompetenceId');
    expect(PERIMETRE_FIELD.savoir).toBe('savoirId');
    expect(PERIMETRE_LABEL.sousCompetence).toBe('Sous-compétence');
  });
});

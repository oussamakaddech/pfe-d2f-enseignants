import { describe, expect, it } from 'vitest';
import {
  DIRECT_GROUP_KEY,
  buildAllowedCompetenceIds,
  buildFlatSavoirs,
  groupSavoirsBySousCompetence,
  indexSousCompetences,
  type FlatSavoir,
} from '../consultationViewUtils';

describe('indexSousCompetences', () => {
  it('calcule le chemin hiérarchique complet (Parent › Enfant)', () => {
    const index = indexSousCompetences([
      { id: 1, code: 'GC-S', nom: 'Sols', competenceId: 10, parentId: null },
      { id: 2, code: 'GC-S1', nom: 'Essais', competenceId: 10, parentId: 1 },
      { id: 3, code: 'GC-S1a', nom: 'Pressiomètre', competenceId: 10, parentId: 2 },
    ]);

    expect(index.get('1')).toMatchObject({ path: 'Sols', depth: 0, competenceId: '10' });
    expect(index.get('2')).toMatchObject({ path: 'Sols › Essais', depth: 1 });
    expect(index.get('3')).toMatchObject({ path: 'Sols › Essais › Pressiomètre', depth: 2 });
    expect(index.get('3')?.code).toBe('GC-S1a');
  });

  it('garde une sous-compétence dont le parent n’est pas chargé (liste paginée)', () => {
    const index = indexSousCompetences([
      { id: 7, nom: 'Orpheline', competenceId: 10, parentId: 999 },
    ]);

    expect(index.get('7')).toMatchObject({ path: 'Orpheline', depth: 0, competenceId: '10' });
  });

  it('ne boucle pas sur un cycle de parents', () => {
    const index = indexSousCompetences([
      { id: 11, nom: 'A', parentId: 12 },
      { id: 12, nom: 'B', parentId: 11 },
    ]);

    expect(index.size).toBe(2);
    expect(index.get('11')?.path).toContain('A');
    expect(index.get('12')?.path).toContain('B');
  });

  it('ignore les entrées sans identifiant', () => {
    const index = indexSousCompetences([{ id: undefined, nom: 'Sans id' }]);
    expect(index.size).toBe(0);
  });
});

describe('buildFlatSavoirs', () => {
  const domaines = [{ id: 1, code: 'GC', nom: 'Génie Civil' }];
  const competences = [{ id: 10, code: 'GC-TECH', nom: 'Techniques', domaineId: 1 }];

  it('rattache un savoir direct à sa compétence', () => {
    const [savoir] = buildFlatSavoirs({
      domaines,
      competences,
      sousComps: [],
      savoirs: [{ id: 100, code: 'S1', nom: 'Béton', competenceId: 10, type: 'THEORIQUE' }],
    });

    expect(savoir.isDirect).toBe(true);
    expect(savoir.sousCompetenceId).toBeNull();
    expect(savoir.competenceId).toBe('10');
    expect(savoir.competenceCode).toBe('GC-TECH');
    expect(savoir.domaineNom).toBe('Génie Civil');
  });

  it('nomme la sous-compétence depuis le DTO quand elle n’est pas chargée', () => {
    // Cas réel : la liste des sous-compétences est paginée (size=200) et la
    // sous-compétence du savoir n’y figure pas. Elle ne doit PAS être étiquetée
    // « savoir direct ».
    const [savoir] = buildFlatSavoirs({
      domaines,
      competences,
      sousComps: [{ id: 50, nom: 'Autre', competenceId: 10 }],
      savoirs: [
        {
          id: 101,
          code: 'S2',
          nom: 'Pieux',
          competenceId: 10,
          sousCompetenceId: 77,
          sousCompetenceNom: 'Fondations',
        },
      ],
    });

    expect(savoir.isDirect).toBe(false);
    expect(savoir.sousCompetenceId).toBe('77');
    expect(savoir.sousCompetenceNom).toBe('Fondations');
    expect(savoir.sousCompetencePath).toBe('Fondations');
    expect(savoir.competenceId).toBe('10');
  });

  it('expose le chemin de la sous-compétence quand elle est chargée', () => {
    const [savoir] = buildFlatSavoirs({
      domaines,
      competences,
      sousComps: [
        { id: 50, code: 'F', nom: 'Fondations', competenceId: 10 },
        { id: 51, code: 'F1', nom: 'Pieux', competenceId: 10, parentId: 50 },
      ],
      savoirs: [{ id: 102, nom: 'Essai de chargement', sousCompetenceId: 51 }],
    });

    expect(savoir.sousCompetencePath).toBe('Fondations › Pieux');
    expect(savoir.sousCompetenceCode).toBe('F1');
    expect(savoir.competenceId).toBe('10');
  });
});

describe('groupSavoirsBySousCompetence', () => {
  const direct: FlatSavoir = { id: 1, nom: 'Direct', isDirect: true, sousCompetenceId: null };
  const inB: FlatSavoir = {
    id: 2,
    nom: 'B1',
    isDirect: false,
    sousCompetenceId: 'b',
    sousCompetenceNom: 'Béton armé',
    sousCompetencePath: 'Béton armé',
  };
  const inA: FlatSavoir = {
    id: 3,
    nom: 'A1',
    isDirect: false,
    sousCompetenceId: 'a',
    sousCompetenceNom: 'Assainissement',
    sousCompetencePath: 'Assainissement',
    sousCompetenceCode: 'VRD-A',
  };

  it('place le groupe direct en premier puis les sous-compétences par ordre alphabétique', () => {
    const groups = groupSavoirsBySousCompetence([inB, direct, inA]);

    expect(groups.map((g) => g.key)).toEqual([DIRECT_GROUP_KEY, 'sc:a', 'sc:b']);
    expect(groups[0]).toMatchObject({ isDirect: true, label: 'Savoirs directs' });
    expect(groups[1]).toMatchObject({ label: 'Assainissement', code: 'VRD-A' });
    expect(groups[1].savoirs).toHaveLength(1);
  });

  it('regroupe plusieurs savoirs d’une même sous-compétence', () => {
    const groups = groupSavoirsBySousCompetence([inA, { ...inA, id: 4, nom: 'A2' }, inB]);

    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === 'sc:a')?.savoirs).toHaveLength(2);
  });

  it('accepte une liste vide', () => {
    expect(groupSavoirsBySousCompetence([])).toEqual([]);
  });
});

describe('buildAllowedCompetenceIds', () => {
  // Le rattachement est porté par la compétence ; les domaines ne fournissent
  // qu'un repli pour les compétences créées avant la V24.
  const domaines = [
    { id: 1, upId: '10', departementId: '100' },
    { id: 2, upId: '20', departementId: '200' },
  ];
  const competences = [
    { id: 100, domaineId: 1 },
    { id: 101, domaineId: 1, upIds: ['30'], departementIds: ['300'] },
    { id: 102, domaineId: 2, upIds: ['30', '40'] },
  ];

  it('ne restreint rien sans filtre', () => {
    expect(buildAllowedCompetenceIds(competences, domaines, null, null)).toBeNull();
  });

  it('applique le repli sur le domaine quand la compétence n’a pas de rattachement', () => {
    expect(Array.from(buildAllowedCompetenceIds(competences, domaines, 10, null) ?? [])).toEqual([
      '100',
    ]);
  });

  it('le rattachement explicite prime sur celui du domaine', () => {
    // 101 est dans le domaine 1 (UP 10) mais déclare la UP 30.
    expect(Array.from(buildAllowedCompetenceIds(competences, domaines, 30, null) ?? [])).toEqual([
      '101',
      '102',
    ]);
  });

  it('accepte plusieurs UP pour une même compétence', () => {
    expect(Array.from(buildAllowedCompetenceIds(competences, domaines, 40, null) ?? [])).toEqual([
      '102',
    ]);
  });

  it('combine UP et département', () => {
    expect(Array.from(buildAllowedCompetenceIds(competences, domaines, 30, 300) ?? [])).toEqual([
      '101',
    ]);
  });

  it('renvoie un ensemble vide quand aucune compétence ne correspond', () => {
    const allowed = buildAllowedCompetenceIds(competences, domaines, 999, null);
    expect(allowed?.size).toBe(0);
  });
});

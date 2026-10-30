import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import type { Formation } from '@/models/formation';
import {
  buildCompetenceByFormation,
  buildCompetenceOptions,
  buildFormateurOptions,
  filterFormations,
  formateursOf,
  personKey,
  personLabel,
} from '../catalogueFilters';

const formation = (over: Partial<Formation>): Formation => ({
  idFormation: 1,
  titreFormation: 'Formation',
  ...over,
});

const alice = { id: 'E1', nom: 'Alaoui', prenom: 'Alice' };
const bob = { id: 'E2', nom: 'Ben Salah', prenom: 'Bob' };

describe('personKey / personLabel', () => {
  it('préfère l’id, puis l’e-mail, puis le nom', () => {
    expect(personKey(alice)).toBe('id:E1');
    expect(personKey({ mail: 'A@ESP.tn ' })).toBe('mail:a@esp.tn');
    expect(personKey({ nom: 'Nom', prenom: 'Pré' })).toBe('nom:pré nom');
    expect(personKey(undefined)).toBe('');
  });

  it('libellé lisible', () => {
    expect(personLabel(alice)).toBe('Alice Alaoui');
    expect(personLabel({ mail: 'x@y.tn' })).toBe('x@y.tn');
    expect(personLabel({ id: 7 })).toBe('7');
    expect(personLabel(null)).toBe('');
  });
});

describe('formateursOf', () => {
  it('réunit animateurs de formation et de séances, sans doublon', () => {
    const f = formation({
      animateurs: [alice],
      seances: [{ animateurs: [alice, bob] }, { animateurs: [bob] }],
    });
    expect(Array.from(formateursOf(f).values())).toEqual(['Alice Alaoui', 'Bob Ben Salah']);
  });
});

describe('buildFormateurOptions', () => {
  it('compte les formations par formateur et trie par nom', () => {
    const options = buildFormateurOptions([
      formation({ idFormation: 1, animateurs: [bob] }),
      formation({ idFormation: 2, animateurs: [alice, bob] }),
      formation({ idFormation: 3, seances: [{ animateurs: [alice] }] }),
    ]);
    expect(options.map((o) => [o.label, o.count])).toEqual([
      ['Alice Alaoui', 2],
      ['Bob Ben Salah', 2],
    ]);
  });
});

describe('buildCompetenceByFormation / buildCompetenceOptions', () => {
  const links = [
    { formationId: 1, competenceId: 5, competenceNom: 'Web Sémantique' },
    { formationId: 2, competenceId: 5, competenceNom: 'Web Sémantique' },
    { formationId: 2, competenceId: 9, competenceNom: '' },
    { formationId: 1, competenceId: 5, competenceNom: 'Web Sémantique' },
  ];

  it('dédoublonne par formation et compétence', () => {
    const map = buildCompetenceByFormation(links);
    expect(map.get('1')).toEqual([{ id: '5', nom: 'Web Sémantique' }]);
    expect(map.get('2')).toEqual([
      { id: '9', nom: 'Compétence 9' },
      { id: '5', nom: 'Web Sémantique' },
    ]);
  });

  it('compte les formations par compétence et respecte le périmètre', () => {
    expect(buildCompetenceOptions(links).map((o) => [o.label, o.count])).toEqual([
      ['Compétence 9', 1],
      ['Web Sémantique', 2],
    ]);
    expect(buildCompetenceOptions(links, new Set(['2'])).map((o) => [o.label, o.count])).toEqual([
      ['Compétence 9', 1],
      ['Web Sémantique', 1],
    ]);
  });
});

describe('filterFormations', () => {
  const formations: Formation[] = [
    formation({
      idFormation: 1,
      titreFormation: 'Machine Learning',
      typeFormation: 'INTERNE',
      up: { id: 'UP_INFO', libelle: 'UP Informatique' },
      departement: { id: 'DEPT_RT', libelle: 'Réseaux' },
      dateDebut: '2026-03-02',
      dateFin: '2026-03-20',
      animateurs: [alice],
    }),
    formation({
      idFormation: 2,
      titreFormation: 'Web sémantique',
      typeFormation: 'EXTERNE',
      up1: { id: 'UP_GC', libelle: 'UP GC' },
      dateDebut: '2026-06-01',
      dateFin: '2026-06-10',
      seances: [{ animateurs: [bob] }],
    }),
    formation({ idFormation: 3, titreFormation: 'Sans dates', animateurs: [alice, bob] }),
  ];
  const competenceByFormation = buildCompetenceByFormation([
    { formationId: 1, competenceId: 5, competenceNom: 'Web Sémantique' },
  ]);

  it('sans filtre, renvoie tout', () => {
    expect(filterFormations(formations, {}, competenceByFormation)).toHaveLength(3);
  });

  it('recherche insensible à la casse', () => {
    const res = filterFormations(formations, { text: 'web' }, competenceByFormation);
    expect(res.map((f) => f.idFormation)).toEqual([2]);
  });

  it('filtre par formateur (y compris animateur de séance)', () => {
    expect(
      filterFormations(formations, { formateurKey: 'id:E1' }, competenceByFormation).map(
        (f) => f.idFormation,
      ),
    ).toEqual([1, 3]);
    expect(
      filterFormations(formations, { formateurKey: 'id:E2' }, competenceByFormation).map(
        (f) => f.idFormation,
      ),
    ).toEqual([2, 3]);
  });

  it('filtre par compétence', () => {
    expect(
      filterFormations(formations, { competenceId: '5' }, competenceByFormation).map(
        (f) => f.idFormation,
      ),
    ).toEqual([1]);
    expect(
      filterFormations(formations, { competenceId: '99' }, competenceByFormation),
    ).toHaveLength(0);
  });

  it('filtre par UP et département (alias up / up1)', () => {
    expect(
      filterFormations(formations, { upId: 'UP_GC' }, competenceByFormation).map(
        (f) => f.idFormation,
      ),
    ).toEqual([2]);
    expect(
      filterFormations(formations, { deptId: 'DEPT_RT' }, competenceByFormation).map(
        (f) => f.idFormation,
      ),
    ).toEqual([1]);
  });

  it('plage de dates : exclut hors plage et formations sans dates', () => {
    const res = filterFormations(
      formations,
      { start: dayjs('2026-06-01'), end: dayjs('2026-06-30') },
      competenceByFormation,
    );
    expect(res.map((f) => f.idFormation)).toEqual([2]);
  });

  it('combine recherche + UP + département', () => {
    expect(
      filterFormations(
        formations,
        { text: 'machine', upId: 'UP_INFO', deptId: 'DEPT_RT' },
        competenceByFormation,
      ).map((f) => f.idFormation),
    ).toEqual([1]);
  });
});

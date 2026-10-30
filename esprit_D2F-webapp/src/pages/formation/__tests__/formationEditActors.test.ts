import { describe, expect, it } from 'vitest';
import {
  actorLabel,
  buildMailIndex,
  isEmailAddress,
  mergeActors,
  mergeOptionById,
  parseEmails,
  personMail,
  resolveActorsByEmails,
  saveSuccessMessage,
  selectedFromOptions,
  synchronizeSeanceAnimateurs,
  uniqueIds,
} from '../hooks/formationEditActors';
import type { EditPerson } from '../hooks/useFormationWorkflowEdit';

const ens = (id: string, nom: string, mail: string): EditPerson => ({
  id,
  nom,
  prenom: 'P',
  mail,
});

describe('parseEmails', () => {
  it('découpe virgules, points-virgules et espaces puis normalise', () => {
    expect(parseEmails(' A@Esprit.tn, b@esprit.tn;c@esprit.tn  d@esprit.tn ')).toEqual([
      'a@esprit.tn',
      'b@esprit.tn',
      'c@esprit.tn',
      'd@esprit.tn',
    ]);
  });

  it('supprime les doublons et les vides', () => {
    expect(parseEmails('a@x.tn,, a@x.tn ;  ')).toEqual(['a@x.tn']);
    expect(parseEmails(null)).toEqual([]);
    expect(parseEmails(undefined)).toEqual([]);
  });
});

describe('isEmailAddress', () => {
  it('accepte une adresse simple', () => {
    expect(isEmailAddress('prenom.nom@esprit.tn')).toBe(true);
  });

  it('refuse une saisie sans domaine ou sans arobase', () => {
    expect(isEmailAddress('prenom.nom')).toBe(false);
    expect(isEmailAddress('prenom@')).toBe(false);
    expect(isEmailAddress('prenom@esprit')).toBe(false);
  });
});

describe('personMail / buildMailIndex', () => {
  it('lit mail, email ou emailAddress de façon normalisée', () => {
    expect(personMail({ mail: ' A@Esprit.TN ' })).toBe('a@esprit.tn');
    expect(personMail({ email: 'b@esprit.tn' })).toBe('b@esprit.tn');
    expect(personMail({ emailAddress: 'c@esprit.tn' })).toBe('c@esprit.tn');
    expect(personMail(null)).toBe('');
  });

  it('garde la première occurrence et ignore les personnes sans id', () => {
    const index = buildMailIndex([
      ens('E1', 'Premier', 'a@esprit.tn'),
      ens('E2', 'Second', 'A@ESPRIT.TN'),
      { id: undefined, nom: 'Sans id', mail: 'z@esprit.tn' },
    ]);
    expect(index.size).toBe(1);
    expect(index.get('a@esprit.tn')?.id).toBe('E1');
  });
});

describe('resolveActorsByEmails', () => {
  const pool = [
    ens('E1', 'Ben Ali', 'ali@esprit.tn'),
    ens('E2', 'Trabelsi', 'sana@esprit.tn'),
    { id: 'acc-9', nom: 'Compte', prenom: 'Web', email: 'web@esprit.tn' } as EditPerson,
  ];

  it('ajoute les correspondances et signale inconnues / invalides / déjà choisies', () => {
    const result = resolveActorsByEmails(
      'ali@esprit.tn, sana@esprit.tn, web@esprit.tn, absent@esprit.tn, pas-un-mail',
      pool,
      [ens('E9', 'Déjà', 'ali@esprit.tn')],
    );
    expect(result.toAdd.map((p) => p.id)).toEqual(['E2', 'acc-9']);
    expect(result.already).toEqual(['ali@esprit.tn']);
    expect(result.unknown).toEqual(['absent@esprit.tn']);
    expect(result.invalid).toEqual(['pas-un-mail']);
  });

  it('dédoublonne deux écritures de la même adresse avant résolution', () => {
    const result = resolveActorsByEmails('ALI@esprit.tn, ali@esprit.tn', pool, []);
    expect(result.toAdd).toHaveLength(1);
    expect(result.already).toEqual([]);
  });

  it('retourne un résultat vide quand la saisie est vide', () => {
    const result = resolveActorsByEmails('   ', pool, []);
    expect(result).toEqual({ toAdd: [], already: [], unknown: [], invalid: [] });
  });
});

describe('mergeActors / mergeOptionById', () => {
  it('fusionne sans doublon en conservant l’ordre de sélection', () => {
    const selected = [ens('E1', 'Un', 'un@esprit.tn')];
    const merged = mergeActors(selected, [ens('E2', 'Deux', 'deux@esprit.tn')]);
    expect(merged.map((p) => p.id)).toEqual(['E1', 'E2']);
    expect(mergeActors(merged, [ens('E1', 'Un bis', 'un@esprit.tn')])).toBe(merged);
  });

  it('garde une personne sélectionnée hors des options filtrées et retire les doublons d’id', () => {
    const base = [ens('E1', 'Un', 'un@esprit.tn'), ens('E1', 'Un doublon', 'un@esprit.tn')];
    const selected = [ens('E7', 'Filtré', 'sept@esprit.tn'), ens('E1', 'Un', 'un@esprit.tn')];
    const options = mergeOptionById(base, selected);
    expect(options.map((p) => p.id)).toEqual(['E1', 'E7']);
    expect(options[0].nom).toBe('Un');
  });

  it('ignore les personnes sans identifiant (non sélectionnables)', () => {
    expect(mergeOptionById([{ id: undefined, nom: 'X' }], [])).toEqual([]);
  });
});

describe('selectedFromOptions', () => {
  const options = [
    ens('E1', 'Un', 'un@esprit.tn'),
    ens('E2', 'Deux', 'deux@esprit.tn'),
    ens('E3', 'Trois', 'trois@esprit.tn'),
  ];

  it('retrouve les objets complets dans l’ordre de la liste, pas celui du clic', () => {
    expect(selectedFromOptions(options, ['E3', 'E1']).map((p) => p.nom)).toEqual(['Un', 'Trois']);
  });

  it('ignore un identifiant absent des options (filtre ou sélection obsolète)', () => {
    expect(selectedFromOptions(options, ['E2', 'E404']).map((p) => p.id)).toEqual(['E2']);
  });

  it('renvoie une sélection vide quand tout est désélectionné', () => {
    expect(selectedFromOptions(options, [])).toEqual([]);
  });
});

describe('synchronizeSeanceAnimateurs', () => {
  const resolveId = (p: EditPerson) => p.id;
  const seance = [{ id: 'E1' }, { id: 'E3' }];

  it('reporte un animateur ajouté au niveau formation sur chaque séance', () => {
    const ids = synchronizeSeanceAnimateurs(
      seance,
      ['E1', 'E3'],
      [
        ens('E1', 'Un', 'un@esprit.tn'),
        ens('E3', 'Trois', 'trois@esprit.tn'),
        ens('E4', 'Nouveau', 'n@esprit.tn'),
      ],
      resolveId,
    );
    expect(ids).toEqual(['E1', 'E3', 'E4']);
  });

  it('retire des séances un animateur retiré au niveau formation', () => {
    const ids = synchronizeSeanceAnimateurs(
      seance,
      ['E1', 'E3'],
      [ens('E1', 'Un', 'un@esprit.tn')],
      resolveId,
    );
    expect(ids).toEqual(['E1']);
  });

  it('conserve un animateur propre à la séance et ne le duplique pas', () => {
    const ids = synchronizeSeanceAnimateurs(
      [{ id: 'E1' }, { id: 'E8' }],
      ['E1'],
      [ens('E1', 'Un', 'un@esprit.tn'), ens('E8', 'Huit', 'h@esprit.tn')],
      resolveId,
    );
    expect(ids).toEqual(['E1', 'E8']);
  });

  it('utilise l’identifiant résolu (compte auth → fiche enseignant) et dédoublonne', () => {
    const ids = synchronizeSeanceAnimateurs(
      [],
      [],
      [{ id: 'acc-1', isAuthUser: true, userName: 'web' }],
      () => 'E00042',
    );
    expect(ids).toEqual(['E00042']);
  });

  it('renvoie une liste vide pour une séance sans animateur ni ajout', () => {
    expect(
      synchronizeSeanceAnimateurs(undefined, ['E1'], [ens('E1', 'Un', 'un@esprit.tn')], resolveId),
    ).toEqual([]);
  });
});

describe('saveSuccessMessage', () => {
  it('annonce l’envoi de l’e-mail quand l’interrupteur est actif', () => {
    expect(saveSuccessMessage(true)).toContain('Un e-mail a été envoyé');
  });

  it('annonce l’absence d’e-mail quand l’interrupteur est désactivé', () => {
    expect(saveSuccessMessage(false)).toContain('Aucun e-mail envoyé');
  });
});

describe('uniqueIds / actorLabel', () => {
  it('dédoublonne les identifiants et écarte les vides', () => {
    expect(uniqueIds(['E1', null, 'E1', undefined, 2, '  '])).toEqual(['E1', '2']);
  });

  it('compose Prénom Nom avec repli e-mail puis id', () => {
    expect(actorLabel({ id: 'E1', nom: 'Ali', prenom: 'Ben' })).toBe('Ben Ali');
    expect(actorLabel({ id: 'E1', nom: '', prenom: '', mail: 'a@esprit.tn' })).toBe('a@esprit.tn');
    expect(actorLabel({ id: 'E1' })).toBe('E1');
  });
});

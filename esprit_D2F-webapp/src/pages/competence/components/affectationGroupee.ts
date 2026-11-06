// Helpers purs de l'affectation groupée (compétence / sous-compétence / savoirs).
//
// Règle métier : affecter une compétence revient à affecter TOUS ses savoirs
// (directs et ceux portés par ses sous-compétences) ; affecter une
// sous-compétence couvre ses savoirs et ceux de ses descendantes. Aucune
// couverture partielle n'est proposée.

import type {
  AffectationGroupeeRequest,
  AffectationGroupeeResult,
  Competence,
  PerimetreAffectation,
  SousCompetence,
} from '@/models/competence';
import type { Id } from '@/models/common';

/** Forme minimale d'un savoir (modèle `Savoir`, entrée RICE, `EnseignantCompetence`). */
export interface SavoirLike {
  id?: Id;
  code?: string;
  nom?: string;
  /** Renseigné seulement quand la compétence est portée directement. */
  competenceId?: Id;
  sousCompetenceId?: Id;
}

/** Forme minimale d'une sous-compétence (le champ `enfants` n'est pas utilisé). */
export interface SousCompetenceLike {
  id?: Id;
  code?: string;
  nom?: string;
  competenceId?: Id;
  parentId?: Id | null;
}

/** Valeurs du formulaire d'affectation groupée (page Affectations Enseignants). */
export interface GroupeeFormValues {
  enseignantId?: Id;
  competenceId?: Id;
  sousCompetenceId?: Id;
  savoirId?: Id;
  niveau?: string;
  dateAcquisition?: string;
  commentaire?: string;
}

/** Options du sélecteur de périmètre (libellés explicites sur l'effet de bord). */
export const PERIMETRE_OPTIONS: { value: PerimetreAffectation; label: string }[] = [
  { value: 'competence', label: 'Compétence (tous ses savoirs)' },
  { value: 'sousCompetence', label: 'Sous-compétence (et ses descendantes)' },
  { value: 'savoir', label: 'Savoir (un seul)' },
];

/** Libellé court d'un périmètre, pour les messages et les compteurs. */
export const PERIMETRE_LABEL: Record<PerimetreAffectation, string> = {
  competence: 'Compétence',
  sousCompetence: 'Sous-compétence',
  savoir: 'Savoir',
};

/** Nom du champ de sélection associé à chaque périmètre. */
export const PERIMETRE_FIELD: Record<PerimetreAffectation, keyof GroupeeFormValues> = {
  competence: 'competenceId',
  sousCompetence: 'sousCompetenceId',
  savoir: 'savoirId',
};

const key = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

/**
 * Compétence porteuse d'un savoir : le champ direct `competenceId` prime, sinon
 * on remonte par la sous-compétence (`savoirs.competence_id` n'est pas
 * renseigné pour un savoir rangé sous une sous-compétence).
 */
export function competenceKeyOfSavoir(
  savoir: SavoirLike | undefined,
  sousCompetences: SousCompetenceLike[] = [],
): string {
  if (!savoir) return '';
  const direct = key(savoir.competenceId);
  if (direct) return direct;
  const scId = key(savoir.sousCompetenceId);
  if (!scId) return '';
  const sc = (sousCompetences ?? []).find((item) => key(item.id) === scId);
  return key(sc?.competenceId);
}

/**
 * Identifiants d'une sous-compétence et de toutes ses descendantes (garde
 * anti-cycle : un parent mal saisi ne bloque pas la collecte).
 */
export function collectSousCompetenceIds(
  sousCompetences: SousCompetenceLike[] = [],
  racineId: Id | undefined,
): Set<string> {
  const ids = new Set<string>();
  const racine = key(racineId);
  if (!racine) return ids;
  const enfantsParParent = new Map<string, string[]>();
  (sousCompetences ?? []).forEach((sc) => {
    const parent = key(sc.parentId);
    const id = key(sc.id);
    if (!parent || !id) return;
    const liste = enfantsParParent.get(parent) ?? [];
    liste.push(id);
    enfantsParParent.set(parent, liste);
  });
  const pile = [racine];
  while (pile.length > 0) {
    const courant = pile.pop() as string;
    if (ids.has(courant)) continue;
    ids.add(courant);
    (enfantsParParent.get(courant) ?? []).forEach((enfant) => pile.push(enfant));
  }
  return ids;
}

/**
 * Savoirs couverts par un périmètre :
 * - `competence` : savoirs directs + savoirs de toutes ses sous-compétences ;
 * - `sousCompetence` : savoirs de la sous-compétence et de ses descendantes ;
 * - `savoir` : le savoir demandé.
 */
export function savoirsOfPerimetre(params: {
  perimetre: PerimetreAffectation;
  id: Id | undefined;
  savoirs: SavoirLike[];
  sousCompetences?: SousCompetenceLike[];
}): SavoirLike[] {
  const { perimetre, id, savoirs = [], sousCompetences = [] } = params;
  const cible = key(id);
  if (!cible) return [];

  if (perimetre === 'savoir') {
    return savoirs.filter((savoir) => key(savoir.id) === cible);
  }

  if (perimetre === 'competence') {
    return savoirs.filter((savoir) => competenceKeyOfSavoir(savoir, sousCompetences) === cible);
  }

  const ids = collectSousCompetenceIds(sousCompetences, id);
  if (ids.size === 0) return [];
  return savoirs.filter((savoir) => ids.has(key(savoir.sousCompetenceId)));
}

/**
 * Construit la requête d'affectation groupée à partir des valeurs du
 * formulaire : seul le champ du périmètre choisi est transmis (le serveur
 * résout le reste). `null` si aucun identifiant n'est sélectionné.
 */
export function buildGroupeeRequest(
  values: GroupeeFormValues,
  perimetre: PerimetreAffectation,
): AffectationGroupeeRequest | null {
  const enseignantId = values?.enseignantId;
  if (enseignantId === undefined || enseignantId === null || key(enseignantId) === '') return null;

  const base: AffectationGroupeeRequest = {
    enseignantId,
    ...(values.niveau ? { niveau: values.niveau } : {}),
    ...(values.dateAcquisition ? { dateAcquisition: values.dateAcquisition } : {}),
    ...(values.commentaire ? { commentaire: values.commentaire } : {}),
  };

  if (perimetre === 'competence') {
    return key(values.competenceId) ? { ...base, competenceId: values.competenceId } : null;
  }
  if (perimetre === 'sousCompetence') {
    return key(values.sousCompetenceId)
      ? { ...base, sousCompetenceId: values.sousCompetenceId }
      : null;
  }
  return key(values.savoirId) ? { ...base, savoirIds: [values.savoirId as Id] } : null;
}

/**
 * Message de résultat d'une affectation groupée. Un rejeu intégral (0 création)
 * est annoncé comme tel : l'opération est idempotente, pas silencieusement
 * réussie.
 */
export function groupeeResultMessage(result: AffectationGroupeeResult | undefined): string {
  const total = Number(result?.total ?? 0);
  const crees = Number(result?.crees ?? 0);
  const deja = Number(result?.dejaAffectes ?? 0);
  if (total === 0) return 'Aucun savoir dans le périmètre sélectionné';
  if (crees === 0) {
    return `Aucune nouvelle affectation : les ${total} savoir(s) étaient déjà affectés`;
  }
  const base = `${crees} savoir(s) affecté(s)`;
  return deja > 0 ? `${base} · ${deja} déjà affecté(s)` : base;
}

/** Carte glissable d'un groupe (compétence ou sous-compétence) dans le panneau gauche. */
export interface SavoirGroupe {
  /** 'competence' | 'sousCompetence' — pilote l'expansion au dépôt. */
  perimetre: Exclude<PerimetreAffectation, 'savoir'>;
  id: string;
  code: string;
  nom: string;
  /** Compétence porteuse (elle-même en mode compétence). */
  competenceId: string;
  /** Compétence de rattachement (libellé, vide pour une compétence). */
  parentLabel: string;
  /** Savoirs couverts, dans l'ordre du référentiel. */
  savoirIds: string[];
}

const labelOf = (
  item:
    | { code?: string; nom?: string; nomCompetence?: string; nomSousCompetence?: string }
    | undefined,
  id: string,
) => String(item?.nom ?? item?.nomCompetence ?? item?.nomSousCompetence ?? item?.code ?? id);

/**
 * Groupes glissables du panneau gauche. Seuls les groupes portant au moins un
 * savoir sont proposés : déposer un groupe vide n'affecterait rien.
 */
export function buildSavoirGroupes(params: {
  perimetre: Exclude<PerimetreAffectation, 'savoir'>;
  savoirs: SavoirLike[];
  competences?: Competence[];
  sousCompetences?: SousCompetenceLike[];
}): SavoirGroupe[] {
  const { perimetre, savoirs = [], competences = [], sousCompetences = [] } = params;
  const groupes: SavoirGroupe[] = [];

  if (perimetre === 'competence') {
    (competences ?? []).forEach((competence) => {
      const id = key(competence.id);
      if (!id) return;
      const savoirIds = savoirsOfPerimetre({
        perimetre: 'competence',
        id,
        savoirs,
        sousCompetences,
      }).map((savoir) => key(savoir.id));
      if (savoirIds.length === 0) return;
      groupes.push({
        perimetre: 'competence',
        id,
        code: String(competence.code ?? ''),
        nom: labelOf(competence, id),
        competenceId: id,
        parentLabel: '',
        savoirIds,
      });
    });
    return groupes;
  }

  (sousCompetences ?? []).forEach((sousCompetence) => {
    const id = key(sousCompetence.id);
    if (!id) return;
    const savoirIds = savoirsOfPerimetre({
      perimetre: 'sousCompetence',
      id,
      savoirs,
      sousCompetences,
    }).map((savoir) => key(savoir.id));
    if (savoirIds.length === 0) return;
    const parent = (competences ?? []).find(
      (competence) => key(competence.id) === key(sousCompetence.competenceId),
    );
    groupes.push({
      perimetre: 'sousCompetence',
      id,
      code: String(sousCompetence.code ?? ''),
      nom: labelOf(sousCompetence, id),
      competenceId: key(sousCompetence.competenceId),
      parentLabel: parent ? labelOf(parent, key(parent.id)) : '',
      savoirIds,
    });
  });
  return groupes;
}

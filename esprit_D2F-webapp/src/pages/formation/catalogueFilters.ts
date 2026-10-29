import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { Formation, FormationCompetenceLink, Personne } from '@/models/formation';
import type { Id } from '@/models/common';

export interface FormateurOption {
  /** Identifiant stable de la personne (id, sinon e-mail, sinon nom). */
  key: string;
  label: string;
  /** Nombre de formations animées. */
  count: number;
}

export interface CompetenceOption {
  key: string;
  label: string;
  /** Nombre de formations rattachées à la compétence. */
  count: number;
}

export interface CatalogueFilters {
  text?: string;
  type?: string;
  etat?: string;
  upId?: Id;
  deptId?: Id;
  period?: string;
  start?: Dayjs | null;
  end?: Dayjs | null;
  /** Clé d'un formateur (voir `personKey`). */
  formateurKey?: string;
  /** Identifiant de compétence (chaîne). */
  competenceId?: string;
}

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const byLabel = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });

const byNom = (a: { nom: string }, b: { nom: string }) =>
  a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });

/** Clé stable d'une personne : id, sinon e-mail, sinon nom complet. */
export function personKey(person?: Personne | null): string {
  if (!person) return '';
  if (person.id !== undefined && person.id !== null && String(person.id).trim() !== '') {
    return `id:${person.id}`;
  }
  const mail = normalize(person.mail);
  if (mail) return `mail:${mail}`;
  const name = `${normalize(person.prenom)} ${normalize(person.nom)}`.trim();
  return name ? `nom:${name}` : '';
}

/** Libellé lisible d'une personne (« Prénom Nom », repli e-mail / id). */
export function personLabel(person?: Personne | null): string {
  if (!person) return '';
  const name = `${person.prenom ?? ''} ${person.nom ?? ''}`.trim();
  if (name) return name;
  if (person.mail) return person.mail;
  return person.id === undefined || person.id === null ? '' : String(person.id);
}

/**
 * Formateurs d'une formation : animateurs de la formation **et** animateurs de
 * ses séances (dédoublonnés, le premier libellé rencontré gagne).
 */
export function formateursOf(formation: Formation): Map<string, string> {
  const found = new Map<string, string>();
  const add = (person?: Personne | null) => {
    const key = personKey(person);
    if (!key || found.has(key)) return;
    const label = personLabel(person);
    if (label) found.set(key, label);
  };
  (formation.animateurs ?? []).forEach(add);
  (formation.seances ?? []).forEach((seance) => (seance.animateurs ?? []).forEach(add));
  return found;
}

/** Options du filtre « Formateur » avec le nombre de formations de chacun. */
export function buildFormateurOptions(formations: Formation[]): FormateurOption[] {
  const acc = new Map<string, FormateurOption>();
  formations.forEach((formation) => {
    formateursOf(formation).forEach((label, key) => {
      const existing = acc.get(key);
      if (existing) existing.count += 1;
      else acc.set(key, { key, label, count: 1 });
    });
  });
  return Array.from(acc.values()).sort(byLabel);
}

/**
 * Compétences de chaque formation, dédoublonnées.
 *
 * @param links   Liaisons formation ↔ compétence (`/formation-competences/all`).
 * @param allowed Restreint aux formations du périmètre affiché (`null` = toutes).
 */
export function buildCompetenceByFormation(
  links: FormationCompetenceLink[],
  allowed?: Set<string> | null,
): Map<string, { id: string; nom: string }[]> {
  const acc = new Map<string, Map<string, string>>();
  for (const link of links) {
    if (link.formationId == null || link.competenceId == null) continue;
    const formationId = String(link.formationId);
    if (allowed && !allowed.has(formationId)) continue;
    const competenceId = String(link.competenceId);
    const nom = (link.competenceNom ?? '').trim() || `Compétence ${competenceId}`;
    const byCompetence = acc.get(formationId) ?? new Map<string, string>();
    if (!byCompetence.has(competenceId)) byCompetence.set(competenceId, nom);
    acc.set(formationId, byCompetence);
  }
  const result = new Map<string, { id: string; nom: string }[]>();
  acc.forEach((byCompetence, formationId) => {
    result.set(formationId, Array.from(byCompetence, ([id, nom]) => ({ id, nom })).sort(byNom));
  });
  return result;
}

/** Options du filtre « Compétence » : nombre de formations rattachées. */
export function buildCompetenceOptions(
  links: FormationCompetenceLink[],
  allowed?: Set<string> | null,
): CompetenceOption[] {
  const acc = new Map<string, { label: string; formations: Set<string> }>();
  for (const link of links) {
    if (link.formationId == null || link.competenceId == null) continue;
    const formationId = String(link.formationId);
    if (allowed && !allowed.has(formationId)) continue;
    const key = String(link.competenceId);
    const nom = (link.competenceNom ?? '').trim() || `Compétence ${key}`;
    const entry = acc.get(key) ?? { label: nom, formations: new Set<string>() };
    entry.formations.add(formationId);
    acc.set(key, entry);
  }
  return Array.from(acc, ([key, { label, formations }]) => ({
    key,
    label,
    count: formations.size,
  })).sort(byLabel);
}

const sameId = (a: Id | undefined, b: Id | undefined) =>
  a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);

/**
 * Applique les filtres du catalogue (recherche, type, état, UP, département,
 * période, plage de dates, formateur, compétence).
 */
export function filterFormations(
  formations: Formation[],
  filters: CatalogueFilters,
  competenceByFormation?: Map<string, { id: string; nom: string }[]> | null,
): Formation[] {
  const text = normalize(filters.text);
  const competenceId = filters.competenceId;
  return formations.filter((formation) => {
    if (text && !normalize(formation.titreFormation).includes(text)) return false;
    if (filters.type && formation.typeFormation !== filters.type) return false;
    if (filters.etat && formation.etatFormation !== filters.etat) return false;
    if (filters.period && formation.periodCode !== filters.period) return false;
    if (filters.upId && !sameId(formation.up?.id ?? formation.up1?.id, filters.upId)) return false;
    if (
      filters.deptId &&
      !sameId(formation.departement?.id ?? formation.departement1?.id, filters.deptId)
    ) {
      return false;
    }
    if (filters.start || filters.end) {
      const debut = formation.dateDebut ? dayjs(formation.dateDebut) : null;
      const fin = formation.dateFin ? dayjs(formation.dateFin) : null;
      if (!debut || !fin) return false;
      if (filters.start && debut.isBefore(filters.start, 'day')) return false;
      if (filters.end && fin.isAfter(filters.end, 'day')) return false;
    }
    if (filters.formateurKey && !formateursOf(formation).has(filters.formateurKey)) return false;
    if (competenceId) {
      const competences = competenceByFormation?.get(String(formation.idFormation)) ?? [];
      if (!competences.some((competence) => competence.id === competenceId)) return false;
    }
    return true;
  });
}

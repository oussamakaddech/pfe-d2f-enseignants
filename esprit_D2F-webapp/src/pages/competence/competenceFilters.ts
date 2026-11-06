import type { Competence, Domaine } from '@/models/competence';
import type { Id } from '@/models/common';

/** Critères de la barre de filtres de l'onglet « Compétences ». */
export interface CompetenceFilters {
  domaineId?: Id | null;
  upId?: Id | null;
  departementId?: Id | null;
}

export type ScopeField = 'up' | 'dept';

const keyOf = (value: Id | null | undefined): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

/**
 * Rattachement effectif d'une compétence : UP / départements portés par la
 * compétence elle-même, sinon ceux du domaine (héritage, comme dans la
 * page Consultation).
 */
export function effectiveScopeIds(
  competence: Competence,
  domaine: Domaine | undefined,
  field: ScopeField,
): string[] {
  const explicit = (field === 'up' ? competence.upIds : competence.departementIds) ?? [];
  const inherited = field === 'up' ? domaine?.upId : domaine?.departementId;
  const ids = explicit.length > 0 ? explicit : inherited != null ? [inherited] : [];
  return ids.map(String);
}

export function hasActiveFilters(filters: CompetenceFilters): boolean {
  return (
    keyOf(filters.domaineId) !== null ||
    keyOf(filters.upId) !== null ||
    keyOf(filters.departementId) !== null
  );
}

/** Applique les trois critères ; un critère vide ne filtre rien. */
export function filterCompetences(
  competences: Competence[],
  domaines: Domaine[],
  filters: CompetenceFilters,
): Competence[] {
  if (!hasActiveFilters(filters)) return competences;

  const domaineById = new Map<string, Domaine>();
  for (const domaine of domaines ?? []) {
    const key = keyOf(domaine.id);
    if (key) domaineById.set(key, domaine);
  }

  const domaineKey = keyOf(filters.domaineId);
  const upKey = keyOf(filters.upId);
  const deptKey = keyOf(filters.departementId);

  return competences.filter((competence) => {
    if (domaineKey && keyOf(competence.domaineId) !== domaineKey) return false;

    const domaine = domaineById.get(keyOf(competence.domaineId) ?? '');
    if (upKey && !effectiveScopeIds(competence, domaine, 'up').includes(upKey)) return false;
    if (deptKey && !effectiveScopeIds(competence, domaine, 'dept').includes(deptKey)) return false;

    return true;
  });
}

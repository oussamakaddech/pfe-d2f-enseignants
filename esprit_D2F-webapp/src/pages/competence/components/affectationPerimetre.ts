import type { AffectationPerimetre } from '@/models/competence';
import type { Id } from '@/models/common';

/**
 * Sentinelle renvoyée par le serveur quand le périmètre d'un CUP / chef de
 * département n'a pas pu être résolu (fiche enseignant sans UP ni département).
 * Elle ne doit jamais être présentée comme un libellé.
 */
export const NO_SCOPE_ID = '__perimetre_indetermine__';

/**
 * Identifiants d'enseignants autorisés à l'écriture.
 *
 * @returns `null` quand aucun filtrage ne s'applique (administrateur, ou
 *          périmètre non chargé) ; sinon l'ensemble des identifiants du
 *          périmètre (éventuellement vide).
 */
export function allowedEnseignantIds(perimetre?: AffectationPerimetre | null): Set<string> | null {
  if (!perimetre || perimetre.global) return null;
  return new Set((perimetre.enseignantIds ?? []).map((id) => String(id)));
}

/** Vrai si le périmètre est restreint et ne contient aucun enseignant. */
export function isPerimetreVide(perimetre?: AffectationPerimetre | null): boolean {
  const allowed = allowedEnseignantIds(perimetre);
  return allowed !== null && allowed.size === 0;
}

/** Filtre une liste d'enseignants par le périmètre (`null` = pas de filtrage). */
export function filterByAllowedIds<T>(
  items: T[],
  allowed: Set<string> | null,
  getId: (item: T) => Id | undefined | null,
): T[] {
  if (!allowed) return items;
  return items.filter((item) => {
    const id = getId(item);
    return id !== undefined && id !== null && allowed.has(String(id));
  });
}

/**
 * Libellé du périmètre restreint, ex. « UP UP_GC et département DEPT_GC ».
 *
 * @returns `null` pour un administrateur (aucune restriction) ou quand la
 *          sentinelle est la seule valeur : le périmètre est alors indéterminé.
 */
export function perimetreLabel(perimetre?: AffectationPerimetre | null): string | null {
  if (!perimetre || perimetre.global) return null;
  const parts: string[] = [];
  const up = perimetre.upId;
  const dept = perimetre.deptId;
  if (up && up !== NO_SCOPE_ID) parts.push(`l'UP ${up}`);
  if (dept && dept !== NO_SCOPE_ID) parts.push(`le département ${dept}`);
  return parts.length ? parts.join(' et ') : null;
}

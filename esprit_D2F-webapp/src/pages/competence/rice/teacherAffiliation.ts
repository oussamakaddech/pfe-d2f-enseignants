// Rattachement UP / département d'un enseignant de l'annuaire (service formation).
// L'API renvoie deptId/deptLibelle et upId/upLibelle ; d'anciennes sources
// utilisent departement/department/unitePedagogique. Lire un seul de ces champs
// affichait « Département N/A » pour tout l'annuaire.

// `object` : accepte les interfaces sans signature d'index (Enseignant…).
type TeacherLike = object;
const field = (t: TeacherLike, key: string): unknown => (t as Record<string, unknown>)[key];

function pickFirst(...values: unknown[]): string {
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

/** Libellé du département (à défaut son identifiant), '' si non renseigné. */
export function resolveDept(teacher: TeacherLike): string {
  return pickFirst(
    field(teacher, 'deptLibelle'),
    field(teacher, 'departement'),
    field(teacher, 'department'),
    field(teacher, 'deptId'),
    field(teacher, 'departementId'),
  );
}

/** Identifiant du département, pour les formulaires (le backend attend deptId). */
export function resolveDeptId(teacher: TeacherLike): string {
  return pickFirst(field(teacher, 'deptId'), field(teacher, 'departementId'));
}

/** Libellé de l'UP (à défaut son identifiant), '' si non renseignée. */
export function resolveUp(teacher: TeacherLike): string {
  return pickFirst(field(teacher, 'upLibelle'), field(teacher, 'unitePedagogique'), field(teacher, 'upId'));
}

/** « Département · UP », sans répéter l'UP quand elle porte le même libellé. */
export function teacherAffiliation(teacher: TeacherLike): string {
  const dept = resolveDept(teacher);
  const up = resolveUp(teacher);
  return [dept, up].filter((v, i, all) => v && all.indexOf(v) === i).join(' · ');
}

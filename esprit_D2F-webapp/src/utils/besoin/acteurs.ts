/* ─────────────────────────────────────────────────────────────────────────
 * Helpers acteurs (animateurs / enseignants) d'un besoin de formation.
 * Format de stockage : une ligne "Nom Prénom <email>" par acteur (cohérent
 * avec publicCible). Les sélecteurs manipulent des tableaux de ces chaînes.
 * ─────────────────────────────────────────────────────────────────────── */

interface ActeurSource {
  nom?: string;
  prenom?: string;
  mail?: string;
}

export interface ActeurOption {
  value: string;
  label: string;
}

export const acteurFullName = (e: ActeurSource): string =>
  [e.nom, e.prenom].filter(Boolean).join(" ").trim();

/** Valeur stockée pour un acteur : "Nom Prénom <email>". */
export const buildActeurValue = (e: ActeurSource): string => {
  const name = acteurFullName(e);
  return e.mail ? `${name} <${e.mail}>`.trim() : name;
};

/** Construit les options de sélecteur depuis la liste des enseignants. */
export const buildActeurOptions = (enseignants: ActeurSource[]): ActeurOption[] =>
  enseignants
    .map((e) => ({
      value: buildActeurValue(e),
      label: e.mail ? `${acteurFullName(e)} · ${e.mail}` : acteurFullName(e),
    }))
    .filter((o) => o.value);

/** Sérialise un champ multi-select (tableau ou texte) en texte une-ligne-par-acteur. */
export const serializeActeurs = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const joined = value.map((v) => String(v).trim()).filter(Boolean).join("\n");
    return joined || undefined;
  }
  const str = String(value ?? "").trim();
  return str || undefined;
};

/** Parse un texte stocké en tableau de valeurs pour alimenter un multi-select. */
export const parseActeurs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
};

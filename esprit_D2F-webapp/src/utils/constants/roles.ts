export const ROLES = {
  ADMIN: 'admin',
  CUP: 'CUP',
  ENSEIGNANT: 'Enseignant',
  ANIMATEUR: 'Animateur',
  CHEF_DEPARTEMENT: 'CHEF_DEPARTEMENT',
  RESPONSABLE_DOSSIER: 'ResponsableDossier',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

/**
 * Normalise un rôle pour comparaison robuste : casse insensible, suppression du
 * préfixe Spring `ROLE_` et des séparateurs (espaces/_/-). Doit rester aligné sur
 * `normalizeRole` de routes/guards.tsx et sur le backend AuthorizationMatrix.
 */
export const normalizeRole = (role?: string | null): string =>
  (typeof role === 'string' ? role : '')
    .toLowerCase()
    .replace(/^role_?/, '')
    .replaceAll(/[\s_-]+/g, '');

export const isAdmin = (role?: string | null): boolean => extractRoles(role).includes('admin');

/**
 * Extrait les rôles individuels d'un scope JWT potentiellement composé.
 * Le claim `role` renvoyé par /auth/login est le scope brut (authorities jointes
 * par espaces), ex. "ROLE_D2F ROLE_RESPONSABLE_DOSSIER" → ['d2f', 'responsabledossier'].
 */
export const extractRoles = (role?: string | null): string[] =>
  (typeof role === 'string' ? role : '')
    .split(/[\s,;]+/)
    .map((token) => normalizeRole(token))
    .filter(Boolean);

/**
 * Rôle principal d'un scope potentiellement composé : le premier token connu
 * (présent dans `knownRoles`), sinon le premier token. Utilisé pour choisir le
 * menu latéral sans se perdre sur les rôles techniques (D2F, etc.).
 */
export const resolvePrimaryRole = (
  role?: string | null,
  knownRoles?: readonly string[],
): string => {
  const tokens = extractRoles(role);
  if (tokens.length === 0) return '';
  if (knownRoles && knownRoles.length > 0) {
    const known = tokens.find((token) => knownRoles.includes(token));
    if (known) return known;
  }
  return tokens[0];
};

/**
 * Vrai si au moins un rôle du scope (potentiellement composé) appartient aux
 * rôles requis. Remplace toute comparaison exacte `normalizeRole(user.role)`.
 */
export const hasAnyRole = (
  userRole?: string | null,
  requiredRoles?: readonly (string | null | undefined)[],
): boolean => {
  const userRoles = extractRoles(userRole);
  if (userRoles.length === 0) return false;
  const normalizedRequired = new Set(
    (requiredRoles ?? [])
      .filter((r): r is string => typeof r === 'string')
      .map((r) => normalizeRole(r)),
  );
  return userRoles.some((userRoleToken) => normalizedRequired.has(userRoleToken));
};

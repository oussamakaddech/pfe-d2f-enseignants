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

export const isAdmin = (role?: string | null): boolean => normalizeRole(role) === 'admin';

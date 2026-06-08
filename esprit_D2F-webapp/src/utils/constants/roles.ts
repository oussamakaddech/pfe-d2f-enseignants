export const ROLES = {
  ADMIN:               "admin",
  CUP:                 "CUP",
  ENSEIGNANT:          "Enseignant",
  ANIMATEUR:           "Animateur",
  CHEF_DEPARTEMENT:    "CHEF_DEPARTEMENT",
  RESPONSABLE_DOSSIER: "ResponsableDossier",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const isAdmin = (role?: string | null): boolean =>
  role?.toLowerCase() === "admin";

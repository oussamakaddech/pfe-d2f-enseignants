import type { NotificationCategory } from "./notification";

export * from "./notification";

/** Métadonnées d'affichage par catégorie (icône + couleur sémantique). */
export interface CategoryMeta {
  label: string;
  color: string;
  icon: string;
}

/** Mapping catégorie → libellé / couleur / icône Ant Design. */
export const CATEGORY_META: Record<NotificationCategory, CategoryMeta> = {
  FORMATION:   { label: "Formation",     color: "#b51200", icon: "BookOutlined" },
  EVALUATION:  { label: "Évaluation",    color: "#2563eb", icon: "FileDoneOutlined" },
  CERTIFICAT:  { label: "Certificat",    color: "#10b981", icon: "FileProtectOutlined" },
  BESOIN:      { label: "Besoin",        color: "#6366f1", icon: "BulbOutlined" },
  COMPETENCE:  { label: "Compétence",    color: "#0891b2", icon: "ThunderboltOutlined" },
  MESSAGE:     { label: "Message",       color: "#7c3aed", icon: "MessageOutlined" },
  SYSTEM:      { label: "Système",       color: "#718096", icon: "SettingOutlined" },
};

/** Couleur associée à chaque gravité (aligné sur tokens.ts). */
export const SEVERITY_COLOR = {
  info:    "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  error:   "#ef4444",
} as const;

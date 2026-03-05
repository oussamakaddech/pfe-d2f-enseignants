// src/pages/competence/rice/constants.js
// Shared constants, department configuration, and the DepartmentBadge component.

import { Tag } from "antd";

// ── Niveau options ─────────────────────────────────────────────────────────────
export const NIVEAU_OPTIONS = [
  { value: "N1_DEBUTANT",      label: "N1 – Débutant",      color: "default",  emoji: "🟤" },
  { value: "N2_ELEMENTAIRE",   label: "N2 – Élémentaire",   color: "blue",     emoji: "🔵" },
  { value: "N3_INTERMEDIAIRE", label: "N3 – Intermédiaire", color: "cyan",     emoji: "🟢" },
  { value: "N4_AVANCE",        label: "N4 – Avancé",        color: "green",    emoji: "🟡" },
  { value: "N5_EXPERT",        label: "N5 – Expert",        color: "gold",     emoji: "🟠" },
];

// ── Savoir type config ─────────────────────────────────────────────────────────
import { BookOutlined, ExperimentOutlined } from "@ant-design/icons";

export const TYPE_COLOR = { THEORIQUE: "purple", PRATIQUE: "volcano" };
export const TYPE_ICON  = { THEORIQUE: <BookOutlined />, PRATIQUE: <ExperimentOutlined /> };
export const TYPE_LABEL = { THEORIQUE: "Théorique", PRATIQUE: "Pratique" };

// ── Department configuration ────────────────────────────────────────────────────
export const DepartmentConfig = {
  gc: {
    code:        "gc",
    nom:         "Génie Civil",
    shortNom:    "GC",
    color:       "#52c41a",
    tagColor:    "green",
    icon:        "🏗️",
    description: "Bâtiment, Géotechnique, Hydraulique, Urbanisme",
    campus:      "Tunis",
  },
  info: {
    code:        "info",
    nom:         "Informatique",
    shortNom:    "INFO",
    color:       "#1890ff",
    tagColor:    "blue",
    icon:        "💻",
    description: "Développement Logiciel, IA, Réseaux, Cloud",
    campus:      "Tunis",
  },
  telecom: {
    code:        "telecom",
    nom:         "Télécommunications",
    shortNom:    "TELECOM",
    color:       "#722ed1",
    tagColor:    "purple",
    icon:        "📡",
    description: "Réseaux Mobiles, IoT, Cybersécurité, Signal",
    campus:      "Tunis",
  },
  ge: {
    code:        "ge",
    nom:         "Génie Électrique",
    shortNom:    "GÉ",
    color:       "#fa541c",
    tagColor:    "volcano",
    icon:        "⚡",
    description: "Électrotechnique, Automatique, Mécatronique",
    campus:      "Monastir",
  },
  meca: {
    code:        "meca",
    nom:         "Génie Mécatronique",
    shortNom:    "MECA",
    color:       "#fa8c16",
    tagColor:    "orange",
    icon:        "🔧",
    description: "Robotique, Systèmes de Production, CAO",
    campus:      "Monastir",
  },
};

/** useDepartmentConfig – returns department config for a given code. */
export function useDepartmentConfig(deptCode) {
  return DepartmentConfig[deptCode?.toLowerCase()?.trim()] ?? DepartmentConfig.gc;
}

/** DepartmentBadge – inline component to display a department badge. */
// eslint-disable-next-line react/prop-types
export function DepartmentBadge({ deptCode, showIcon = true, style = {} }) {
  const cfg = useDepartmentConfig(deptCode);
  return (
    <Tag
      color={cfg.tagColor}
      style={{ fontWeight: 600, fontSize: 12, ...style }}
      title={cfg.description}
    >
      {showIcon && <span style={{ marginRight: 4 }}>{cfg.icon}</span>}
      {cfg.shortNom}
    </Tag>
  );
}

/** All ESPRIT department options (for Select dropdowns). */
export const DEPARTMENT_OPTIONS = Object.values(DepartmentConfig).map((cfg) => ({
  value: cfg.code,
  label: (
    <span>
      <span style={{ marginRight: 6 }}>{cfg.icon}</span>
      {cfg.nom}
      <span style={{ marginLeft: 8, color: "#8c8c8c", fontSize: 11 }}>
        [{cfg.campus}]
      </span>
    </span>
  ),
  labelText: cfg.nom,
}));

// ── Helpers ────────────────────────────────────────────────────────────────────
export const cloneDeep = (x) => {
  try {
    if (typeof structuredClone === "function") return structuredClone(x);
  } catch { /* fall through */ }
  return JSON.parse(JSON.stringify(x));
};

export const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const STORAGE_KEY = "rice_session_v2";

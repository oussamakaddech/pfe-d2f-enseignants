// Shared constants, department configuration, and the DepartmentBadge component.

import type React from "react";
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

export const TYPE_COLOR: Record<string, string> = { THEORIQUE: "purple", PRATIQUE: "volcano" };
export const TYPE_ICON: Record<string, React.ReactNode> = { THEORIQUE: <BookOutlined />, PRATIQUE: <ExperimentOutlined /> };
export const TYPE_LABEL: Record<string, string> = { THEORIQUE: "Théorique", PRATIQUE: "Pratique" };

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
export function useDepartmentConfig(deptCode?: string) {
  return DepartmentConfig[deptCode?.toLowerCase()?.trim() as keyof typeof DepartmentConfig] ?? DepartmentConfig.gc;
}

interface DepartmentBadgeProps { deptCode?: string; showIcon?: boolean; style?: React.CSSProperties }

/** DepartmentBadge – inline component to display a department badge. */
export function DepartmentBadge({ deptCode, showIcon = true, style = {} }: Readonly<DepartmentBadgeProps>) {
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
export const cloneDeep = (x: unknown) => {
  try {
    if (typeof structuredClone === "function") return structuredClone(x);
  } catch { /* fall through */ }
  return JSON.parse(JSON.stringify(x));
};

export const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const STORAGE_KEY = "rice_session_v2";

// ── Internal type helpers ────────────────────────────────────────────────────────
interface SavoirItem {
  code?: string;
  nom?: string;
  enseignantsSuggeres?: unknown[];
  aiSuggestedIds?: string[];
  refCodes?: string[];
}

interface SousCompetence { savoirs?: SavoirItem[] }

interface CompetenceItem {
  savoirs?: SavoirItem[];
  sousCompetences?: SousCompetence[];
}

interface DomaineItem { competences?: CompetenceItem[] }

type LoadMap = Map<string, { count: number; savoirCodes: string[]; refCodes: string[] }>;

interface EnseignantItem {
  id?: string | number;
  enseignantId?: string | number;
  modules?: string[];
}

interface EnseignantMatch extends Record<string, unknown> {
  source: "ai" | "module_match" | "manual";
}
// ─────────────────────────────────────────────────────────────────────────────────

function addSavoirToLoad(load: LoadMap, savoir: SavoirItem) {
  (savoir.enseignantsSuggeres ?? []).forEach((eid: unknown) => {
    const key = String(eid);
    if (!load.has(key)) {
      load.set(key, { count: 0, savoirCodes: [], refCodes: [] });
    }
    const entry = load.get(key)!;
    entry.count += 1;
    entry.savoirCodes.push(savoir.code ?? "");
    entry.refCodes.push(...(savoir.refCodes ?? []));
  });
}

function processCompLoad(comp: CompetenceItem, load: LoadMap) {
  (comp.savoirs ?? []).forEach((savoir: SavoirItem) => addSavoirToLoad(load, savoir));
  (comp.sousCompetences ?? []).forEach((sc: SousCompetence) => {
    (sc.savoirs ?? []).forEach((savoir: SavoirItem) => addSavoirToLoad(load, savoir));
  });
}

/** Calculer la charge de chaque enseignant depuis le tree. */
export function computeEnseignantLoad(tree: DomaineItem[]) {
  const load: LoadMap = new Map();
  (tree ?? []).forEach((domaine: DomaineItem) => {
    (domaine.competences ?? []).forEach((comp: CompetenceItem) => processCompLoad(comp, load));
  });
  return load;
}

function countCompSavoirs(comp: CompetenceItem) {
  let total = 0;
  let covered = 0;
  (comp.savoirs ?? []).forEach((s: SavoirItem) => {
    total += 1;
    if ((s.enseignantsSuggeres ?? []).length > 0) covered += 1;
  });
  (comp.sousCompetences ?? []).forEach((sc: SousCompetence) => {
    (sc.savoirs ?? []).forEach((s: SavoirItem) => {
      total += 1;
      if ((s.enseignantsSuggeres ?? []).length > 0) covered += 1;
    });
  });
  return { total, covered };
}

/** Calculer le taux de couverture (% savoirs avec >= 1 enseignant). */
export function computeCoveragePct(tree: DomaineItem[]) {
  let total = 0;
  let covered = 0;
  (tree ?? []).forEach((d: DomaineItem) => {
    (d.competences ?? []).forEach((c: CompetenceItem) => {
      const r = countCompSavoirs(c);
      total += r.total;
      covered += r.covered;
    });
  });
  return total === 0 ? 0 : Math.round((covered / total) * 100);
}

/** Générer initiales depuis nom/prénom. */
export function getInitials(nom?: string, prenom?: string) {
  const n = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`;
  return n.toUpperCase() || "?";
}

const AVATAR_COLORS = [
  "#1677ff", "#52c41a", "#722ed1", "#fa8c16",
  "#eb2f96", "#13c2c2", "#fa541c", "#2f54eb",
];

/** Couleur d'avatar déterministe par ID. */
export function avatarColor(id: string | number) {
  let hash = 0;
  String(id).split("").forEach((c) => {
    hash = (c.codePointAt(0) ?? 0) + ((hash << 5) - hash);
  });
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function normalize(str: string) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "");
}

export function matchSuggestedEnseignants(savoir: SavoirItem, allEnseignants: EnseignantItem[]) {
  const aiSuggestedIds = new Set(
    (savoir?.aiSuggestedIds ?? savoir?.enseignantsSuggeres ?? []).map(String),
  );
  const savoirWords = normalize(savoir?.nom ?? "")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  let suggested: EnseignantMatch[] = [];
  let others: EnseignantMatch[] = [];

  (allEnseignants ?? []).forEach((e: EnseignantItem) => {
    const id = String(e.id ?? e.enseignantId);
    const moduleMatch = (e.modules ?? []).some((mod: string) =>
      savoirWords.some((w) => normalize(mod).includes(w)),
    );

    if (aiSuggestedIds.has(id)) {
      suggested.push({ ...e, source: "ai" });
    } else if (moduleMatch) {
      suggested.push({ ...e, source: "module_match" });
    } else {
      others.push({ ...e, source: "manual" });
    }
  });

  return { suggested, others };
}







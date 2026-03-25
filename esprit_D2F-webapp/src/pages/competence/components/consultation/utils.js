import { NIVEAU_SAVOIR_OPTIONS } from "../../constants/competenceOptions";

export const ACCENT = {
  domaine: { color: "#2563eb", bg: "#eff6ff", badgeCls: "ctp-badge--domaine" },
  competence: { color: "#16a34a", bg: "#f0fdf4", badgeCls: "ctp-badge--competence" },
  sousComp: { color: "#d97706", bg: "#fffbeb", badgeCls: "ctp-badge--sousc" },
  savoir: { color: "#7c3aed", bg: "#f5f3ff", badgeCls: "ctp-badge--savoir" },
  theorique: { color: "#0d9488", bg: "#f0fdfa", badgeCls: "ctp-badge--theorique" },
  pratique: { color: "#e11d48", bg: "#fff1f2", badgeCls: "ctp-badge--pratique" },
  muted: { color: "#475569", bg: "#f1f5f9", badgeCls: "ctp-badge--muted" },
};

export const COMP_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0f766e",
  "#be123c",
  "#0ea5e9",
  "#9333ea",
];

export const DISPLAY_MODE_KEY = "ctp-display-mode-v2";
export const OPEN_COMPS_KEY = "ctp-open-comps";
export const ACTIVE_COMP_KEY = "ctp-active-comp";

export function toNiveauRank(niveau) {
  if (niveau == null) return 999;
  const asText = String(niveau).trim();
  const match = asText.match(/(\d+)/);
  return match ? Number(match[1]) : 999;
}

export function formatNiveau(niveau) {
  const hit = NIVEAU_SAVOIR_OPTIONS?.find((n) => String(n.value) === String(niveau));
  return hit?.label || (niveau ? `Niveau ${niveau}` : "-");
}

export function getNiveauStyle(niveau) {
  const rank = toNiveauRank(niveau);
  const map = {
    1: { color: "#9a3412", bg: "#ffedd5", border: "#fdba74" },
    2: { color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
    3: { color: "#0f766e", bg: "#ccfbf1", border: "#5eead4" },
    4: { color: "#166534", bg: "#dcfce7", border: "#86efac" },
    5: { color: "#7c2d12", bg: "#fef3c7", border: "#fcd34d" },
  };
  return map[rank] || { color: "#334155", bg: "#e2e8f0", border: "#cbd5e1" };
}

export function getTypeLabel(type) {
  if (type === "THEORIQUE") return "theorique";
  if (type === "PRATIQUE") return "pratique";
  return "-";
}

export function getTypeBadge(type) {
  return type === "THEORIQUE" ? "theorique" : "pratique";
}

export function buildFlatSavoirs(crud) {
  const domaines = crud.domaines || [];
  const competences = crud.competences || [];
  const sousComps = crud.sousComps || [];
  const savoirs = crud.savoirs || [];

  const domaineById = new Map(domaines.map((d) => [String(d.id), d]));
  const compById = new Map(competences.map((c) => [String(c.id), c]));
  const scById = new Map(sousComps.map((sc) => [String(sc.id), sc]));

  return savoirs.map((s) => {
    const sc = s?.sousCompetenceId != null ? scById.get(String(s.sousCompetenceId)) : null;
    const comp = sc
      ? compById.get(String(sc.competenceId))
      : s?.competenceId != null
        ? compById.get(String(s.competenceId))
        : null;
    const domaine = comp ? domaineById.get(String(comp.domaineId)) : null;

    return {
      id: s.id,
      code: s.code || "-",
      nom: s.nom || "-",
      description: s.description || "",
      type: s.type || "",
      niveau: s.niveau,
      sousCompetenceId: sc?.id ?? null,
      sousCompetenceNom: sc?.nom || null,
      competenceId: comp?.id != null ? String(comp.id) : null,
      competenceCode: comp?.code || null,
      competenceNom: comp?.nom || "Sans competence",
      domaineId: domaine?.id ?? null,
      domaineCode: domaine?.code || null,
      domaineNom: domaine?.nom || "Sans domaine",
      isDirect: !sc,
    };
  });
}

export function getFilteredCrud(crud, domaineId) {
  const { domaines = [], competences = [], sousComps = [], savoirs = [] } = crud;
  if (!domaineId) return { domaines, competences, sousComps, savoirs };

  const filteredDomaines = domaines.filter((d) => String(d.id) === String(domaineId));
  const filteredComps = competences.filter((c) => String(c.domaineId) === String(domaineId));
  const compIdSet = new Set(filteredComps.map((c) => String(c.id)));
  const filteredScs = sousComps.filter((sc) => compIdSet.has(String(sc.competenceId)));
  const scIdSet = new Set(filteredScs.map((sc) => String(sc.id)));
  const directSavoirs = savoirs.filter((s) => s.competenceId != null && compIdSet.has(String(s.competenceId)));
  const filteredSavoirs = savoirs.filter((s) => scIdSet.has(String(s.sousCompetenceId)) || directSavoirs.includes(s));

  return {
    domaines: filteredDomaines,
    competences: filteredComps,
    sousComps: filteredScs,
    savoirs: filteredSavoirs,
  };
}

export function hasAnyActiveFilters(filters, debouncedQ) {
  if (!filters) return false;
  const query = (debouncedQ ?? filters.q ?? "").trim();
  return query.length > 0 || filters.type !== "ALL" || filters.niveau !== "ALL";
}

export function buildFilterChips(filters) {
  if (!filters) return [];
  const chips = [];

  if (filters.type !== "ALL") {
    chips.push({
      key: "type",
      label: filters.type === "THEORIQUE" ? "Theorique" : "Pratique",
      color: filters.type === "THEORIQUE" ? "theorique" : "pratique",
    });
  }

  if (filters.niveau !== "ALL") {
    chips.push({ key: "niveau", label: formatNiveau(filters.niveau), color: "muted" });
  }

  if (filters.q?.trim()) {
    chips.push({ key: "q", label: `"${filters.q.trim()}"`, color: "muted" });
  }

  return chips;
}

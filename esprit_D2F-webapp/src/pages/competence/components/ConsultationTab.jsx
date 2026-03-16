/* eslint-disable react/prop-types */
/**
 * ConsultationTab.jsx  —  White / light theme, redesigned from scratch.
 * All original props are preserved exactly as received from CompetencePage.jsx.
 * Companion stylesheet: ConsultationTab.css
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  CloseOutlined,
  CodeOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import {
  Button,
  Drawer,
  Dropdown,
  Empty,
  Input,
  message,
  Radio,
  Select,
  Spin,
  Tag,
  Tree as AntTree,
} from "antd";
import D3Tree from "react-d3-tree";
import * as XLSX from "xlsx";
import StructureSearchResultsView from "./StructureSearchResultsView";
import { NIVEAU_SAVOIR_OPTIONS } from "../constants/competenceOptions";
import "./ConsultationTab.css";

const { Option } = Select;
const { Search } = Input;

/* ─────────────────────────────────────────────────────────────────────
   DESIGN CONFIG  (JS side only — CSS vars handle static theming)
   These are needed for: D3 node colors, dynamic inline border/bg
   on a per-item basis where CSS alone can't vary by type.
───────────────────────────────────────────────────────────────────── */
const ACCENT = {
  domaine:    { color: "#2563eb", bg: "#eff6ff", badgeCls: "ctp-badge--domaine"    },
  competence: { color: "#16a34a", bg: "#f0fdf4", badgeCls: "ctp-badge--competence" },
  sousComp:   { color: "#d97706", bg: "#fffbeb", badgeCls: "ctp-badge--sousc"      },
  savoir:     { color: "#7c3aed", bg: "#f5f3ff", badgeCls: "ctp-badge--savoir"     },
  theorique:  { color: "#0d9488", bg: "#f0fdfa", badgeCls: "ctp-badge--theorique"  },
  pratique:   { color: "#e11d48", bg: "#fff1f2", badgeCls: "ctp-badge--pratique"   },
  muted:      { color: "#475569", bg: "#f1f5f9", badgeCls: "ctp-badge--muted"      },
};

const STAT_DEFS = [
  { key: "domaines",        label: "Domaines",       statKey: "totalDomaines",         icon: <FolderOpenOutlined />, accent: ACCENT.domaine    },
  { key: "competences",     label: "Compétences",    statKey: "totalCompetences",       icon: <ApartmentOutlined />, accent: ACCENT.competence },
  { key: "sousCompetences", label: "Sous-comp.",     statKey: "totalSousCompetences",   icon: <BulbOutlined />,      accent: ACCENT.sousComp   },
  { key: "savoirs",         label: "Savoirs",        statKey: "totalSavoirs",           icon: <BookOutlined />,      accent: ACCENT.savoir     },
  { key: "theoriques",      label: "Théoriques",     statKey: "totalSavoirsTheoriques", icon: <BookOutlined />,      accent: ACCENT.theorique  },
  { key: "pratiques",       label: "Pratiques",      statKey: "totalSavoirsPratiques",  icon: <ExperimentOutlined />,accent: ACCENT.pratique   },
];

/* ─────────────────────────────────────────────────────────────────────
   ATOMS
───────────────────────────────────────────────────────────────────── */
function Badge({ text, type = "muted" }) {
  const cls = ACCENT[type]?.badgeCls || "ctp-badge--muted";
  return <span className={`ctp-badge ${cls}`}>{text}</span>;
}

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/* ─────────────────────────────────────────────────────────────────────
   SEARCH + FILTER BAR
───────────────────────────────────────────────────────────────────── */
function SearchBar({ structure }) {
  return (
    <div className="ctp-search-card ctp-section">
      <div className="ctp-filter-row">
        <div className="ctp-filter-row__domain">
          <Select
            loading={structure.structureLoading}
            placeholder={structure.structureLoading ? "Chargement…" : "Filtrer par domaine"}
            allowClear
            style={{ width: "100%" }}
            value={structure.selectedDomaine}
            onChange={(val) => structure.setSelectedDomaine(val)}
          >
            {structure.structure?.domaines?.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.nom} ({d.code})
              </Option>
            ))}
          </Select>
        </div>

        <div className="ctp-filter-row__search">
          <Search
            placeholder="Rechercher par mot-clé, code, description…"
            enterButton={structure.searchLoading ? "Recherche…" : "Rechercher"}
            loading={structure.searchLoading}
            value={structure.searchKeyword}
            onChange={(e) => structure.setSearchKeyword(e.target.value)}
            onSearch={structure.handleSearch}
            allowClear
            onClear={structure.handleClearSearch}
          />
        </div>
      </div>

      {structure.searchKeyword?.trim().length > 0 &&
        structure.searchKeyword?.trim().length < 2 && (
          <span className="ctp-search-hint">
            Saisissez au moins 2 caractères pour lancer la recherche
          </span>
        )}

      {structure.selectedDomaine && (
        <div className="ctp-filter-tag-row">
          <SearchOutlined style={{ color: "#2563eb", fontSize: 13 }} />
          <span className="ctp-filter-tag-label">Filtrage :</span>
          <Tag
            closable
            onClose={() => structure.setSelectedDomaine(null)}
            color="blue"
          >
            {structure.structure?.domaines?.find(
              (d) => d.id === structure.selectedDomaine,
            )?.nom}
          </Tag>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   STAT CARDS
───────────────────────────────────────────────────────────────────── */
function StatCards({ stats, activePanel, setActivePanel }) {
  return (
    <div className="ctp-stat-grid ctp-section">
      {STAT_DEFS.map((def) => {
        const active = activePanel === def.key;
        return (
          <button
            key={def.key}
            className={`ctp-stat-card${active ? " ctp-stat-card--active" : ""}`}
            style={{ "--ctp-stat-accent": def.accent.color }}
            onClick={() =>
              setActivePanel((prev) => (prev === def.key ? null : def.key))
            }
          >
            <div className="ctp-stat-card__head">
              <div
                className="ctp-stat-card__icon"
                style={{ background: def.accent.bg, color: def.accent.color }}
              >
                {def.icon}
              </div>
              <span className="ctp-stat-card__arrow">
                {active ? "▲" : "▼"}
              </span>
            </div>
            <div className="ctp-stat-card__value">
              {stats?.[def.statKey] ?? 0}
            </div>
            <div className="ctp-stat-card__label">{def.label}</div>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   INLINE EXPAND PANEL  (shown on stat card click)
───────────────────────────────────────────────────────────────────── */
function ExpandPanel({ panelKey, crud, onClose }) {
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [panelKey]);

  const panelData = useMemo(() => {
    const { domaines = [], competences = [], sousComps = [], savoirs = [] } = crud;

    const competenceByDomain = competences.reduce((acc, c) => {
      const key = String(c.domaineId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const sousCompByCompetence = sousComps.reduce((acc, s) => {
      const key = String(s.competenceId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const savoirBySousComp = savoirs.reduce((acc, s) => {
      const key = String(s.sousCompetenceId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const map = {
      domaines: {
        label: "Domaines",
        accent: ACCENT.domaine,
        rows: [...domaines]
          .sort(
            (a, b) =>
              (competenceByDomain[String(b.id)] || 0) -
              (competenceByDomain[String(a.id)] || 0),
          )
          .map((d) => ({
            name: d.nom,
            code: d.code,
            sub: "Niveau 1",
            metric: `${competenceByDomain[String(d.id)] || 0} compétences`,
            tag: null,
          })),
      },
      competences: {
        label: "Compétences",
        accent: ACCENT.competence,
        rows: competences.map((c) => ({
          name: c.nom,
          code: c.code,
          sub: domaines.find((d) => d.id === c.domaineId)?.nom,
          metric: `${sousCompByCompetence[String(c.id)] || 0} sous-compétences`,
          tag: "compétence",
          tagType: "competence",
        })),
      },
      sousCompetences: {
        label: "Sous-compétences",
        accent: ACCENT.sousComp,
        rows: sousComps.map((s) => ({
          name: s.nom,
          code: s.code,
          sub: competences.find((c) => c.id === s.competenceId)?.nom,
          metric: `${savoirBySousComp[String(s.id)] || 0} savoir(s)`,
          tag: "sous-comp.",
          tagType: "sousc",
        })),
      },
      savoirs: {
        label: "Savoirs",
        accent: ACCENT.savoir,
        rows: savoirs.map((s) => ({
          name: s.nom,
          code: s.code,
          sub:
            sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId))
              ?.nom || null,
          metric: `Niveau ${s.niveau}`,
          tag: s.type === "THEORIQUE" ? "théorique" : "pratique",
          tagType: s.type === "THEORIQUE" ? "theorique" : "pratique",
        })),
      },
      theoriques: {
        label: "Savoirs théoriques",
        accent: ACCENT.theorique,
        rows: savoirs
          .filter((s) => s.type === "THEORIQUE")
          .map((s) => ({
            name: s.nom,
            code: s.code,
            sub:
              sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId))
                ?.nom || null,
            metric: `Niveau ${s.niveau}`,
            tag: "théorique",
            tagType: "theorique",
          })),
      },
      pratiques: {
        label: "Savoirs pratiques",
        accent: ACCENT.pratique,
        rows: savoirs
          .filter((s) => s.type === "PRATIQUE")
          .map((s) => ({
            name: s.nom,
            code: s.code,
            sub:
              sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId))
                ?.nom || null,
            metric: `Niveau ${s.niveau}`,
            tag: "pratique",
            tagType: "pratique",
          })),
      },
    };
    return map[panelKey] || null;
  }, [panelKey, crud]);

  if (!panelData) return null;
  const { label, accent, rows } = panelData;
  const totalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div
      className="ctp-expand-panel ctp-section"
      style={{ borderColor: `${accent.color}44` }}
    >
      <div className="ctp-expand-panel__header">
        <div className="ctp-expand-panel__title">
          <div
            className="ctp-expand-panel__icon"
            style={{ background: accent.bg, color: accent.color }}
          >
            {STAT_DEFS.find((d) => d.key === panelKey)?.icon}
          </div>
          <span>{label}</span>
          <span className="ctp-expand-panel__count">{rows.length}</span>
        </div>
        <button className="ctp-expand-panel__close" onClick={onClose}>
          <CloseOutlined style={{ fontSize: 12 }} />
        </button>
      </div>

      {rows.length === 0 ? (
        <Empty description="Aucune donnée disponible" />
      ) : (
        <>
          {rows.length > PAGE_SIZE && (
            <div className="ctp-info-pill" role="status">
              Affichage limité à {PAGE_SIZE} éléments par page ({rows.length} au total)
            </div>
          )}
          <div className="ctp-expand-grid">
          {pageRows.map((row, i) => (
            <div key={`${row.code || row.name}-${i}`} className="ctp-expand-item">
              <div className="ctp-expand-item__left">
                <div className="ctp-expand-item__name">{row.name}</div>
                {row.sub && (
                  <div className="ctp-expand-item__sub">{row.sub}</div>
                )}
                {row.metric && (
                  <div className="ctp-expand-item__metric">{row.metric}</div>
                )}
              </div>
              <div className="ctp-expand-item__meta">
                {row.tag && (
                  <Badge text={row.tag} type={row.tagType || "muted"} />
                )}
                <span className="ctp-expand-item__code">{row.code}</span>
              </div>
            </div>
          ))}
          </div>
          {rows.length > PAGE_SIZE && (
            <div className="ctp-expand-pagination">
              <Button size="small" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Précédent
              </Button>
              <span>
                Page {safePage} / {totalPages}
              </span>
              <Button
                size="small"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   EXPORT UTILITIES  —  client-side helpers, no server round-trip
───────────────────────────────────────────────────────────────────── */

function getExportDateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function getFilteredCrud(crud, domaineId) {
  const { domaines = [], competences = [], sousComps = [], savoirs = [] } = crud;
  if (!domaineId) return { domaines, competences, sousComps, savoirs };
  const filteredDomaines = domaines.filter((d) => String(d.id) === String(domaineId));
  const filteredComps    = competences.filter((c) => String(c.domaineId) === String(domaineId));
  const compIdSet        = new Set(filteredComps.map((c) => String(c.id)));
  const filteredScs      = sousComps.filter((sc) => compIdSet.has(String(sc.competenceId)));
  const scIdSet          = new Set(filteredScs.map((sc) => String(sc.id)));
  const filteredSavoirs  = savoirs.filter((s) => scIdSet.has(String(s.sousCompetenceId)));
  return { domaines: filteredDomaines, competences: filteredComps, sousComps: filteredScs, savoirs: filteredSavoirs };
}

function buildCSVString(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body   = rows.map((row) =>
    columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","),
  );
  return [header, ...body].join("\n");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function doExportStructureExcel(crud, domaineId) {
  const f   = getFilteredCrud(crud, domaineId);
  const wb  = XLSX.utils.book_new();
  const sfx = domaineId ? "_domaine" : "_complet";
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      f.domaines.map((d) => ({
        Code: d.code,
        Nom: d.nom,
        "Nb Compétences": f.competences.filter((c) => String(c.domaineId) === String(d.id)).length,
      })),
    ),
    "Domaines",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      f.competences.map((c) => ({
        Code: c.code,
        Nom: c.nom,
        Domaine: f.domaines.find((d) => String(d.id) === String(c.domaineId))?.nom || "",
        "Nb Sous-comp.": f.sousComps.filter((sc) => String(sc.competenceId) === String(c.id)).length,
      })),
    ),
    "Compétences",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      f.sousComps.map((sc) => ({
        Code: sc.code,
        Nom: sc.nom,
        Compétence: f.competences.find((c) => String(c.id) === String(sc.competenceId))?.nom || "",
        Parent: sc.parentId
          ? f.sousComps.find((p) => String(p.id) === String(sc.parentId))?.nom || ""
          : "",
      })),
    ),
    "Sous-compétences",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      f.savoirs.map((s) => {
        const fsc  = f.sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId));
        const comp = fsc ? f.competences.find((c) => String(c.id) === String(fsc.competenceId)) : null;
        return {
          Code: s.code,
          Nom: s.nom,
          Type: s.type,
          Niveau: s.niveau,
          "Sous-compétence": fsc?.nom || "",
          Compétence: comp?.nom || "",
        };
      }),
    ),
    "Savoirs",
  );
  XLSX.writeFile(wb, `structure${sfx}_${getExportDateSuffix()}.xlsx`);
}

function doExportSavoirsExcel(crud, domaineId) {
  const f   = getFilteredCrud(crud, domaineId);
  const sfx = domaineId ? "_domaine" : "";
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      f.savoirs.map((s) => {
        const fsc  = f.sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId));
        const comp = fsc ? f.competences.find((c) => String(c.id) === String(fsc.competenceId)) : null;
        const dom  = comp ? f.domaines.find((d) => String(d.id) === String(comp.domaineId)) : null;
        return {
          Code: s.code,
          Nom: s.nom,
          Type: s.type,
          Niveau: s.niveau,
          "Sous-compétence": fsc?.nom || "",
          Compétence: comp?.nom || "",
          Domaine: dom?.nom || "",
        };
      }),
    ),
    "Savoirs",
  );
  XLSX.writeFile(wb, `savoirs${sfx}_${getExportDateSuffix()}.xlsx`);
}

function doExportSynthesisExcel(crud, stats) {
  const wb        = XLSX.utils.book_new();
  const statsRows = [
    { Indicateur: "Domaines",           Valeur: stats?.totalDomaines          ?? (crud.domaines    || []).length },
    { Indicateur: "Compétences",        Valeur: stats?.totalCompetences        ?? (crud.competences || []).length },
    { Indicateur: "Sous-compétences",   Valeur: stats?.totalSousCompetences    ?? (crud.sousComps   || []).length },
    { Indicateur: "Savoirs",            Valeur: stats?.totalSavoirs            ?? (crud.savoirs     || []).length },
    { Indicateur: "Savoirs théoriques", Valeur: stats?.totalSavoirsTheoriques  ?? (crud.savoirs || []).filter((s) => s.type === "THEORIQUE").length },
    { Indicateur: "Savoirs pratiques",  Valeur: stats?.totalSavoirsPratiques   ?? (crud.savoirs || []).filter((s) => s.type === "PRATIQUE").length },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), "Statistiques");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      (crud.domaines || []).map((d) => {
        const comps   = (crud.competences || []).filter((c) => String(c.domaineId) === String(d.id));
        const compIds = new Set(comps.map((c) => String(c.id)));
        const scs     = (crud.sousComps   || []).filter((sc) => compIds.has(String(sc.competenceId)));
        const scIds   = new Set(scs.map((sc) => String(sc.id)));
        const savs    = (crud.savoirs     || []).filter((s) => scIds.has(String(s.sousCompetenceId)));
        return {
          Code:         d.code,
          Domaine:      d.nom,
          Compétences:  comps.length,
          "Sous-comp.": scs.length,
          Savoirs:      savs.length,
          Théoriques:   savs.filter((s) => s.type === "THEORIQUE").length,
          Pratiques:    savs.filter((s) => s.type === "PRATIQUE").length,
        };
      }),
    ),
    "Par domaine",
  );
  XLSX.writeFile(wb, `synthese_referentiel_${getExportDateSuffix()}.xlsx`);
}

function doExportSavoirsCSV(crud, domaineId) {
  const f       = getFilteredCrud(crud, domaineId);
  const sfx     = domaineId ? "_domaine" : "";
  const columns = [
    { key: "code",    label: "Code" },
    { key: "nom",     label: "Nom" },
    { key: "type",    label: "Type" },
    { key: "niveau",  label: "Niveau" },
    { key: "sousc",   label: "Sous-compétence" },
    { key: "comp",    label: "Compétence" },
    { key: "domaine", label: "Domaine" },
  ];
  const rows = f.savoirs.map((s) => {
    const fsc  = f.sousComps.find((sc) => String(sc.id) === String(s.sousCompetenceId));
    const comp = fsc ? f.competences.find((c) => String(c.id) === String(fsc.competenceId)) : null;
    const dom  = comp ? f.domaines.find((d) => String(d.id) === String(comp.domaineId)) : null;
    return { code: s.code, nom: s.nom, type: s.type, niveau: s.niveau, sousc: fsc?.nom || "", comp: comp?.nom || "", domaine: dom?.nom || "" };
  });
  downloadFile("\uFEFF" + buildCSVString(rows, columns), `savoirs${sfx}_${getExportDateSuffix()}.csv`, "text/csv;charset=utf-8;");
}

function doExportCompetencesCSV(crud, domaineId) {
  const f       = getFilteredCrud(crud, domaineId);
  const sfx     = domaineId ? "_domaine" : "";
  const columns = [
    { key: "code",        label: "Code" },
    { key: "nom",         label: "Nom" },
    { key: "domaine",     label: "Domaine" },
    { key: "nbSousComps", label: "Nb Sous-comp." },
    { key: "nbSavoirs",   label: "Nb Savoirs" },
  ];
  const rows = f.competences.map((c) => {
    const scs   = f.sousComps.filter((sc) => String(sc.competenceId) === String(c.id));
    const scIds = new Set(scs.map((sc) => String(sc.id)));
    return {
      code:        c.code,
      nom:         c.nom,
      domaine:     f.domaines.find((d) => String(d.id) === String(c.domaineId))?.nom || "",
      nbSousComps: scs.length,
      nbSavoirs:   f.savoirs.filter((s) => scIds.has(String(s.sousCompetenceId))).length,
    };
  });
  downloadFile("\uFEFF" + buildCSVString(rows, columns), `competences${sfx}_${getExportDateSuffix()}.csv`, "text/csv;charset=utf-8;");
}

function doExportStructureJSON(crud) {
  const json = {
    exportedAt: new Date().toISOString(),
    stats: {
      domaines:        (crud.domaines     || []).length,
      competences:     (crud.competences  || []).length,
      sousCompetences: (crud.sousComps    || []).length,
      savoirs:         (crud.savoirs      || []).length,
    },
    domaines: (crud.domaines || []).map((d) => ({
      id: d.id, code: d.code, nom: d.nom,
      competences: (crud.competences || [])
        .filter((c) => String(c.domaineId) === String(d.id))
        .map((c) => {
          const scs = (crud.sousComps || []).filter((sc) => String(sc.competenceId) === String(c.id));
          return {
            id: c.id, code: c.code, nom: c.nom,
            sousCompetences: scs.map((sc) => ({
              id: sc.id, code: sc.code, nom: sc.nom, parentId: sc.parentId || null,
              savoirs: (crud.savoirs || [])
                .filter((s) => String(s.sousCompetenceId) === String(sc.id))
                .map((s) => ({ id: s.id, code: s.code, nom: s.nom, type: s.type, niveau: s.niveau })),
            })),
          };
        }),
    })),
  };
  downloadFile(JSON.stringify(json, null, 2), `structure_${getExportDateSuffix()}.json`, "application/json");
}

/* ─────────────────────────────────────────────────────────────────────
   EXPORT MENU
───────────────────────────────────────────────────────────────────── */
function ExportMenu({ crud, structure, stats, handleExportExcel }) {
  const [loading, setLoading] = useState(false);
  const [messageApi, ctxHolder] = message.useMessage();

  const domaineId   = structure.selectedDomaine;
  const domaineName = useMemo(
    () =>
      domaineId
        ? structure.structure?.domaines?.find((d) => String(d.id) === String(domaineId))?.nom
        : null,
    [domaineId, structure.structure?.domaines],
  );

  const exportStats = useMemo(() => {
    const f = getFilteredCrud(crud, domaineId);
    return { domaines: f.domaines.length, competences: f.competences.length, savoirs: f.savoirs.length };
  }, [crud, domaineId]);

  const run = useCallback(
    async (key) => {
      setLoading(true);
      try {
        localStorage.setItem("ctp-export-format", key);
        if      (key === "excel-full")      { doExportStructureExcel(crud, domaineId);  messageApi.success("Structure Excel générée !"); }
        else if (key === "excel-savoirs")   { doExportSavoirsExcel(crud, domaineId);    messageApi.success("Excel savoirs généré !"); }
        else if (key === "excel-synthesis") { doExportSynthesisExcel(crud, stats);      messageApi.success("Synthèse Excel générée !"); }
        else if (key === "excel-matrix")    { handleExportExcel();                       messageApi.success("Matrice Excel exportée."); }
        else if (key === "csv-savoirs")     { doExportSavoirsCSV(crud, domaineId);      messageApi.success("CSV savoirs généré !"); }
        else if (key === "csv-competences") { doExportCompetencesCSV(crud, domaineId);  messageApi.success("CSV compétences généré !"); }
        else if (key === "json-full")       { doExportStructureJSON(crud);               messageApi.success("JSON structure généré !"); }
      } catch (err) {
        messageApi.error(`Erreur export : ${err?.message || "inconnue"}`);
      } finally {
        setLoading(false);
      }
    },
    [crud, domaineId, handleExportExcel, messageApi, stats],
  );

  const filterSuffix = domaineName ? ` — ${domaineName}` : "";

  const menuItems = [
    {
      type: "group",
      label: <span className="ctp-export-group-label"><FileExcelOutlined /> Excel</span>,
      children: [
        { key: "excel-full",      label: <span className="ctp-export-menu-item"><span>Structure complète{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
        { key: "excel-savoirs",   label: <span className="ctp-export-menu-item"><span>Savoirs uniquement{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
        { key: "excel-synthesis", label: <span className="ctp-export-menu-item"><span>Synthèse rapide</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
        { key: "excel-matrix",    label: <span className="ctp-export-menu-item"><span>Matrice niveaux</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
      ],
    },
    { type: "divider" },
    {
      type: "group",
      label: <span className="ctp-export-group-label"><FileTextOutlined /> CSV</span>,
      children: [
        { key: "csv-savoirs",     label: <span className="ctp-export-menu-item"><span>Savoirs{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--csv">csv</span></span> },
        { key: "csv-competences", label: <span className="ctp-export-menu-item"><span>Compétences{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--csv">csv</span></span> },
      ],
    },
    { type: "divider" },
    {
      type: "group",
      label: <span className="ctp-export-group-label"><CodeOutlined /> JSON</span>,
      children: [
        { key: "json-full", label: <span className="ctp-export-menu-item"><span>Structure complète</span><span className="ctp-export-badge ctp-export-badge--json">json</span></span> },
      ],
    },
    { type: "divider" },
    {
      key: "__stats__",
      disabled: true,
      label: (
        <div className="ctp-export-stats" aria-label="Données à exporter">
          <span>{exportStats.domaines} dom.</span>
          <span className="ctp-export-stats__sep">·</span>
          <span>{exportStats.competences} comp.</span>
          <span className="ctp-export-stats__sep">·</span>
          <span>{exportStats.savoirs} savoir{exportStats.savoirs !== 1 ? "s" : ""}</span>
          {domaineName && (
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>filtre actif</Tag>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {ctxHolder}
      <Dropdown
        menu={{ items: menuItems, onClick: ({ key }) => { if (key !== "__stats__") run(key); } }}
        trigger={["click"]}
        placement="bottomRight"
        aria-label="Menu d'export"
      >
        <Button icon={<DownloadOutlined />} size="middle" loading={loading}>
          Exporter <span className="ctp-export-caret">▾</span>
        </Button>
      </Dropdown>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   VIEW TOOLBAR
───────────────────────────────────────────────────────────────────── */
function ViewToolbar({ viewMode, setViewMode, handleExportExcel, crud, structure, stats }) {
  return (
    <div className="ctp-toolbar ctp-section">
      <Radio.Group
        value={viewMode}
        onChange={(e) => setViewMode(e.target.value)}
        buttonStyle="solid"
        size="middle"
      >
        <Radio.Button value="tree">
          <ApartmentOutlined /> Hiérarchie
        </Radio.Button>
        <Radio.Button value="graph">
          <ShareAltOutlined /> Graphe
        </Radio.Button>
      </Radio.Group>

      <div className="ctp-toolbar__right">
        <ExportMenu
          crud={crud}
          structure={structure}
          stats={stats}
          handleExportExcel={handleExportExcel}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   TREE HELPERS
───────────────────────────────────────────────────────────────────── */
function buildSearchIndex(crud) {
  const idx = {};
  (crud.domaines || []).forEach((d) => {
    idx[`dom-${d.id}`] = { text: `${d.nom} ${d.code}`.toLowerCase(), label: d.nom };
  });
  (crud.competences || []).forEach((c) => {
    idx[`comp-${c.id}`] = { text: `${c.nom} ${c.code}`.toLowerCase(), label: c.nom };
  });
  (crud.sousComps || []).forEach((s) => {
    idx[`sc-${s.id}`] = { text: `${s.nom} ${s.code}`.toLowerCase(), label: s.nom };
  });
  (crud.savoirs || []).forEach((s) => {
    idx[`sav-${s.id}`]        = { text: `${s.nom} ${s.code}`.toLowerCase(), label: s.nom };
    idx[`sav-direct-${s.id}`] = { text: `${s.nom} ${s.code}`.toLowerCase(), label: s.nom };
  });
  return idx;
}

function findTreePath(nodes, targetKey, index, path = []) {
  for (const n of nodes) {
    const next = [...path, { key: n.key, label: index[n.key]?.label || n.key }];
    if (n.key === targetKey) return next;
    if (n.children) {
      const found = findTreePath(n.children, targetKey, index, next);
      if (found) return found;
    }
  }
  return null;
}

function collectAncestorKeys(nodes, matchSet, path = [], ancestors = new Set()) {
  for (const n of nodes) {
    if (matchSet.has(n.key)) path.forEach((k) => ancestors.add(k));
    if (n.children) collectAncestorKeys(n.children, matchSet, [...path, n.key], ancestors);
  }
  return ancestors;
}

/* ─────────────────────────────────────────────────────────────────────
   TREE VIEW
───────────────────────────────────────────────────────────────────── */
function TreeView({ treeData, stats, crud }) {
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebouncedValue(searchValue, 300);
  const [expandedKeys, setExpandedKeys] = useState(() => {
    try {
      const saved = localStorage.getItem("ctp-tree-expanded");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return treeData.map((d) => d.key);
  });
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [selectedPath, setSelectedPath] = useState([]);

  const searchIndex = useMemo(() => buildSearchIndex(crud), [crud]);

  // Add newly added root keys to expansion
  useEffect(() => {
    const rootKeys = treeData.map((d) => d.key);
    setExpandedKeys((prev) => {
      const prevSet = new Set(prev);
      const newKeys = rootKeys.filter((k) => !prevSet.has(k));
      return newKeys.length === 0 ? prev : [...prev, ...newKeys];
    });
  }, [treeData]);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem("ctp-tree-expanded", JSON.stringify(expandedKeys));
  }, [expandedKeys]);

  const searchStats = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return { matchedKeys: [], totalMatches: 0, tooMany: false };

    const all = Object.entries(searchIndex)
      .filter(([, v]) => v.text.includes(q))
      .map(([k]) => k);

    return {
      matchedKeys: all.slice(0, 50),
      totalMatches: all.length,
      tooMany: all.length > 50,
    };
  }, [debouncedSearch, searchIndex]);

  const matchedKeys = searchStats.matchedKeys;

  const matchedKeySet = useMemo(() => new Set(matchedKeys), [matchedKeys]);

  // Auto-expand ancestor nodes of search matches
  useEffect(() => {
    if (!debouncedSearch.trim() || matchedKeys.length === 0) return;
    const ancestors = collectAncestorKeys(treeData, matchedKeySet);
    if (ancestors.size > 0) {
      setExpandedKeys((prev) => [...new Set([...prev, ...ancestors])]);
      setAutoExpandParent(true);
    }
  }, [debouncedSearch, matchedKeys, matchedKeySet, treeData]);

  const handleExpand = (keys) => {
    setExpandedKeys(keys);
    setAutoExpandParent(false);
  };

  const handleSelect = (keys) => {
    if (!keys.length) { setSelectedPath([]); return; }
    const path = findTreePath(treeData, keys[0], searchIndex);
    setSelectedPath(path || []);
  };

  const titleRender = useCallback(
    (nodeData) =>
      matchedKeySet.has(nodeData.key) ? (
        <span className="ctp-tree-node--match">{nodeData.title}</span>
      ) : (
        nodeData.title
      ),
    [matchedKeySet],
  );

  const expandAll = () => {
    const all = [];
    const walk = (nodes) => nodes.forEach((n) => { all.push(n.key); if (n.children) walk(n.children); });
    walk(treeData);
    setExpandedKeys(all);
    setAutoExpandParent(false);
  };

  return (
    <div className="ctp-tree-card ctp-section">
      <div className="ctp-tree-card__header">
        <div className="ctp-tree-card__title">
          <ApartmentOutlined style={{ color: "#2563eb" }} />
          <span>Vue hiérarchique complète</span>
        </div>
        <div className="ctp-tree-card__actions">
          <button className="ctp-tree-action-btn" onClick={() => { setExpandedKeys([]); setAutoExpandParent(false); }}>Réduire tout</button>
          <button className="ctp-tree-action-btn" onClick={expandAll}>Développer tout</button>
          <span className="ctp-tree-card__hint">Clic pour développer</span>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="ctp-tree-search">
        <Input
          prefix={<SearchOutlined style={{ color: "#64748b" }} />}
          placeholder="Rechercher par nom ou code…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          allowClear
        />
        {searchValue.trim() && (
          <span className="ctp-tree-search__count">
            {searchStats.tooMany
              ? `50 / ${searchStats.totalMatches} résultats`
              : `${searchStats.totalMatches} résultat${searchStats.totalMatches !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>
      {searchStats.tooMany && (
        <div className="ctp-warning-pill" role="status">
          Trop de résultats: seuls les 50 premiers sont surlignés.
        </div>
      )}

      {/* ── Breadcrumb ── */}
      {selectedPath.length > 0 && (
        <div className="ctp-tree-breadcrumb">
          {selectedPath.map((item, i) => (
            <span key={item.key} className="ctp-tree-breadcrumb__step">
              {i > 0 && <span className="ctp-tree-breadcrumb__sep">›</span>}
              <span className={i === selectedPath.length - 1 ? "ctp-tree-breadcrumb__leaf" : ""}>
                {item.label}
              </span>
            </span>
          ))}
        </div>
      )}

      {treeData.length > 0 ? (
        <AntTree
          key={stats?.totalDomaines}
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={handleExpand}
          onSelect={handleSelect}
          autoExpandParent={autoExpandParent}
          titleRender={titleRender}
          showLine={{ showLeafIcon: false }}
          blockNode
          virtual
          height={560}
        />
      ) : (
        <Empty description="Aucune donnée dans la structure" />
      )}
    </div>
  );
}

function getGraphNodeTheme(nodeDatum, depth) {
  const type = nodeDatum?.attributes?.type;

  if (depth === 0) {
    return {
      accent: "#2563eb",
      bg: "#bfdbfe",
      label: "Domaine",
    };
  }

  if (depth === 1) {
    return {
      accent: "#16a34a",
      bg: "#bbf7d0",
      label: "Compétence",
    };
  }

  if (type === "THEORIQUE") {
    return {
      accent: "#0f766e",
      bg: "#99f6e4",
      label: "Savoir théorique",
    };
  }

  if (type === "PRATIQUE") {
    return {
      accent: "#be123c",
      bg: "#fecdd3",
      label: "Savoir pratique",
    };
  }

  return {
    accent: "#d97706",
    bg: "#fde68a",
    label: "Sous-compétence",
  };
}

function trimGraphLabel(label, max = 26) {
  if (!label) return "";
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/* ─────────────────────────────────────────────────────────────────────
   GRAPH VIEW (D3)
───────────────────────────────────────────────────────────────────── */
function GraphView({ d3TreeData, graphContainerRef, graphContainerWidth }) {
  const [simplifiedView, setSimplifiedView] = useState(() => {
    try {
      return localStorage.getItem("ctp-graph-simplified") === "1";
    } catch {
      return false;
    }
  });
  const [hiddenTypes, setHiddenTypes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ctp-graph-hidden-types") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [nodeSearch, setNodeSearch] = useState("");
  const debouncedNodeSearch = useDebouncedValue(nodeSearch, 300);
  const [graphKey, setGraphKey] = useState(0);

  useEffect(() => {
    localStorage.setItem("ctp-graph-simplified", simplifiedView ? "1" : "0");
  }, [simplifiedView]);

  useEffect(() => {
    localStorage.setItem("ctp-graph-hidden-types", JSON.stringify(hiddenTypes));
  }, [hiddenTypes]);

  const graphData = useMemo(() => {
    if (d3TreeData?.name === "Referentiel" && Array.isArray(d3TreeData.children)) {
      return { name: "__root__", children: d3TreeData.children };
    }
    return d3TreeData;
  }, [d3TreeData]);

  const filteredGraphData = useMemo(() => {
    const noFilter = !simplifiedView && hiddenTypes.length === 0;
    if (noFilter) return graphData;

    function filterNode(node) {
      if (!node) return null;
      const nodeType = node.attributes?.type;
      if (nodeType && hiddenTypes.includes(nodeType)) return null;
      if (!node.children || node.children.length === 0) {
        return simplifiedView ? null : node;
      }
      const fc = node.children.map(filterNode).filter(Boolean);
      if (simplifiedView && fc.length === 0) return null;
      return { ...node, children: fc };
    }

    if (graphData?.name === "__root__") {
      const fc = (graphData.children || []).map(filterNode).filter(Boolean);
      return { ...graphData, children: fc };
    }
    return filterNode(graphData);
  }, [graphData, simplifiedView, hiddenTypes]);

  const graphSummary = useMemo(() => {
    const summary = { total: 0, leafs: 0, maxDepth: 0 };

    const walk = (node, depth = 0) => {
      if (!node) return;
      summary.total += 1;
      summary.maxDepth = Math.max(summary.maxDepth, depth);
      if (!node.children || node.children.length === 0) { summary.leafs += 1; return; }
      node.children.forEach((child) => walk(child, depth + 1));
    };

    const roots =
      filteredGraphData?.name === "__root__"
        ? (filteredGraphData.children || [])
        : Array.isArray(filteredGraphData) ? filteredGraphData : [filteredGraphData];
    roots.forEach((node) => walk(node, 0));
    return summary;
  }, [filteredGraphData]);

  const adaptiveZoom = useMemo(() => {
    const n = graphSummary.total;
    if (n > 150) return 0.32;
    if (n > 80)  return 0.45;
    if (n > 40)  return 0.58;
    return 0.72;
  }, [graphSummary.total]);

  const graphSearchStats = useMemo(() => {
    const q = debouncedNodeSearch.trim().toLowerCase();
    if (!q) return { totalMatches: 0, tooMany: false };

    let totalMatches = 0;
    const walk = (node) => {
      if (!node) return;
      if (node?.name !== "__root__" && node?.name?.toLowerCase().includes(q)) totalMatches += 1;
      (node.children || []).forEach(walk);
    };

    const roots =
      filteredGraphData?.name === "__root__"
        ? (filteredGraphData.children || [])
        : Array.isArray(filteredGraphData) ? filteredGraphData : [filteredGraphData];

    roots.forEach(walk);
    return { totalMatches, tooMany: totalMatches > 50 };
  }, [debouncedNodeSearch, filteredGraphData]);

  const renderGraphNode = useCallback(({ nodeDatum, toggleNode, hierarchyPointNode }) => {
    if (nodeDatum?.name === "__root__") return <g />;
    const rawDepth = hierarchyPointNode?.depth || 0;
    // depth 0 = virtual root (hidden), so domains are at depth 1 → offset by -1
    const depth = graphData?.name === "__root__" ? rawDepth - 1 : rawDepth;
    const theme = getGraphNodeTheme(nodeDatum, depth);
    const code = nodeDatum?.attributes?.code;
    const isMatch =
      debouncedNodeSearch.trim() &&
      nodeDatum?.name?.toLowerCase().includes(debouncedNodeSearch.trim().toLowerCase());

    return (
      <g style={{ cursor: "pointer" }}>
        <foreignObject x={-116} y={-32} width={232} height={74}>
          <div
            className={`ctp-graph-node${isMatch ? " ctp-graph-node--match" : ""}`}
            style={{ "--ctp-node-accent": theme.accent }}
            onClick={toggleNode}
          >
            <div className="ctp-graph-node__rail" />
            <div className="ctp-graph-node__body">
              <div className="ctp-graph-node__name">{trimGraphLabel(nodeDatum?.name, 28)}</div>
              <div className="ctp-graph-node__code">{trimGraphLabel(code || theme.label, 30)}</div>
            </div>
          </div>
        </foreignObject>
      </g>
    );
  }, [graphData?.name, debouncedNodeSearch]);

  const toggleHiddenType = (type) =>
    setHiddenTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );

  return (
    <div className="ctp-graph-card ctp-section">
      <div className="ctp-graph-card__header">
        <div className="ctp-graph-card__title">
          <ShareAltOutlined style={{ color: "#2563eb" }} />
          <span>Vue graphe</span>
        </div>
        <span className="ctp-graph-card__hintline">
          Molette pour zoomer · glisser pour naviguer
        </span>
      </div>

      {/* ── Graph toolbar ── */}
      <div className="ctp-graph-toolbar">
        <div className="ctp-graph-toolbar__filters">
          <button
            className={`ctp-gtb-btn${simplifiedView ? " ctp-gtb-btn--on" : ""}`}
            onClick={() => setSimplifiedView((v) => !v)}
            title="Masquer les nœuds feuilles"
          >
            Vue simplifiée
          </button>
          <button
            className={`ctp-gtb-btn ctp-gtb-btn--theo${hiddenTypes.includes("THEORIQUE") ? " ctp-gtb-btn--off" : ""}`}
            onClick={() => toggleHiddenType("THEORIQUE")}
            title="Masquer / afficher les savoirs théoriques"
          >
            Théoriques
          </button>
          <button
            className={`ctp-gtb-btn ctp-gtb-btn--prat${hiddenTypes.includes("PRATIQUE") ? " ctp-gtb-btn--off" : ""}`}
            onClick={() => toggleHiddenType("PRATIQUE")}
            title="Masquer / afficher les savoirs pratiques"
          >
            Pratiques
          </button>
        </div>
        <div className="ctp-graph-toolbar__search">
          <Input
            prefix={<SearchOutlined style={{ color: "#64748b" }} />}
            placeholder="Rechercher un nœud…"
            value={nodeSearch}
            onChange={(e) => setNodeSearch(e.target.value)}
            allowClear
          />
        </div>
        <Button size="small" onClick={() => setGraphKey((k) => k + 1)}>
          Réinitialiser vue
        </Button>
      </div>
      {debouncedNodeSearch.trim() && (
        <div className="ctp-info-pill" role="status">
          {graphSearchStats.tooMany
            ? `Trop de résultats (${graphSearchStats.totalMatches}). Affiniez votre recherche.`
            : `${graphSearchStats.totalMatches} correspondance${graphSearchStats.totalMatches !== 1 ? "s" : ""} trouvée${graphSearchStats.totalMatches !== 1 ? "s" : ""}`}
        </div>
      )}

      <div className="ctp-graph-strip">
        <div className="ctp-graph-strip__item">
          <span>Nœuds affichés</span>
          <strong>{graphSummary.total}</strong>
        </div>
        <div className="ctp-graph-strip__item">
          <span>Feuilles</span>
          <strong>{graphSummary.leafs}</strong>
        </div>
        <div className="ctp-graph-strip__item">
          <span>Profondeur</span>
          <strong>{graphSummary.maxDepth}</strong>
        </div>
      </div>

      <div className="ctp-graph-viewport" ref={graphContainerRef}>
        <D3Tree
          key={graphKey}
          data={filteredGraphData}
          orientation="vertical"
          pathFunc="diagonal"
          translate={{ x: (graphContainerWidth || 760) / 2, y: 90 }}
          zoom={adaptiveZoom}
          separation={{ siblings: 1.2, nonSiblings: 1.5 }}
          nodeSize={{ x: 290, y: 120 }}
          renderCustomNodeElement={renderGraphNode}
          styles={{
            nodes: {
              node: { circle: { r: 0 } },
              leafNode: { circle: { r: 0 } },
            },
            links: { stroke: "#94a3b8", strokeWidth: 1.6 },
          }}
        />
      </div>

      <div className="ctp-graph-legend">
        <div className="ctp-graph-legend__item">
          <span className="ctp-graph-legend__dot" style={{ background: "#2563eb" }} />
          Domaine
        </div>
        <div className="ctp-graph-legend__item">
          <span className="ctp-graph-legend__dot" style={{ background: "#16a34a" }} />
          Compétence
        </div>
        <div className="ctp-graph-legend__item">
          <span className="ctp-graph-legend__dot" style={{ background: "#d97706" }} />
          Sous-compétence
        </div>
        <div className="ctp-graph-legend__item">
          <span className="ctp-graph-legend__dot" style={{ background: "#0f766e" }} />
          Savoir théorique
        </div>
        <div className="ctp-graph-legend__item">
          <span className="ctp-graph-legend__dot" style={{ background: "#be123c" }} />
          Savoir pratique
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SAVOIRS DRAWER
───────────────────────────────────────────────────────────────────── */
function SavoirsDrawer({ drawerSavoirs, drawerVisible, setDrawerVisible }) {
  const savoirs = drawerSavoirs?.savoirs || [];
  const sc      = drawerSavoirs?.sc;

  return (
    <Drawer
      title={
        <div className="ctp-drawer-header">
          <div className="ctp-drawer-header__icon">
            <BookOutlined />
          </div>
          <span>{sc?.nom || "Savoirs"}</span>
          {sc?.code && (
            <Tag color="purple" style={{ marginLeft: 4, fontFamily: "monospace" }}>
              {sc.code}
            </Tag>
          )}
        </div>
      }
      placement="right"
      width={440}
      open={drawerVisible}
      onClose={() => setDrawerVisible(false)}
      footer={
        <Button block onClick={() => setDrawerVisible(false)}>
          Fermer
        </Button>
      }
    >
      {savoirs.length === 0 ? (
        <Empty description="Aucun savoir attaché à cette sous-compétence" />
      ) : (
        <div className="ctp-savoir-list">
          {savoirs.map((s) => {
            const isTheo = s.type === "THEORIQUE";
            const acc = isTheo ? ACCENT.theorique : ACCENT.pratique;
            return (
              <div
                key={s.id}
                className="ctp-savoir-item"
                style={{ borderLeftColor: acc.color, borderLeftWidth: 3 }}
              >
                <div className="ctp-savoir-item__name">{s.nom}</div>
                <div className="ctp-savoir-item__code">{s.code}</div>
                <div className="ctp-savoir-item__tags">
                  <Badge
                    text={s.type.toLowerCase()}
                    type={isTheo ? "theorique" : "pratique"}
                  />
                  <Badge
                    text={
                      NIVEAU_SAVOIR_OPTIONS?.find((n) => n.value === s.niveau)?.label ||
                      `Niveau ${s.niveau}`
                    }
                    type="muted"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROOT EXPORT  —  all original props preserved
═══════════════════════════════════════════════════════════════════════ */
export default function ConsultationTab({
  structure,
  crud,
  viewMode,
  setViewMode,
  handleExportExcel,
  getScButtonColor,
  drawerSavoirs,
  drawerVisible,
  setDrawerVisible,
  graphContainerRef,
  graphContainerWidth,
  d3TreeData,
}) {
  void getScButtonColor;

  const [activePanel, setActivePanel] = useState(null);

  const stats    = structure.structure?.statistiques;
  const treeData = useMemo(() => structure.treeData || [], [structure.treeData]);

  const isSearchLoading     = structure.searchLoading;
  const hasSearchResults    = !isSearchLoading && !!structure.searchResults;
  const isStructureLoading  = !isSearchLoading && !structure.searchResults && structure.structureLoading;
  const showContent         = !isSearchLoading && !structure.searchResults && !structure.structureLoading;

  useEffect(() => {
    try {
      const preferred = localStorage.getItem("ctp-view-mode");
      if (preferred === "tree" || preferred === "graph") setViewMode(preferred);
    } catch {
      // ignore
    }
  }, [setViewMode]);

  useEffect(() => {
    if (viewMode === "tree" || viewMode === "graph") {
      localStorage.setItem("ctp-view-mode", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "buttons") setViewMode("tree");
  }, [viewMode, setViewMode]);

  return (
    <div className="ctp">
      {/* ── Search + domain filter ─────────────────── */}
      <SearchBar structure={structure} />

      {/* ── Search spinner ────────────────────────── */}
      {isSearchLoading && (
        <div className="ctp-empty-box">
          <div className="ctp-loading-center">
            <Spin size="large" tip="Recherche en cours…" />
          </div>
        </div>
      )}

      {/* ── Search results ────────────────────────── */}
      {hasSearchResults && (
        <StructureSearchResultsView results={structure.searchResults} />
      )}

      {/* ── Structure loading ─────────────────────── */}
      {isStructureLoading && (
        <div className="ctp-empty-box">
          <div className="ctp-loading-center">
            <Spin size="large" tip="Chargement de la structure…" />
          </div>
        </div>
      )}

      {/* ── Main content ──────────────────────────── */}
      {showContent && (
        <>
          {/* Stat cards */}
          {stats && (
            <StatCards
              stats={stats}
              activePanel={activePanel}
              setActivePanel={setActivePanel}
            />
          )}

          {/* Inline expand panel */}
          {activePanel && (
            <ExpandPanel
              panelKey={activePanel}
              crud={crud}
              onClose={() => setActivePanel(null)}
            />
          )}

          {/* View toolbar */}
          <ViewToolbar
            viewMode={viewMode}
            setViewMode={setViewMode}
            handleExportExcel={handleExportExcel}
            crud={crud}
            structure={structure}
            stats={stats}
          />

          {/* Tree view */}
          {viewMode === "tree" && (
            <TreeView treeData={treeData} stats={stats} crud={crud} />
          )}

          {/* Graph view */}
          {viewMode === "graph" && (
            <GraphView
              d3TreeData={d3TreeData}
              graphContainerRef={graphContainerRef}
              graphContainerWidth={graphContainerWidth}
            />
          )}

          {/* Savoirs drawer */}
          <SavoirsDrawer
            drawerSavoirs={drawerSavoirs}
            drawerVisible={drawerVisible}
            setDrawerVisible={setDrawerVisible}
          />
        </>
      )}
    </div>
  );
}
/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { Empty, Input, Pagination, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  buildFilterChips,
  COMP_PALETTE,
  formatNiveau,
  getNiveauStyle,
  getTypeBadge,
  getTypeLabel,
  toNiveauRank,
} from "./utils";
import ActiveFiltersBar from "./ActiveFiltersBar";
import EmptyState from "./EmptyState";
import "./ListView.css";

const { Option } = Select;
const PAGE_SIZE = 50;

function Badge({ text, type = "muted" }) {
  const cls = type === "theorique" ? "ctp-badge--theorique" : type === "pratique" ? "ctp-badge--pratique" : "ctp-badge--muted";
  return <span className={`ctp-badge ${cls}`}>{text}</span>;
}

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ListRow({ savoir, accent, onClick }) {
  const niveauStyle = getNiveauStyle(savoir.niveau);
  return (
    <button className="ctp-list-row" onClick={onClick}>
      <span className="ctp-list-row__code" style={{ color: accent, background: `${accent}22`, border: `1px solid ${accent}55` }}>
        {savoir.code}
      </span>
      <div className="ctp-list-row__main">
        <div className="ctp-list-row__nom">{savoir.nom}</div>
        <div className="ctp-list-row__path">
          {savoir.competenceNom}
          {savoir.sousCompetenceNom ? ` > ${savoir.sousCompetenceNom}` : " · direct"}
        </div>
      </div>
      <div className="ctp-list-row__meta">
        <Badge text={getTypeLabel(savoir.type)} type={getTypeBadge(savoir.type)} />
        <span className="ctp-badge" style={{ color: niveauStyle.color, background: niveauStyle.bg, borderColor: niveauStyle.border }}>
          {formatNiveau(savoir.niveau)}
        </span>
      </div>
    </button>
  );
}

export default function ListView({
  flatSavoirs,
  selectedDomaine,
  onOpenSavoir,
  competences,
  listMode,
  setListMode,
  listFilters,
  setListFilters,
}) {
  const listTopRef = useRef(null);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(listFilters.q, 300);

  const scrollToTop = () =>
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    setPage(1);
  }, [listFilters, selectedDomaine, listMode]);

  const niveaux = useMemo(() => {
    const set = new Set(flatSavoirs.map((s) => String(s.niveau || "-")));
    return Array.from(set).sort((a, b) => toNiveauRank(a) - toNiveauRank(b));
  }, [flatSavoirs]);

  const rows = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    return flatSavoirs
      .filter((s) => (selectedDomaine ? String(s.domaineId) === String(selectedDomaine) : true))
      .filter((s) => (listFilters.type === "ALL" ? true : s.type === listFilters.type))
      .filter((s) => (listFilters.niveau === "ALL" ? true : String(s.niveau || "-") === listFilters.niveau))
      .filter((s) => {
        if (!q) return true;
        return [s.nom, s.code, s.competenceNom, s.sousCompetenceNom, s.domaineNom].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const r = toNiveauRank(a.niveau) - toNiveauRank(b.niveau);
        if (r !== 0) return r;
        return String(a.nom).localeCompare(String(b.nom), "fr");
      });
  }, [debouncedQuery, flatSavoirs, listFilters.niveau, listFilters.type, selectedDomaine]);

  const paginatedRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );

  const compColorMap = useMemo(() => {
    const map = new Map();
    (competences || []).forEach((c, idx) => map.set(String(c.id), COMP_PALETTE[idx % COMP_PALETTE.length]));
    return map;
  }, [competences]);

  const grouped = useMemo(() => {
    if (listMode !== "grouped") return [];
    const map = new Map();
    paginatedRows.forEach((row) => {
      const key = row.competenceId || "none";
      if (!map.has(key)) {
        map.set(key, {
          competenceId: key,
          competenceNom: row.competenceNom || "Sans competence",
          competenceCode: row.competenceCode || "-",
          rows: [],
        });
      }
      map.get(key).rows.push(row);
    });
    return Array.from(map.values());
  }, [listMode, paginatedRows]);

  const hasActiveFilters = listFilters.q.trim() || listFilters.type !== "ALL" || listFilters.niveau !== "ALL";
  const filterChips = buildFilterChips(listFilters);
  const clearFilters = () => setListFilters({ q: "", type: "ALL", niveau: "ALL" });
  const removeFilter = (key) => {
    setListFilters((prev) => ({
      ...prev,
      [key]: key === "q" ? "" : "ALL",
    }));
  };

  return (
    <div ref={listTopRef} className="ctp-list-card ctp-section">
      <div className="ctp-list-head">
        <h3>Liste des savoirs</h3>
        <div className="ctp-list-mode-toggle">
          <button className={`ctp-list-mode-btn${listMode === "grouped" ? " active" : ""}`} onClick={() => setListMode("grouped")}>Groupe</button>
          <button className={`ctp-list-mode-btn${listMode === "flat" ? " active" : ""}`} onClick={() => setListMode("flat")}>Plat</button>
        </div>
      </div>

      <div className="ctp-list-filters">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "#64748b" }} />}
          placeholder="Rechercher un savoir, code, competence..."
          value={listFilters.q}
          onChange={(e) => setListFilters((prev) => ({ ...prev, q: e.target.value }))}
        />

        <Select value={listFilters.type} onChange={(val) => setListFilters((prev) => ({ ...prev, type: val }))} style={{ minWidth: 160 }}>
          <Option value="ALL">Tous les types</Option>
          <Option value="THEORIQUE">Theoriques</Option>
          <Option value="PRATIQUE">Pratiques</Option>
        </Select>

        <Select value={listFilters.niveau} onChange={(val) => setListFilters((prev) => ({ ...prev, niveau: val }))} style={{ minWidth: 190 }}>
          <Option value="ALL">Tous les niveaux</Option>
          {niveaux.map((n) => <Option key={n} value={n}>{formatNiveau(n)}</Option>)}
        </Select>
      </div>

      <div style={{ padding: "0 16px" }}>
        <ActiveFiltersBar filters={filterChips} onRemove={removeFilter} onClearAll={clearFilters} />
      </div>

      <div className="ctp-list-infobar">
        <span>{rows.length} savoir(s) affiche(s)</span>
        {hasActiveFilters ? <button className="ctp-list-clear-btn" onClick={clearFilters}>Effacer</button> : <span />}
      </div>

      <div>
        {rows.length === 0 && (
          <div className="ctp-empty-box" style={{ border: "none", boxShadow: "none", margin: 0 }}>
            {hasActiveFilters ? <EmptyState type="noResults" onClear={clearFilters} /> : <Empty description="Aucun savoir disponible" />}
          </div>
        )}

        {listMode === "flat" && paginatedRows.map((savoir) => (
          <ListRow key={savoir.id} savoir={savoir} accent={compColorMap.get(String(savoir.competenceId)) || "#64748b"} onClick={() => onOpenSavoir(savoir)} />
        ))}

        {listMode === "grouped" && grouped.map((group) => {
          const accent = compColorMap.get(String(group.competenceId)) || "#64748b";
          return (
            <div key={group.competenceId}>
              <div className="ctp-list-group-head">
                <span className="ctp-list-group-dot" style={{ background: accent }} />
                <span className="ctp-list-group-name">{group.competenceNom}</span>
                <span className="ctp-list-row__code" style={{ color: accent, background: `${accent}22`, border: `1px solid ${accent}55`, width: "auto" }}>
                  {group.competenceCode}
                </span>
                <span className="ctp-list-group-count">{group.rows.length} savoir(s)</span>
              </div>
              {group.rows.map((savoir) => (
                <ListRow key={savoir.id} savoir={savoir} accent={accent} onClick={() => onOpenSavoir(savoir)} />
              ))}
            </div>
          );
        })}
      </div>

      {rows.length > PAGE_SIZE && (
        <div className="ctp-list-pagination">
          <Pagination
            current={page}
            total={rows.length}
            pageSize={PAGE_SIZE}
            onChange={(p) => {
              setPage(p);
              scrollToTop();
            }}
            showTotal={(total, range) => `${range[0]}-${range[1]} sur ${total} savoirs`}
            size="small"
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
}

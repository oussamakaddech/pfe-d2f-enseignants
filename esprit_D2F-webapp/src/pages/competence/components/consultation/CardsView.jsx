/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  ACTIVE_COMP_KEY,
  COMP_PALETTE,
  OPEN_COMPS_KEY,
  buildFilterChips,
  formatNiveau,
  getNiveauStyle,
  getTypeBadge,
  getTypeLabel,
  hasAnyActiveFilters,
  toNiveauRank,
} from "./utils";
import ActiveFiltersBar from "./ActiveFiltersBar";
import EmptyState from "./EmptyState";
import "./CardsView.css";

const { Option } = Select;
const PAGE = 20;

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

export default function CardsView({
  crud,
  selectedDomaine,
  flatSavoirs,
  onOpenSavoir,
  openAll,
  onOpenAllConsumed,
}) {
  const scopedCompetences = useMemo(
    () => (crud.competences || []).filter((c) => (selectedDomaine ? String(c.domaineId) === String(selectedDomaine) : true)),
    [crud.competences, selectedDomaine],
  );
  const [activeComp, setActiveComp] = useState(() => localStorage.getItem(ACTIVE_COMP_KEY) || null);
  const [visibleCount, setVisibleCount] = useState(() => new Map());
  const [openComps, setOpenComps] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(OPEN_COMPS_KEY) || "[]");
      return new Set(Array.isArray(raw) ? raw.map((id) => String(id)) : []);
    } catch {
      return new Set();
    }
  });
  const [filters, setFilters] = useState({ q: "", type: "ALL", niveau: "ALL" });
  const debouncedQ = useDebouncedValue(filters.q, 300);

  useEffect(() => {
    if (scopedCompetences.length === 0) return;
    if (openComps.size > 0) return;
    setOpenComps(new Set([String(scopedCompetences[0].id)]));
  }, [openComps, scopedCompetences]);

  useEffect(() => {
    localStorage.setItem(OPEN_COMPS_KEY, JSON.stringify(Array.from(openComps)));
  }, [openComps]);

  useEffect(() => {
    if (activeComp) localStorage.setItem(ACTIVE_COMP_KEY, activeComp);
    else localStorage.removeItem(ACTIVE_COMP_KEY);
  }, [activeComp]);

  useEffect(() => {
    if (!openAll) return;
    setOpenComps(new Set(scopedCompetences.map((c) => String(c.id))));
    onOpenAllConsumed();
  }, [onOpenAllConsumed, openAll, scopedCompetences]);

  useEffect(() => {
    setOpenComps(new Set());
    setActiveComp(null);
  }, [selectedDomaine]);

  useEffect(() => {
    setVisibleCount(new Map());
  }, [filters, selectedDomaine, activeComp]);

  const niveaux = useMemo(() => {
    const all = new Set(
      flatSavoirs
        .filter((s) => (selectedDomaine ? String(s.domaineId) === String(selectedDomaine) : true))
        .map((s) => String(s.niveau || "-")),
    );
    return Array.from(all).sort((a, b) => toNiveauRank(a) - toNiveauRank(b));
  }, [flatSavoirs, selectedDomaine]);

  const q = debouncedQ.trim().toLowerCase();
  const hasActiveFilters = hasAnyActiveFilters(filters, debouncedQ);

  const compRows = useMemo(
    () => scopedCompetences
      .map((comp) => {
        const allLinked = flatSavoirs.filter((s) => s.competenceId != null && String(s.competenceId) === String(comp.id));
        const filteredLinked = allLinked.filter((s) => {
          if (filters.type !== "ALL" && s.type !== filters.type) return false;
          if (filters.niveau !== "ALL" && String(s.niveau || "-") !== filters.niveau) return false;
          if (!q) return true;
          return [s.nom, s.code, s.competenceNom, s.sousCompetenceNom, s.domaineNom].join(" ").toLowerCase().includes(q);
        });

        return {
          comp,
          allLinked,
          filteredLinked,
          theo: filteredLinked.filter((s) => s.type === "THEORIQUE").length,
          prat: filteredLinked.filter((s) => s.type === "PRATIQUE").length,
        };
      })
      .filter((row) => (activeComp ? String(row.comp.id) === String(activeComp) : true)),
    [activeComp, filters.niveau, filters.type, flatSavoirs, q, scopedCompetences],
  );

  const compCountById = useMemo(() => {
    const map = new Map();
    scopedCompetences.forEach((comp) => {
      map.set(String(comp.id), flatSavoirs.filter((s) => s.competenceId != null && String(s.competenceId) === String(comp.id)).length);
    });
    return map;
  }, [flatSavoirs, scopedCompetences]);

  const totalFiltered = useMemo(
    () => compRows.reduce((sum, row) => sum + row.filteredLinked.length, 0),
    [compRows],
  );
  const totalAll = useMemo(
    () => compRows.reduce((sum, row) => sum + row.allLinked.length, 0),
    [compRows],
  );
  const nonEmptyCompCount = useMemo(
    () => compRows.filter((row) => row.filteredLinked.length > 0).length,
    [compRows],
  );

  const clearFilters = () => setFilters({ q: "", type: "ALL", niveau: "ALL" });
  const removeFilter = (key) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === "q" ? "" : "ALL",
    }));
  };
  const filterChips = buildFilterChips(filters);

  if (scopedCompetences.length === 0) {
    return (
      <div className="ctp-empty-box ctp-section">
        <EmptyState type={selectedDomaine ? "noComp" : "noData"} />
      </div>
    );
  }

  return (
    <div className="ctp-cards-layout ctp-section">
      <aside className="ctp-cards-sidebar">
        <div className="ctp-cards-sidebar__head">Competences</div>
        {scopedCompetences.map((comp, idx) => (
          <button key={comp.id} className={`ctp-sidebar-item${activeComp === String(comp.id) ? " active" : ""}`} onClick={() => setActiveComp(String(comp.id))}>
            <span className="ctp-sidebar-dot" style={{ background: COMP_PALETTE[idx % COMP_PALETTE.length] }} />
            <span className="ctp-sidebar-name">{comp.nom}</span>
            <span className="ctp-sidebar-count">{compCountById.get(String(comp.id)) || 0}</span>
          </button>
        ))}
        <button className={`ctp-sidebar-item${activeComp == null ? " active" : ""}`} onClick={() => setActiveComp(null)}>
          <span className="ctp-sidebar-dot" style={{ background: "#64748b" }} />
          <span className="ctp-sidebar-name">Toutes</span>
        </button>
      </aside>

      <div>
        <div className="ctp-cards-filters">
          <Input allowClear prefix={<SearchOutlined style={{ color: "#64748b" }} />} placeholder="Rechercher un savoir, code, competence..." value={filters.q} onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} />
          <Select value={filters.type} onChange={(val) => setFilters((prev) => ({ ...prev, type: val }))}>
            <Option value="ALL">Tous les types</Option>
            <Option value="THEORIQUE">Theorique</Option>
            <Option value="PRATIQUE">Pratique</Option>
          </Select>
          <Select value={filters.niveau} onChange={(val) => setFilters((prev) => ({ ...prev, niveau: val }))}>
            <Option value="ALL">Tous les niveaux</Option>
            {niveaux.map((n) => <Option key={n} value={n}>{formatNiveau(n)}</Option>)}
          </Select>
        </div>

        <ActiveFiltersBar filters={filterChips} onRemove={removeFilter} onClearAll={clearFilters} />

        {hasActiveFilters && totalAll > 0 && (
          <div className="ctp-filter-summary">
            <span className="ctp-filter-summary__count">{totalFiltered}</span>
            <span className="ctp-filter-summary__text">
              savoir{totalFiltered > 1 ? "s" : ""} affiche{totalFiltered > 1 ? "s" : ""} sur {totalAll} au total dans {nonEmptyCompCount} competence{nonEmptyCompCount > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {compRows.length === 0 ? (
          <div className="ctp-empty-box"><EmptyState type="noResults" onClear={clearFilters} /></div>
        ) : (
          compRows.map((row) => {
            const compId = String(row.comp.id);
            const paletteIdx = scopedCompetences.findIndex((c) => String(c.id) === String(row.comp.id));
            const accent = COMP_PALETTE[(paletteIdx >= 0 ? paletteIdx : 0) % COMP_PALETTE.length];
            const isOpen = openComps.has(compId);
            const limit = visibleCount.get(compId) || PAGE;
            const visible = row.filteredLinked.slice(0, limit);
            const hasMore = row.filteredLinked.length > limit;
            const moreCount = Math.min(PAGE, row.filteredLinked.length - limit);

            return (
              <section key={compId} className="ctp-acc-section">
                <button className="ctp-acc-header" onClick={() => setOpenComps((prev) => {
                  const next = new Set(prev);
                  if (next.has(compId)) next.delete(compId);
                  else next.add(compId);
                  return next;
                })}>
                  <span className="ctp-acc-colorbar" style={{ background: accent }} />
                  <div className="ctp-acc-info">
                    <div className="ctp-acc-title">{row.comp.nom}</div>
                    <div className="ctp-acc-sub">{row.comp.code}</div>
                  </div>
                  <span className="ctp-badge ctp-badge--muted">
                    {row.filteredLinked.length}
                    {row.filteredLinked.length !== row.allLinked.length && <span className="ctp-count-total">/{row.allLinked.length}</span>} savoir{row.filteredLinked.length > 1 ? "s" : ""}
                  </span>
                  <div className="ctp-acc-pills">
                    <Badge text={`${row.theo} theo.`} type="theorique" />
                    <Badge text={`${row.prat} prat.`} type="pratique" />
                  </div>
                  <span className={`ctp-acc-chevron${isOpen ? " open" : ""}`}>{isOpen ? "▼" : "►"}</span>
                </button>

                {isOpen && (
                  row.filteredLinked.length === 0 ? (
                    <div className="ctp-empty-box"><EmptyState type="noResults" onClear={clearFilters} /></div>
                  ) : (
                    <>
                      <div className="ctp-savoir-grid">
                        {visible.map((savoir) => {
                          const niveauStyle = getNiveauStyle(savoir.niveau);
                          return (
                            <button key={savoir.id} className="ctp-savoir-mini" style={{ borderLeftColor: accent }} onClick={() => onOpenSavoir(savoir)}>
                              <div className="ctp-savoir-mini__code" style={{ color: accent }}>{savoir.code}</div>
                              <div className="ctp-savoir-mini__nom">{savoir.nom}</div>
                              <div className="ctp-savoir-mini__footer">
                                <Badge text={getTypeLabel(savoir.type)} type={getTypeBadge(savoir.type)} />
                                <span className="ctp-badge" style={{ color: niveauStyle.color, background: niveauStyle.bg, borderColor: niveauStyle.border }}>
                                  {formatNiveau(savoir.niveau)}
                                </span>
                                {savoir.isDirect && <span className="ctp-badge-direct">direct</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {hasMore && (
                        <div className="ctp-show-more">
                          <button
                            className="ctp-show-more-btn"
                            onClick={() => setVisibleCount((prev) => {
                              const next = new Map(prev);
                              next.set(compId, limit + PAGE);
                              return next;
                            })}
                          >
                            Voir {moreCount} savoir{moreCount > 1 ? "s" : ""} de plus
                            <span className="ctp-show-more-total">({limit} / {row.filteredLinked.length})</span>
                          </button>
                        </div>
                      )}
                    </>
                  )
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

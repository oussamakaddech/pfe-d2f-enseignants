import { Fragment, useEffect, useMemo, useState } from 'react';
import { Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  ACTIVE_COMP_KEY,
  COMP_PALETTE,
  OPEN_COMPS_KEY,
  buildFilterChips,
  formatNiveau,
  getNiveauStyle,
  getTypeBadge,
  getTypeLabel,
  groupSavoirsBySousCompetence,
  hasAnyActiveFilters,
  indexSousCompetences,
  toNiveauRank,
  type FlatSavoir,
  type SousCompInfo,
} from '@/utils/helpers/consultationViewUtils';
import ActiveFiltersBar from './ActiveFiltersBar';
import EmptyState from './EmptyState';
import '@/styles/pages/cards-view.css';

const { Option } = Select;
const PAGE = 20;

interface BadgeProps {
  text: string;
  type?: string;
  title?: string;
}
function Badge({ text, type = 'muted', title }: Readonly<BadgeProps>) {
  let cls = 'ctp-badge--muted';
  if (type === 'theorique') cls = 'ctp-badge--theorique';
  else if (type === 'pratique') cls = 'ctp-badge--pratique';
  else if (type === 'sousc') cls = 'ctp-badge--sousc';
  return (
    <span className={`ctp-badge ${cls}`} title={title}>
      {text}
    </span>
  );
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface CompetenceRef {
  id?: number | string;
  code?: string;
  nom?: string;
  domaineId?: number | string;
}

interface SousCompRef {
  id?: number | string;
  code?: string;
  nom?: string;
  competenceId?: number | string;
  parentId?: number | string | null;
}

interface CardsViewProps {
  crud: { competences?: CompetenceRef[]; sousComps?: SousCompRef[] };
  selectedDomaine: number | string | null;
  /** Compétences autorisées par les filtres UP / département (null = pas de restriction). */
  allowedCompetenceIds?: Set<string> | null;
  flatSavoirs: FlatSavoir[];
  onOpenSavoir: (savoir: FlatSavoir) => void;
  openAll: boolean;
  onOpenAllConsumed: () => void;
}

export default function CardsView({
  crud,
  selectedDomaine,
  allowedCompetenceIds = null,
  flatSavoirs,
  onOpenSavoir,
  openAll,
  onOpenAllConsumed,
}: Readonly<CardsViewProps>) {
  const scIndex = useMemo(() => indexSousCompetences(crud.sousComps || []), [crud.sousComps]);

  const scByComp = useMemo(() => {
    const map = new Map<string, SousCompInfo[]>();
    scIndex.forEach((info) => {
      if (!info.competenceId) return;
      const list = map.get(info.competenceId) ?? [];
      list.push(info);
      map.set(info.competenceId, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => a.path.localeCompare(b.path, 'fr', { sensitivity: 'base' })),
    );
    return map;
  }, [scIndex]);

  const scopedCompetences = useMemo(
    () =>
      (crud.competences || []).filter((c: CompetenceRef) => {
        if (selectedDomaine && String(c.domaineId) !== String(selectedDomaine)) return false;
        if (allowedCompetenceIds && !allowedCompetenceIds.has(String(c.id))) return false;
        return true;
      }),
    [allowedCompetenceIds, crud.competences, selectedDomaine],
  );

  const [activeComp, setActiveComp] = useState(() => localStorage.getItem(ACTIVE_COMP_KEY) || null);
  const [visibleCount, setVisibleCount] = useState(() => new Map());
  const [openComps, setOpenComps] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(OPEN_COMPS_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw.map(String) : []);
    } catch {
      return new Set();
    }
  });
  const [filters, setFilters] = useState({ q: '', type: 'ALL', niveau: 'ALL' });
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
    setOpenComps(new Set(scopedCompetences.map((c: CompetenceRef) => String(c.id))));
    onOpenAllConsumed();
  }, [onOpenAllConsumed, openAll, scopedCompetences]);

  useEffect(() => {
    setOpenComps(new Set());
    setActiveComp(null);
  }, [allowedCompetenceIds, selectedDomaine]);

  useEffect(() => {
    setVisibleCount(new Map());
  }, [activeComp, allowedCompetenceIds, filters, selectedDomaine]);

  const niveaux = useMemo(() => {
    const all = new Set(
      flatSavoirs
        .filter((s) => (selectedDomaine ? String(s.domaineId) === String(selectedDomaine) : true))
        .filter((s) =>
          allowedCompetenceIds ? allowedCompetenceIds.has(String(s.competenceId)) : true,
        )
        .map((s) => String(s.niveau || '-')),
    );
    return Array.from(all).sort((a, b) => toNiveauRank(a) - toNiveauRank(b));
  }, [allowedCompetenceIds, flatSavoirs, selectedDomaine]);

  const q = debouncedQ.trim().toLowerCase();
  const hasActiveFilters = hasAnyActiveFilters(filters, debouncedQ);

  const compRows = useMemo(
    () =>
      scopedCompetences
        .map((comp: CompetenceRef) => {
          const allLinked = flatSavoirs.filter(
            (s) => s.competenceId != null && String(s.competenceId) === String(comp.id),
          );
          const filteredLinked = allLinked.filter((s) => {
            if (filters.type !== 'ALL' && s.type !== filters.type) return false;
            if (filters.niveau !== 'ALL' && String(s.niveau || '-') !== filters.niveau)
              return false;
            if (!q) return true;
            return [
              s.nom,
              s.code,
              s.competenceNom,
              s.sousCompetenceNom,
              s.sousCompetencePath,
              s.domaineNom,
            ]
              .join(' ')
              .toLowerCase()
              .includes(q);
          });

          return {
            comp,
            allLinked,
            filteredLinked,
            groups: groupSavoirsBySousCompetence(filteredLinked),
            theo: filteredLinked.filter((s) => s.type === 'THEORIQUE').length,
            prat: filteredLinked.filter((s) => s.type === 'PRATIQUE').length,
          };
        })
        .filter((row) => (activeComp ? String(row.comp.id) === String(activeComp) : true)),
    [activeComp, filters.niveau, filters.type, flatSavoirs, q, scopedCompetences],
  );

  const compCountById = useMemo(() => {
    const map = new Map<string, number>();
    scopedCompetences.forEach((comp: CompetenceRef) => {
      map.set(
        String(comp.id),
        flatSavoirs.filter(
          (s) => s.competenceId != null && String(s.competenceId) === String(comp.id),
        ).length,
      );
    });
    return map;
  }, [flatSavoirs, scopedCompetences]);

  const totalFiltered = useMemo(
    () => compRows.reduce((sum: number, row) => sum + row.filteredLinked.length, 0),
    [compRows],
  );
  const totalAll = useMemo(
    () => compRows.reduce((sum: number, row) => sum + row.allLinked.length, 0),
    [compRows],
  );
  const nonEmptyCompCount = useMemo(
    () => compRows.filter((row) => row.filteredLinked.length > 0).length,
    [compRows],
  );

  const clearFilters = () => setFilters({ q: '', type: 'ALL', niveau: 'ALL' });
  const removeFilter = (key: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'q' ? '' : 'ALL',
    }));
  };
  const filterChips = buildFilterChips(filters);

  if (scopedCompetences.length === 0) {
    return (
      <div className="ctp-empty-box ctp-section">
        <EmptyState type={selectedDomaine || allowedCompetenceIds ? 'noComp' : 'noData'} />
      </div>
    );
  }

  return (
    <div className="ctp-cards-layout ctp-section">
      <aside className="ctp-cards-sidebar">
        <div className="ctp-cards-sidebar__head">Competences</div>
        {scopedCompetences.map((comp: CompetenceRef, idx: number) => (
          <button
            key={comp.id}
            className={`ctp-sidebar-item${activeComp === String(comp.id) ? ' active' : ''}`}
            onClick={() => setActiveComp(String(comp.id))}
          >
            <span
              className="ctp-sidebar-dot"
              style={{ background: COMP_PALETTE[idx % COMP_PALETTE.length] }}
            />
            <span className="ctp-sidebar-name">{comp.nom}</span>
            <span className="ctp-sidebar-count">{compCountById.get(String(comp.id)) || 0}</span>
          </button>
        ))}
        <button
          className={`ctp-sidebar-item${activeComp == null ? ' active' : ''}`}
          onClick={() => setActiveComp(null)}
        >
          <span className="ctp-sidebar-dot" style={{ background: '#64748b' }} />
          <span className="ctp-sidebar-name">Toutes</span>
        </button>
      </aside>

      <div>
        <div className="ctp-cards-filters">
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            placeholder="Rechercher un savoir, code, competence, sous-competence..."
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
          <Select
            value={filters.type}
            onChange={(val) => setFilters((prev) => ({ ...prev, type: val }))}
          >
            <Option value="ALL">Tous les types</Option>
            <Option value="THEORIQUE">Theorique</Option>
            <Option value="PRATIQUE">Pratique</Option>
          </Select>
          <Select
            value={filters.niveau}
            onChange={(val) => setFilters((prev) => ({ ...prev, niveau: val }))}
          >
            <Option value="ALL">Tous les niveaux</Option>
            {niveaux.map((n) => (
              <Option key={n} value={n}>
                {formatNiveau(n)}
              </Option>
            ))}
          </Select>
        </div>

        <ActiveFiltersBar filters={filterChips} onRemove={removeFilter} onClearAll={clearFilters} />

        {hasActiveFilters && totalAll > 0 && (
          <div className="ctp-filter-summary">
            <span className="ctp-filter-summary__count">{totalFiltered}</span>
            <span className="ctp-filter-summary__text">
              savoir{totalFiltered > 1 ? 's' : ''} affiche{totalFiltered > 1 ? 's' : ''} sur{' '}
              {totalAll} au total dans {nonEmptyCompCount} competence
              {nonEmptyCompCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {compRows.length === 0 ? (
          <div className="ctp-empty-box">
            <EmptyState type="noResults" onClear={clearFilters} />
          </div>
        ) : (
          compRows.map((row) => {
            const compId = String(row.comp.id);
            const paletteIdx = scopedCompetences.findIndex(
              (c: CompetenceRef) => String(c.id) === String(row.comp.id),
            );
            const accent = COMP_PALETTE[Math.max(paletteIdx, 0) % COMP_PALETTE.length];
            const isOpen = openComps.has(compId);
            const limit = visibleCount.get(compId) || PAGE;
            const hasMore = row.filteredLinked.length > limit;
            const moreCount = Math.min(PAGE, row.filteredLinked.length - limit);
            const sousComps = scByComp.get(compId) ?? [];
            const linkedScIds = new Set(
              row.allLinked
                .filter((s) => s.sousCompetenceId != null)
                .map((s) => String(s.sousCompetenceId)),
            );
            const emptySousComps = sousComps.filter((sc) => !linkedScIds.has(sc.id));

            let budget = limit;
            const groupBlocks = row.groups
              .map((group) => {
                const shown = group.savoirs.slice(0, Math.max(budget, 0));
                budget -= shown.length;
                return { ...group, shown };
              })
              .filter((group) => group.shown.length > 0);

            return (
              <section key={compId} className="ctp-acc-section">
                <button
                  className="ctp-acc-header"
                  onClick={() =>
                    setOpenComps((prev) => {
                      const next = new Set(prev);
                      if (next.has(compId)) next.delete(compId);
                      else next.add(compId);
                      return next;
                    })
                  }
                >
                  <span className="ctp-acc-colorbar" style={{ background: accent }} />
                  <div className="ctp-acc-info">
                    <div className="ctp-acc-title">{row.comp.nom}</div>
                    <div className="ctp-acc-sub">{row.comp.code}</div>
                  </div>
                  {sousComps.length > 0 && (
                    <Badge
                      text={`${sousComps.length} sous-comp.`}
                      type="sousc"
                      title={sousComps.map((sc) => sc.path).join(' · ')}
                    />
                  )}
                  <span className="ctp-badge ctp-badge--muted">
                    {row.filteredLinked.length}
                    {row.filteredLinked.length !== row.allLinked.length && (
                      <span className="ctp-count-total">/{row.allLinked.length}</span>
                    )}{' '}
                    savoir{row.filteredLinked.length > 1 ? 's' : ''}
                  </span>
                  <div className="ctp-acc-pills">
                    <Badge text={`${row.theo} theo.`} type="theorique" />
                    <Badge text={`${row.prat} prat.`} type="pratique" />
                  </div>
                  <span className={`ctp-acc-chevron${isOpen ? ' open' : ''}`}>
                    {isOpen ? '▼' : '►'}
                  </span>
                </button>

                {isOpen && (
                  <>
                    {row.filteredLinked.length === 0 ? (
                      <div className="ctp-empty-box">
                        <EmptyState type="noResults" onClear={clearFilters} />
                      </div>
                    ) : (
                      <>
                        <div className="ctp-savoir-grid">
                          {groupBlocks.map((group) => (
                            <Fragment key={group.key}>
                              <div
                                className={`ctp-sc-group${group.isDirect ? ' ctp-sc-group--direct' : ''}`}
                              >
                                <span className="ctp-sc-group__tag">
                                  {group.isDirect ? 'Direct' : 'Sous-competence'}
                                </span>
                                {group.code && (
                                  <span className="ctp-sc-group__code">{group.code}</span>
                                )}
                                <span className="ctp-sc-group__name" title={group.label}>
                                  {group.label}
                                </span>
                                <span className="ctp-sc-group__count">
                                  {group.shown.length}
                                  {group.shown.length !== group.savoirs.length && (
                                    <span className="ctp-count-total">/{group.savoirs.length}</span>
                                  )}{' '}
                                  savoir{group.savoirs.length > 1 ? 's' : ''}
                                </span>
                              </div>

                              {group.shown.map((savoir) => {
                                const niveauStyle = getNiveauStyle(savoir.niveau);
                                return (
                                  <button
                                    key={savoir.id}
                                    className={`ctp-savoir-mini${group.isDirect ? '' : ' ctp-savoir-mini--sc'}`}
                                    style={{ borderLeftColor: accent }}
                                    title={
                                      savoir.sousCompetencePath
                                        ? `${savoir.sousCompetencePath} — ${savoir.nom}`
                                        : savoir.nom
                                    }
                                    onClick={() => onOpenSavoir(savoir)}
                                  >
                                    <div
                                      className="ctp-savoir-mini__code"
                                      style={{ color: accent }}
                                    >
                                      {savoir.code}
                                    </div>
                                    <div className="ctp-savoir-mini__nom">{savoir.nom}</div>
                                    <div className="ctp-savoir-mini__footer">
                                      <Badge
                                        text={getTypeLabel(savoir.type ?? '')}
                                        type={getTypeBadge(savoir.type ?? '')}
                                      />
                                      <span
                                        className="ctp-badge"
                                        style={{
                                          color: niveauStyle.color,
                                          background: niveauStyle.bg,
                                          borderColor: niveauStyle.border,
                                        }}
                                      >
                                        {formatNiveau(savoir.niveau)}
                                      </span>
                                      {savoir.isDirect && (
                                        <span className="ctp-badge-direct">direct</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </Fragment>
                          ))}
                        </div>

                        {hasMore && (
                          <div className="ctp-show-more">
                            <button
                              className="ctp-show-more-btn"
                              onClick={() =>
                                setVisibleCount((prev) => {
                                  const next = new Map(prev);
                                  next.set(compId, limit + PAGE);
                                  return next;
                                })
                              }
                            >
                              Voir {moreCount} savoir{moreCount > 1 ? 's' : ''} de plus
                              <span className="ctp-show-more-total">
                                ({limit} / {row.filteredLinked.length})
                              </span>
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {emptySousComps.length > 0 && (
                      <div
                        className="ctp-sc-missing"
                        title={emptySousComps.map((sc) => sc.path).join(' · ')}
                      >
                        <span className="ctp-sc-missing__label">
                          Sous-competences sans savoir ({emptySousComps.length})
                        </span>
                        <span className="ctp-sc-missing__list">
                          {emptySousComps.map((sc) => (
                            <span key={sc.id} className="ctp-sc-missing__item">
                              {sc.path}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

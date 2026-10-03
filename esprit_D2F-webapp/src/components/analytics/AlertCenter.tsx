import { useState, useMemo, type ReactNode } from 'react';
import { List, Tag, Typography, Empty, Button, Tooltip, Select, Space, Input } from 'antd';
import {
  CheckOutlined,
  StopOutlined,
  ArrowRightOutlined,
  WarningOutlined,
  BugOutlined,
  CloudServerOutlined,
  RiseOutlined,
  ToolOutlined,
  QuestionCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  SEVERITE_COLORS,
  ALERT_STATUTS_OUVERTS,
  STATUT_ALERTE_LABELS,
} from '@/utils/analytics/constants';
import type {
  AlertEvent,
  AlertUpdatePayload,
  StatutAlerte,
  TypeAlerte,
} from '@/models/analyse/analyticsFeature';
import './alertCenter.redesign.css';

/* ── constants ──────────────────────────────────────────── */
const STATUT_OPTIONS = (Object.keys(STATUT_ALERTE_LABELS) as StatutAlerte[]).map((s) => ({
  value: s,
  label: STATUT_ALERTE_LABELS[s],
}));

const TYPE_OPTIONS = [
  { value: '__ALL__', label: 'Tous les types' },
  { value: 'GAP_CRITIQUE', label: 'Écart de couverture critique' },
  { value: 'BESOIN_NON_COUVERT', label: 'Besoin non couvert' },
  { value: 'COMPLETION_FAIBLE', label: 'Complétion faible' },
  { value: 'STAGNATION', label: 'Stagnation' },
  { value: 'REGRESSION', label: 'Régression' },
  { value: 'TENDANCE_DEPARTEMENT', label: 'Tendance département' },
];

/* Buckets de sévérité (mêmes regroupements FR/EN que les pastilles et le
 * backend) : fini les doublons Critique/Critical, Haute/Warning… */
const SEVERITE_OPTIONS = [
  { value: '__ALL__', label: 'Toutes sévérités' },
  { value: '__CRIT__', label: 'Critiques' },
  { value: '__WARN__', label: 'Avertissements' },
  { value: '__INFO__', label: 'Infos' },
];

const STATUT_FILTER_OPTIONS = [
  { value: '__ALL__', label: 'Tous statuts' },
  { value: '__OUVERT__', label: 'Ouvertes' },
  ...STATUT_OPTIONS,
];

const INITIAL_VISIBLE = 10;

/** Filtres poussés au backend (pagination réelle sur tout le volume). */
export interface AlertServerFilters {
  readonly type_alerte?: string;
  readonly severity_bucket?: 'CRITICAL' | 'WARNING' | 'INFO';
}

/* ── types ──────────────────────────────────────────────── */
interface AlertCenterProps {
  readonly alerts: AlertEvent[];
  readonly loading?: boolean;
  readonly loadingMore?: boolean;
  /** Total réel d'alertes correspondant au filtre côté backend (badge). */
  readonly total?: number;
  /** Alertes ouvertes réelles par sévérité (backend, même filtre). */
  readonly severityTotal?: { CRITICAL: number; WARNING: number; INFO: number };
  /** Permet de charger la page suivante (pagination réelle). */
  readonly canLoadMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly onUpdate?: (id: number, payload: AlertUpdatePayload) => void;
  readonly onSelectEnseignant?: (enseignantId: string) => void;
  /** Remonte type + bucket de sévérité pour filtrage côté backend. */
  readonly onServerFilterChange?: (filters: AlertServerFilters) => void;
}

const ALERT_META: Record<
  TypeAlerte,
  { label: string; priorite: string; action: string; icon: ReactNode }
> = {
  GAP_CRITIQUE: {
    label: 'Écart de couverture critique',
    priorite: 'Haute',
    action: 'Planifier une formation ciblée',
    icon: <BugOutlined />,
  },
  REGRESSION: {
    label: 'Régression',
    priorite: 'Haute',
    action: 'Diagnostiquer la cause',
    icon: <RiseOutlined />,
  },
  STAGNATION: {
    label: 'Stagnation',
    priorite: 'Moyenne',
    action: "Relancer l'enseignant",
    icon: <CloudServerOutlined />,
  },
  TENDANCE_DEPARTEMENT: {
    label: 'Tendance département',
    priorite: 'Moyenne',
    action: 'Revue départementale',
    icon: <WarningOutlined />,
  },
  COMPLETION_FAIBLE: {
    label: 'Complétion faible',
    priorite: 'Moyenne',
    action: 'Sensibiliser + rappel',
    icon: <ToolOutlined />,
  },
  BESOIN_NON_COUVERT: {
    label: 'Besoin non couvert',
    priorite: 'Haute',
    action: 'Ouvrir une session dédiée',
    icon: <QuestionCircleOutlined />,
  },
};

const PRIORITE_COLOR: Record<string, string> = {
  Haute: '#ef4444',
  Moyenne: '#f59e0b',
  Faible: '#6b7280',
};

const SEVERITE_CRIT = new Set(['CRITICAL', 'CRITIQUE']);
const SEVERITE_WARN = new Set(['WARNING', 'HAUTE', 'MOYENNE']);

/** Rang de sévérité pour le tri (critiques d'abord). */
function severiteRank(severite: string): number {
  if (SEVERITE_CRIT.has(severite)) return 0;
  if (SEVERITE_WARN.has(severite)) return 1;
  if (severite === 'INFO') return 2;
  return 3;
}

/** Date relative lisible (« Aujourd'hui 14:32 », « Hier 09:10 », « il y a 3 j »). */
function relativeDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'Date inconnue';
  const diffDays = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  const time = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (diffDays <= 0) return `Aujourd'hui ${time}`;
  if (diffDays === 1) return `Hier ${time}`;
  if (diffDays < 7) return `Il y a ${diffDays} j · ${time}`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── component ──────────────────────────────────────────── */
export default function AlertCenter({
  alerts,
  loading,
  loadingMore,
  total,
  severityTotal,
  canLoadMore,
  onLoadMore,
  onUpdate,
  onSelectEnseignant,
  onServerFilterChange,
}: AlertCenterProps) {
  /* ── filters state ── */
  const [typeFilter, setTypeFilter] = useState<string>('__ALL__');
  const [severiteFilter, setSeveriteFilter] = useState<string>('__ALL__');
  const [statutFilter, setStatutFilter] = useState<string>('__ALL__');
  const [searchText, setSearchText] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<TypeAlerte>>(new Set());

  /* Remonte type + bucket au backend (le statut et la recherche restent
   * client : pas de paramètre serveur équivalent). */
  const notifyServerFilters = (
    type: string,
    severite: string,
    notify?: (filters: AlertServerFilters) => void,
  ) => {
    if (!notify) return;
    const next: { type_alerte?: string; severity_bucket?: 'CRITICAL' | 'WARNING' | 'INFO' } = {};
    if (type !== '__ALL__') next.type_alerte = type;
    if (severite === '__CRIT__') next.severity_bucket = 'CRITICAL';
    else if (severite === '__WARN__') next.severity_bucket = 'WARNING';
    else if (severite === '__INFO__') next.severity_bucket = 'INFO';
    notify(next);
  };

  const applyTypeFilter = (v: string) => {
    setTypeFilter(v);
    notifyServerFilters(v, severiteFilter, onServerFilterChange);
  };
  const applySeveriteFilter = (v: string) => {
    setSeveriteFilter(v);
    notifyServerFilters(typeFilter, v, onServerFilterChange);
  };

  const resetFilters = () => {
    setTypeFilter('__ALL__');
    setSeveriteFilter('__ALL__');
    setStatutFilter('__ALL__');
    setSearchText('');
    notifyServerFilters('__ALL__', '__ALL__', onServerFilterChange);
  };

  const hasActiveFilters =
    typeFilter !== '__ALL__' ||
    severiteFilter !== '__ALL__' ||
    statutFilter !== '__ALL__' ||
    searchText.trim() !== '';

  /* ── filtered + sorted alerts ── */
  const filteredAlerts = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    const result = alerts.filter((a) => {
      if (typeFilter !== '__ALL__' && a.type_alerte !== typeFilter) return false;
      if (severiteFilter === '__CRIT__' && !SEVERITE_CRIT.has(a.severite)) return false;
      if (severiteFilter === '__WARN__' && !SEVERITE_WARN.has(a.severite)) return false;
      if (severiteFilter === '__INFO__' && a.severite !== 'INFO') return false;
      if (statutFilter === '__OUVERT__' && !ALERT_STATUTS_OUVERTS.includes(a.statut)) return false;
      if (statutFilter !== '__ALL__' && statutFilter !== '__OUVERT__' && a.statut !== statutFilter)
        return false;
      if (term) {
        const haystack =
          `${a.titre ?? ''} ${a.message ?? ''} ${a.enseignant_id ?? ''} ${a.departement_id ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    // Ouvertes d'abord, critiques d'abord, plus récentes d'abord.
    return [...result].sort((a, b) => {
      const openA = ALERT_STATUTS_OUVERTS.includes(a.statut) ? 0 : 1;
      const openB = ALERT_STATUTS_OUVERTS.includes(b.statut) ? 0 : 1;
      if (openA !== openB) return openA - openB;
      const rank = severiteRank(a.severite) - severiteRank(b.severite);
      if (rank !== 0) return rank;
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
  }, [alerts, typeFilter, severiteFilter, statutFilter, searchText]);

  /* ── summary (always from ALL data) ── */
  const openCount = alerts.filter((a) => ALERT_STATUTS_OUVERTS.includes(a.statut)).length;
  const useRealCounts = severityTotal != null;
  const severityCounts = {
    CRITICAL: useRealCounts
      ? severityTotal.CRITICAL
      : alerts.filter((a) => SEVERITE_CRIT.has(a.severite)).length,
    WARNING: useRealCounts
      ? severityTotal.WARNING
      : alerts.filter((a) => SEVERITE_WARN.has(a.severite)).length,
    INFO: useRealCounts ? severityTotal.INFO : alerts.filter((a) => a.severite === 'INFO').length,
  };

  /* ── group filtered alerts by type ── */
  const byType = useMemo(() => {
    const map = new Map<TypeAlerte, AlertEvent[]>();
    filteredAlerts.forEach((a) => {
      const list = map.get(a.type_alerte) ?? [];
      list.push(a);
      map.set(a.type_alerte, list);
    });
    return map;
  }, [filteredAlerts]);

  /* ── expand / collapse all ── */
  const allTypes = Array.from(byType.keys());
  const allExpanded = allTypes.length > 0 && allTypes.every((t) => expandedGroups.has(t));

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(allTypes));
    }
  };

  const toggleGroup = (type: TypeAlerte) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  /* ── per-group visible items ── */
  const getVisibleItems = (type: TypeAlerte, list: AlertEvent[]) => {
    if (expandedGroups.has(type)) return list;
    return list.slice(0, INITIAL_VISIBLE);
  };

  const isGroupTruncated = (type: TypeAlerte, list: AlertEvent[]) =>
    !expandedGroups.has(type) && list.length > INITIAL_VISIBLE;

  if (!loading && alerts.length === 0) return <Empty description="Aucune alerte" />;

  return (
    <div className="ac-page">
      {/* ── Summary bar ─────────────────────────────────── */}
      <div className="ac-summary">
        <div className="ac-summary__total">
          <span className="ac-summary__count">
            {total != null && total > alerts.length ? total : openCount}
          </span>
          <span className="ac-summary__label">alertes ouvertes</span>
        </div>
        <div className="ac-summary__separateur" />
        <div className="ac-summary__chips">
          <Button
            size="small"
            type={severiteFilter === '__ALL__' ? 'primary' : 'text'}
            onClick={() => applySeveriteFilter('__ALL__')}
          >
            Toutes
          </Button>
          <Button
            size="small"
            danger
            type={severiteFilter === '__CRIT__' ? 'primary' : 'text'}
            onClick={() => applySeveriteFilter('__CRIT__')}
          >
            {severityCounts.CRITICAL} critiques
          </Button>
          <Button
            size="small"
            type={severiteFilter === '__WARN__' ? 'primary' : 'text'}
            style={
              severiteFilter === '__WARN__'
                ? { background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }
                : { color: '#d97706' }
            }
            onClick={() => applySeveriteFilter('__WARN__')}
          >
            {severityCounts.WARNING} warnings
          </Button>
          <Button
            size="small"
            type={severiteFilter === '__INFO__' ? 'primary' : 'text'}
            onClick={() => applySeveriteFilter('__INFO__')}
          >
            {severityCounts.INFO} infos
          </Button>
        </div>
      </div>

      {/* ── Distribution bar (proportions réelles) ──────── */}
      {(() => {
        const crit = severityCounts.CRITICAL;
        const warn = severityCounts.WARNING;
        const info = severityCounts.INFO;
        const sum = crit + warn + info;
        if (sum <= 0) return null;
        const pct = (v: number) => `${((v / sum) * 100).toFixed(1).replace('.', ',')} %`;
        return (
          <div className="ac-dist">
            <div className="ac-dist__bar">
              {crit > 0 && (
                <span
                  className="ac-dist__seg ac-dist__seg--critical"
                  style={{ width: `${(crit / sum) * 100}%` }}
                  title={`${crit} critiques (${pct(crit)})`}
                />
              )}
              {warn > 0 && (
                <span
                  className="ac-dist__seg ac-dist__seg--warning"
                  style={{ width: `${(warn / sum) * 100}%` }}
                  title={`${warn} warnings (${pct(warn)})`}
                />
              )}
              {info > 0 && (
                <span
                  className="ac-dist__seg ac-dist__seg--info"
                  style={{ width: `${(info / sum) * 100}%` }}
                  title={`${info} infos (${pct(info)})`}
                />
              )}
            </div>
            <div className="ac-dist__legend">
              {crit > 0 && (
                <span>
                  <i className="ac-dist__dot ac-dist__dot--critical" />
                  <b>{crit}</b> critiques · {pct(crit)}
                </span>
              )}
              {warn > 0 && (
                <span>
                  <i className="ac-dist__dot ac-dist__dot--warning" />
                  <b>{warn}</b> warnings · {pct(warn)}
                </span>
              )}
              {info > 0 && (
                <span>
                  <i className="ac-dist__dot ac-dist__dot--info" />
                  <b>{info}</b> infos · {pct(info)}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Filters ────────────────────────────────────── */}
      <div className="ac-filters">
        <FilterOutlined className="ac-filters__icon" />
        <Space size={8} wrap>
          <Input
            allowClear
            size="small"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Rechercher (titre, message, enseignant…)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 230 }}
          />
          <Select
            size="small"
            value={typeFilter}
            onChange={applyTypeFilter}
            options={TYPE_OPTIONS}
            style={{ width: 180 }}
          />
          <Select
            size="small"
            value={severiteFilter}
            onChange={applySeveriteFilter}
            options={SEVERITE_OPTIONS}
            style={{ width: 160 }}
          />
          <Select
            size="small"
            value={statutFilter}
            onChange={setStatutFilter}
            options={STATUT_FILTER_OPTIONS}
            style={{ width: 160 }}
          />
          {hasActiveFilters && (
            <Button size="small" type="link" icon={<ReloadOutlined />} onClick={resetFilters}>
              Réinitialiser
            </Button>
          )}
        </Space>
        {allTypes.length > 1 && (
          <Button size="small" type="link" onClick={toggleAll} className="ac-filters__expand">
            {allExpanded ? 'Tout réduire' : 'Tout développer'}
          </Button>
        )}
      </div>

      {/* ── Alert groups ─────────────────────────────────── */}
      <div className="ac-groups">
        {allTypes.length === 0 && <Empty description="Aucune alerte ne correspond aux filtres" />}
        {allTypes.map((type) => {
          const list = byType.get(type)!;
          const meta = ALERT_META[type] ?? {
            label: type,
            priorite: 'Moyenne',
            action: 'Traiter',
            icon: <WarningOutlined />,
          };
          const accentColor = PRIORITE_COLOR[meta.priorite] ?? '#6b7280';
          const visible = getVisibleItems(type, list);
          const truncated = isGroupTruncated(type, list);

          return (
            <div key={type} className="ac-group">
              <div className="ac-group__header" style={{ borderLeftColor: accentColor }}>
                <span className="ac-group__icon" style={{ background: accentColor }}>
                  {meta.icon}
                </span>
                <div className="ac-group__meta">
                  <span className="ac-group__label">{meta.label}</span>
                  <span className="ac-group__action">{meta.action}</span>
                </div>
                <span className="ac-group__badge" style={{ background: accentColor }}>
                  {list.length}
                </span>
              </div>

              <div className="ac-group__items">
                <List
                  loading={loading}
                  dataSource={visible}
                  renderItem={(a) => {
                    const isOpen = ALERT_STATUTS_OUVERTS.includes(a.statut);
                    const actions: ReactNode[] = [
                      <Select
                        key="statut"
                        size="small"
                        value={a.statut}
                        style={{ width: 132 }}
                        options={STATUT_OPTIONS}
                        onChange={(s: StatutAlerte) => onUpdate?.(a.id, { statut: s })}
                      />,
                    ];
                    if (isOpen && onUpdate) {
                      actions.push(
                        <Tooltip key="act" title={meta.action}>
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => onUpdate(a.id, { statut: 'TRAITEE' })}
                          />
                        </Tooltip>,
                        <Button
                          key="ign"
                          size="small"
                          icon={<StopOutlined />}
                          onClick={() => onUpdate(a.id, { statut: 'IGNOREE' })}
                        />,
                      );
                    }
                    const sevColor = (SEVERITE_COLORS[a.severite] as string) ?? '#94a3b8';
                    return (
                      <List.Item
                        className={`ac-item${isOpen ? '' : ' ac-item--traitee'}`}
                        style={{ borderLeft: `3px solid ${sevColor}` }}
                        actions={actions}
                      >
                        <List.Item.Meta
                          title={
                            <span className="ac-item__title">
                              <Tag color={sevColor}>{a.severite}</Tag>
                              {a.enseignant_id && onSelectEnseignant ? (
                                <button
                                  type="button"
                                  className="ac-item__link"
                                  onClick={() => onSelectEnseignant(a.enseignant_id!)}
                                >
                                  {a.titre} <ArrowRightOutlined />
                                </button>
                              ) : (
                                a.titre
                              )}
                            </span>
                          }
                          description={
                            <div>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {a.message}
                              </Typography.Text>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#94a3b8',
                                  marginTop: 2,
                                }}
                              >
                                <Tooltip
                                  title={(() => {
                                    const d = new Date(a.created_at);
                                    return Number.isFinite(d.getTime())
                                      ? d.toLocaleString('fr-FR')
                                      : 'Date inconnue';
                                  })()}
                                >
                                  <span>{relativeDate(a.created_at)}</span>
                                </Tooltip>
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
                {truncated && (
                  <div className="ac-group__more">
                    <Button type="link" size="small" onClick={() => toggleGroup(type)}>
                      + {list.length - INITIAL_VISIBLE} alertes de plus — Tout afficher
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Load more (pagination réelle) ───────────────── */}
      {canLoadMore && onLoadMore && (
        <div className="ac-groups__more">
          <Button
            block
            size="small"
            type="dashed"
            icon={<DownOutlined />}
            loading={loadingMore}
            onClick={onLoadMore}
          >
            Charger plus d'alertes — {alerts.length} / {total ?? alerts.length} affichées
          </Button>
        </div>
      )}
    </div>
  );
}

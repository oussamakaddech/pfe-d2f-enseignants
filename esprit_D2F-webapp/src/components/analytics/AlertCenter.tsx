import { useState, useMemo, type ReactNode } from "react";
import { List, Tag, Typography, Empty, Button, Tooltip, Select, Space } from "antd";
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
} from "@ant-design/icons";
import {
  SEVERITE_COLORS,
  STATUT_ALERTE_COLORS,
  ALERT_STATUTS_OUVERTS,
  STATUT_ALERTE_LABELS,
} from "@/utils/analytics/constants";
import type {
  AlertEvent,
  AlertUpdatePayload,
  StatutAlerte,
  TypeAlerte,
} from "@/models/analyse/analyticsFeature";
import "./alertCenter.redesign.css";

/* ── constants ──────────────────────────────────────────── */
const STATUT_OPTIONS = (Object.keys(STATUT_ALERTE_LABELS) as StatutAlerte[]).map((s) => ({
  value: s,
  label: STATUT_ALERTE_LABELS[s],
}));

const TYPE_OPTIONS = [
  { value: "__ALL__", label: "Tous les types" },
  { value: "GAP_CRITIQUE", label: "Gap critique" },
  { value: "BESOIN_NON_COUVERT", label: "Besoin non couvert" },
  { value: "COMPLETION_FAIBLE", label: "Complétion faible" },
  { value: "STAGNATION", label: "Stagnation" },
  { value: "REGRESSION", label: "Régression" },
  { value: "TENDANCE_DEPARTEMENT", label: "Tendance département" },
];

const SEVERITE_OPTIONS = [
  { value: "__ALL__", label: "Toutes sévérités" },
  { value: "CRITIQUE", label: "Critique" },
  { value: "HAUTE", label: "Haute" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
  { value: "INFO", label: "Info" },
];

const STATUT_FILTER_OPTIONS = [
  { value: "__ALL__", label: "Tous statuts" },
  { value: "__OUVERT__", label: "Ouvertes" },
  ...STATUT_OPTIONS,
];

const INITIAL_VISIBLE = 10;

/* ── types ──────────────────────────────────────────────── */
interface AlertCenterProps {
  readonly alerts: AlertEvent[];
  readonly loading?: boolean;
  readonly onUpdate?: (id: number, payload: AlertUpdatePayload) => void;
  readonly onSelectEnseignant?: (enseignantId: string) => void;
}

const ALERT_META: Record<
  TypeAlerte,
  { label: string; priorite: string; action: string; icon: ReactNode }
> = {
  GAP_CRITIQUE: { label: "Gap critique", priorite: "Haute", action: "Planifier une formation ciblée", icon: <BugOutlined /> },
  REGRESSION: { label: "Régression", priorite: "Haute", action: "Diagnostiquer la cause", icon: <RiseOutlined /> },
  STAGNATION: { label: "Stagnation", priorite: "Moyenne", action: "Relancer l'enseignant", icon: <CloudServerOutlined /> },
  TENDANCE_DEPARTEMENT: { label: "Tendance département", priorite: "Moyenne", action: "Revue départementale", icon: <WarningOutlined /> },
  COMPLETION_FAIBLE: { label: "Complétion faible", priorite: "Moyenne", action: "Sensibiliser + rappel", icon: <ToolOutlined /> },
  BESOIN_NON_COUVERT: { label: "Besoin non couvert", priorite: "Haute", action: "Ouvrir une session dédiée", icon: <QuestionCircleOutlined /> },
};

const ACTION_VERB: Record<TypeAlerte, string> = {
  GAP_CRITIQUE: "Planifier",
  REGRESSION: "Diagnostiquer",
  STAGNATION: "Relancer",
  TENDANCE_DEPARTEMENT: "Revue",
  COMPLETION_FAIBLE: "Sensibiliser",
  BESOIN_NON_COUVERT: "Ouvrir session",
};

const PRIORITE_COLOR: Record<string, string> = {
  Haute: "#ef4444",
  Moyenne: "#f59e0b",
  Faible: "#6b7280",
};

const SEVERITE_CRIT = ["CRITICAL", "CRITIQUE"];
const SEVERITE_WARN = ["WARNING", "HAUTE", "MOYENNE"];

/* ── component ──────────────────────────────────────────── */
export default function AlertCenter({
  alerts,
  loading,
  onUpdate,
  onSelectEnseignant,
}: AlertCenterProps) {
  /* ── filters state ── */
  const [typeFilter, setTypeFilter] = useState<string>("__ALL__");
  const [severiteFilter, setSeveriteFilter] = useState<string>("__ALL__");
  const [statutFilter, setStatutFilter] = useState<string>("__ALL__");
  const [expandedGroups, setExpandedGroups] = useState<Set<TypeAlerte>>(new Set());

  const resetFilters = () => {
    setTypeFilter("__ALL__");
    setSeveriteFilter("__ALL__");
    setStatutFilter("__ALL__");
  };

  const hasActiveFilters =
    typeFilter !== "__ALL__" || severiteFilter !== "__ALL__" || statutFilter !== "__ALL__";

  /* ── filtered alerts ── */
  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (typeFilter !== "__ALL__") {
      result = result.filter((a) => a.type_alerte === typeFilter);
    }
    if (severiteFilter !== "__ALL__") {
      if (severiteFilter === "__OUVERT__") {
        result = result.filter((a) => ALERT_STATUTS_OUVERTS.includes(a.statut));
      } else {
        result = result.filter((a) => a.severite === severiteFilter);
      }
    }
    if (statutFilter === "__OUVERT__") {
      result = result.filter((a) => ALERT_STATUTS_OUVERTS.includes(a.statut));
    } else if (statutFilter !== "__ALL__") {
      result = result.filter((a) => a.statut === statutFilter);
    }
    return result;
  }, [alerts, typeFilter, severiteFilter, statutFilter]);

  /* ── summary (always from ALL data) ── */
  const openCount = alerts.filter((a) =>
    ALERT_STATUTS_OUVERTS.includes(a.statut),
  ).length;
  const severityCounts = {
    CRITICAL: alerts.filter((a) => SEVERITE_CRIT.includes(a.severite)).length,
    WARNING: alerts.filter((a) => SEVERITE_WARN.includes(a.severite)).length,
    INFO: alerts.filter((a) => a.severite === "INFO").length,
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

  if (!loading && alerts.length === 0)
    return <Empty description="Aucune alerte" />;

  return (
    <div className="ac-page">
      {/* ── Summary bar ─────────────────────────────────── */}
      <div className="ac-summary">
        <div className="ac-summary__total">
          <span className="ac-summary__count">{openCount}</span>
          <span className="ac-summary__label">alertes ouvertes</span>
        </div>
        <div className="ac-summary__separateur" />
        <div className="ac-summary__item">
          <span className="ac-dot ac-dot--critical" />
          <span className="ac-summary__num">{severityCounts.CRITICAL}</span>
          <span className="ac-summary__text">critiques</span>
        </div>
        <div className="ac-summary__item">
          <span className="ac-dot ac-dot--warning" />
          <span className="ac-summary__num">{severityCounts.WARNING}</span>
          <span className="ac-summary__text">warnings</span>
        </div>
        <div className="ac-summary__item">
          <span className="ac-dot ac-dot--info" />
          <span className="ac-summary__num">{severityCounts.INFO}</span>
          <span className="ac-summary__text">infos</span>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="ac-filters">
        <FilterOutlined className="ac-filters__icon" />
        <Space size={8} wrap>
          <Select
            size="small"
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_OPTIONS}
            style={{ width: 180 }}
          />
          <Select
            size="small"
            value={severiteFilter}
            onChange={setSeveriteFilter}
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
            <Button
              size="small"
              type="link"
              icon={<ReloadOutlined />}
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          )}
        </Space>
        {allTypes.length > 1 && (
          <Button
            size="small"
            type="link"
            onClick={toggleAll}
            className="ac-filters__expand"
          >
            {allExpanded ? "Tout réduire" : "Tout développer"}
          </Button>
        )}
      </div>

      {/* ── Alert groups ─────────────────────────────────── */}
      <div className="ac-groups">
        {allTypes.length === 0 && (
          <Empty description="Aucune alerte ne correspond aux filtres" />
        )}
        {allTypes.map((type) => {
          const list = byType.get(type)!;
          const meta = ALERT_META[type] ?? {
            label: type,
            priorite: "Moyenne",
            action: "Traiter",
            icon: <WarningOutlined />,
          };
          const verb = ACTION_VERB[type] ?? "Traiter";
          const accentColor = PRIORITE_COLOR[meta.priorite] ?? "#6b7280";
          const visible = getVisibleItems(type, list);
          const truncated = isGroupTruncated(type, list);

          return (
            <div key={type} className="ac-group">
              <div
                className="ac-group__header"
                style={{ borderLeftColor: accentColor }}
              >
                <span
                  className="ac-group__icon"
                  style={{ background: accentColor }}
                >
                  {meta.icon}
                </span>
                <div className="ac-group__meta">
                  <span className="ac-group__label">{meta.label}</span>
                  <span className="ac-group__action">{meta.action}</span>
                </div>
                <span
                  className="ac-group__badge"
                  style={{ background: accentColor }}
                >
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
                            onClick={() =>
                              onUpdate(a.id, { statut: "TRAITEE" })
                            }
                          />
                        </Tooltip>,
                        <Button
                          key="ign"
                          size="small"
                          icon={<StopOutlined />}
                          onClick={() =>
                            onUpdate(a.id, { statut: "IGNOREE" })
                          }
                        />,
                      );
                    }
                    return (
                      <List.Item className="ac-item" actions={actions}>
                        <List.Item.Meta
                          title={
                            <span className="ac-item__title">
                              <Tag
                                color={
                                  (SEVERITE_COLORS[a.severite] as string) ?? "default"
                                }
                              >
                                {a.severite}
                              </Tag>
                              {a.enseignant_id && onSelectEnseignant ? (
                                <button
                                  type="button"
                                  className="ac-item__link"
                                  onClick={() =>
                                    onSelectEnseignant(a.enseignant_id!)
                                  }
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
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12 }}
                              >
                                {a.message}
                              </Typography.Text>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#94a3b8",
                                  marginTop: 2,
                                }}
                              >
                                {(() => {
                                  const d = new Date(a.created_at);
                                  return Number.isFinite(d.getTime())
                                    ? d.toLocaleString("fr-FR")
                                    : "Date inconnue";
                                })()}
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
                    <Button
                      type="link"
                      size="small"
                      onClick={() => toggleGroup(type)}
                    >
                      + {list.length - INITIAL_VISIBLE} alertes de plus — Tout afficher
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

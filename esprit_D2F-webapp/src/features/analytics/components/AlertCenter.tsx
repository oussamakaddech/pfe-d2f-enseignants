import type { ReactNode } from "react";
import { List, Tag, Typography, Empty, Badge, Collapse, Button, Space, Tooltip, Select } from "antd";
import { CheckOutlined, StopOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { SEVERITE_COLORS, STATUT_ALERTE_COLORS, ALERT_STATUTS_OUVERTS, STATUT_ALERTE_LABELS } from "../constants";
import type { AlertEvent, AlertUpdatePayload, StatutAlerte, TypeAlerte } from "../types";

const STATUT_OPTIONS = (Object.keys(STATUT_ALERTE_LABELS) as StatutAlerte[]).map((s) => ({
  value: s,
  label: STATUT_ALERTE_LABELS[s],
}));

interface AlertCenterProps {
  alerts: AlertEvent[];
  loading?: boolean;
  onUpdate?: (id: number, payload: AlertUpdatePayload) => void;
  onSelectEnseignant?: (enseignantId: string) => void;
}

/** Métadonnées métier par type d'alerte : priorité + action recommandée (F6). */
const ALERT_META: Record<TypeAlerte, { label: string; priorite: string; action: string }> = {
  GAP_CRITIQUE: { label: "Gap critique", priorite: "Haute", action: "Planifier une formation ciblée" },
  REGRESSION: { label: "Régression", priorite: "Haute", action: "Diagnostiquer la cause" },
  STAGNATION: { label: "Stagnation", priorite: "Moyenne", action: "Relancer l'enseignant" },
  TENDANCE_DEPARTEMENT: { label: "Tendance département", priorite: "Moyenne", action: "Revue départementale" },
  COMPLETION_FAIBLE: { label: "Complétion faible", priorite: "Moyenne", action: "Sensibiliser + rappel" },
  BESOIN_NON_COUVERT: { label: "Besoin non couvert", priorite: "Haute", action: "Ouvrir une session dédiée" },
};

/** Verbe court affiché sur le bouton d'action contextuelle. */
const ACTION_VERB: Record<TypeAlerte, string> = {
  GAP_CRITIQUE: "Planifier",
  REGRESSION: "Diagnostiquer",
  STAGNATION: "Relancer",
  TENDANCE_DEPARTEMENT: "Revue",
  COMPLETION_FAIBLE: "Sensibiliser",
  BESOIN_NON_COUVERT: "Ouvrir session",
};

const PRIORITE_COLOR: Record<string, string> = {
  Haute: "red",
  Moyenne: "orange",
  Faible: "default",
};

/** Centre d'alertes : regroupé par type, statut explicite, action contextuelle (F5/F6). */
export default function AlertCenter({ alerts, loading, onUpdate, onSelectEnseignant }: AlertCenterProps) {
  if (!loading && alerts.length === 0) return <Empty description="Aucune alerte" />;

  const openCount = alerts.filter((a) => ALERT_STATUTS_OUVERTS.includes(a.statut)).length;
  const counts = {
    CRITICAL: alerts.filter((a) => a.severite === "CRITICAL").length,
    WARNING: alerts.filter((a) => a.severite === "WARNING").length,
    INFO: alerts.filter((a) => a.severite === "INFO").length,
  };

  // Regroupement par type d'alerte.
  const byType = new Map<TypeAlerte, AlertEvent[]>();
  alerts.forEach((a) => {
    const list = byType.get(a.type_alerte) ?? [];
    list.push(a);
    byType.set(a.type_alerte, list);
  });

  const items = Array.from(byType.entries()).map(([type, list]) => {
    const meta = ALERT_META[type] ?? { label: type, priorite: "Moyenne", action: "Traiter" };
    const verb = ACTION_VERB[type] ?? "Traiter";
    return {
      key: type,
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Tag color={PRIORITE_COLOR[meta.priorite]}>{meta.priorite}</Tag>
          <b>{meta.label}</b>
          <Badge count={list.length} color="#c8102e" overflowCount={99} />
        </span>
      ),
      children: (
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            Action recommandée : <i>{meta.action}</i>
          </div>
          <List
            loading={loading}
            dataSource={list}
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
                      onClick={() => onUpdate(a.id, { statut: "TRAITEE" })}
                    >
                      {verb}
                    </Button>
                  </Tooltip>,
                );
                actions.push(
                  <Button
                    key="ign"
                    size="small"
                    icon={<StopOutlined />}
                    onClick={() => onUpdate(a.id, { statut: "IGNOREE" })}
                  >
                    Ignorer
                  </Button>,
                );
              }
              return (
                <List.Item actions={actions}>
                  <List.Item.Meta
                    title={
                      <span>
                        <Tag color={SEVERITE_COLORS[a.severite] as string}>{a.severite}</Tag>
                        <Tag color={STATUT_ALERTE_COLORS[a.statut] ?? "default"}>
                          {STATUT_ALERTE_LABELS[a.statut] ?? a.statut}
                        </Tag>
                        {a.enseignant_id && onSelectEnseignant ? (
                          <a onClick={() => onSelectEnseignant(a.enseignant_id!)}>
                            {a.titre} <ArrowRightOutlined />
                          </a>
                        ) : (
                          a.titre
                        )}
                      </span>
                    }
                    description={
                      <div>
                        <Typography.Text type="secondary">{a.message}</Typography.Text>
                        <div style={{ fontSize: 12, color: "#bfbfbf" }}>
                          {new Date(a.created_at).toLocaleString("fr-FR")}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </div>
      ),
    };
  });

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Badge count={openCount} color="#c8102e" overflowCount={999} />
        <span>alertes ouvertes</span>
        <span style={{ color: "#bfbfbf" }}>·</span>
        <Badge count={counts.CRITICAL} color="#f5222d" overflowCount={99} />
        <span>critiques</span>
        <Badge count={counts.WARNING} color="#fa8c16" overflowCount={99} />
        <span>warnings</span>
        <Badge count={counts.INFO} color="#1677ff" overflowCount={99} />
        <span>infos</span>
      </div>
      <Collapse items={items} defaultActiveKey={Array.from(byType.keys())} size="small" />
    </div>
  );
}

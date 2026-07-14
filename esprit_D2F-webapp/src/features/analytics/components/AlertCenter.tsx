import { List, Tag, Typography, Empty, Badge, Collapse } from "antd";
import { SEVERITE_COLORS } from "../constants";
import type { AlertEvent, TypeAlerte } from "../types";

interface AlertCenterProps {
  alerts: AlertEvent[];
  loading?: boolean;
  onAcknowledge?: (id: number) => void;
}

/** Métadonnées métier par type d'alerte : priorité + action recommandée. */
const ALERT_META: Record<TypeAlerte, { label: string; priorite: string; action: string }> = {
  GAP_CRITIQUE: { label: "Gap critique", priorite: "Haute", action: "Planifier une formation ciblée" },
  REGRESSION: { label: "Régression", priorite: "Haute", action: "Diagnostiquer la cause + accompagnement" },
  STAGNATION: { label: "Stagnation", priorite: "Moyenne", action: "Relancer l'enseignant" },
  TENDANCE_DEPARTEMENT: { label: "Tendance département", priorite: "Moyenne", action: "Revue départementale" },
  COMPLETION_FAIBLE: { label: "Complétion faible", priorite: "Moyenne", action: "Sensibiliser + rappel" },
  BESOIN_NON_COUVERT: { label: "Besoin non couvert", priorite: "Haute", action: "Ouvrir une session dédiée" },
};

const PRIORITE_COLOR: Record<string, string> = {
  Haute: "red",
  Moyenne: "orange",
  Faible: "default",
};

/** Centre d'alertes groupé par type, avec priorité métier et action recommandée. */
export default function AlertCenter({ alerts, loading, onAcknowledge }: AlertCenterProps) {
  if (!loading && alerts.length === 0) return <Empty description="Aucune alerte" />;

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
            renderItem={(a) => (
              <List.Item
                actions={
                  a.statut === "NOUVELLE" && onAcknowledge
                    ? [<a key="ack" onClick={() => onAcknowledge(a.id)}>Traiter</a>]
                    : undefined
                }
              >
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={SEVERITE_COLORS[a.severite] as string}>{a.severite}</Tag>
                      <Tag color={a.statut === "NOUVELLE" ? "blue" : "default"}>{a.statut}</Tag>
                      {a.titre}
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
            )}
          />
        </div>
      ),
    };
  });

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Badge count={counts.CRITICAL} color="#f5222d" overflowCount={99} />
        <span style={{ margin: "0 12px" }}>Critiques</span>
        <Badge count={counts.WARNING} color="#fa8c16" overflowCount={99} />
        <span style={{ margin: "0 12px" }}>Warnings</span>
        <Badge count={counts.INFO} color="#1677ff" overflowCount={99} />
        <span>Infos</span>
      </div>
      <Collapse items={items} defaultActiveKey={Array.from(byType.keys())} size="small" />
    </div>
  );
}

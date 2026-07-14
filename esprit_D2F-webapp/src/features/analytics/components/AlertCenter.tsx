import { List, Tag, Typography, Empty, Badge } from "antd";
import { SEVERITE_COLORS } from "../constants";
import type { AlertEvent } from "../types";

interface AlertCenterProps {
  alerts: AlertEvent[];
  loading?: boolean;
  onAcknowledge?: (id: number) => void;
}

/** Centre d'alertes (CRITIQUE, REGRESSION, STAGNATION…). */
export default function AlertCenter({ alerts, loading, onAcknowledge }: AlertCenterProps) {
  if (!loading && alerts.length === 0) return <Empty description="Aucune alerte" />;

  const counts = {
    CRITICAL: alerts.filter((a) => a.severite === "CRITICAL").length,
    WARNING: alerts.filter((a) => a.severite === "WARNING").length,
    INFO: alerts.filter((a) => a.severite === "INFO").length,
  };

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
      <List
        loading={loading}
        dataSource={alerts}
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
                  {a.titre}
                </span>
              }
              description={
                <div>
                  <Typography.Text type="secondary">{a.message}</Typography.Text>
                  <div style={{ fontSize: 12, color: "#bfbfbf" }}>
                    {a.type_alerte} · {new Date(a.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}

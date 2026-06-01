import { memo } from "react";
import { Tag, Tooltip, Space } from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useModelStatus, type ModelStatus } from "@/hooks/analyse/useModelStatus";

interface Props {
  refreshKey?: number;
}

const STYLES: Record<ModelStatus, { color: string; icon: React.ReactNode; label: string }> = {
  loading:  { color: "default", icon: <ClockCircleOutlined spin />, label: "Vérification…" },
  no_model: { color: "orange",  icon: <ExclamationCircleOutlined />, label: "Mode heuristique" },
  fresh:    { color: "green",   icon: <CheckCircleOutlined />,       label: "Modèle à jour" },
  stale:    { color: "orange",  icon: <ClockCircleOutlined />,       label: "Modèle ancien" },
  drift:    { color: "red",     icon: <WarningOutlined />,           label: "Dérive détectée" },
  error:    { color: "default", icon: <ExclamationCircleOutlined />, label: "Statut indisponible" },
};

const ModelStatusBadge = memo(function ModelStatusBadge({ refreshKey = 0 }: Readonly<Props>) {
  const { report, status } = useModelStatus(refreshKey);

  const meta = STYLES[status];
  const tooltip = report?.recommendation
    || report?.message
    || (report?.days_since_training === undefined
        ? "Statut du modèle prédictif"
        : `Entraîné il y a ${report.days_since_training} jours`);

  return (
    <Tooltip title={tooltip}>
      <Tag color={meta.color} style={{ borderRadius: 12, padding: "2px 10px" }}>
        <Space size={4}>
          {meta.icon}
          {meta.label}
        </Space>
      </Tag>
    </Tooltip>
  );
});

export default ModelStatusBadge;

import { useEffect, useState } from "react";
import { Tag, Tooltip, Space } from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import AnalysePredictiveService, { DriftReport } from "@/services/analyse/AnalysePredictiveService";

type Status = "loading" | "no_model" | "fresh" | "stale" | "drift" | "error";

interface Props {
  refreshKey?: number;
}

function classify(report: DriftReport | null): Status {
  if (!report) return "loading";
  if (report.message?.toLowerCase().includes("no model")) return "no_model";
  if (report.drift_detected) {
    if (report.days_since_training !== undefined && report.days_since_training > 90) return "stale";
    return "drift";
  }
  return "fresh";
}

const STYLES: Record<Status, { color: string; icon: React.ReactNode; label: string }> = {
  loading:  { color: "default", icon: <ClockCircleOutlined spin />, label: "Vérification…" },
  no_model: { color: "orange",  icon: <ExclamationCircleOutlined />, label: "Mode heuristique" },
  fresh:    { color: "green",   icon: <CheckCircleOutlined />,       label: "Modèle à jour" },
  stale:    { color: "orange",  icon: <ClockCircleOutlined />,       label: "Modèle ancien" },
  drift:    { color: "red",     icon: <WarningOutlined />,           label: "Dérive détectée" },
  error:    { color: "default", icon: <ExclamationCircleOutlined />, label: "Statut indisponible" },
};

export default function ModelStatusBadge({ refreshKey = 0 }: Readonly<Props>) {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    AnalysePredictiveService.getDrift()
      .then((r) => { if (!cancelled) { setReport(r); setStatus(classify(r)); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [refreshKey]);

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
}

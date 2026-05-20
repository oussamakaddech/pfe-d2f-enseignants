import { Tag } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import { semantic, neutral } from "@/styles/themes/tokens";

type StatusType = "enregistre" | "planifie" | "en_cours" | "acheve" | "annule" | "approuve" | "en_attente" | "critique" | "haute" | "moyenne" | "basse";

const STATUS_CONFIG: Record<StatusType, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  enregistre: { color: neutral[600], bg: "#f9fafb", icon: <StopOutlined />, label: "Enregistré" },
  planifie: { color: semantic.info, bg: semantic.infoBg, icon: <ClockCircleOutlined />, label: "Planifié" },
  en_cours: { color: semantic.warning, bg: semantic.warningBg, icon: <PlayCircleOutlined />, label: "En cours" },
  acheve: { color: semantic.success, bg: semantic.successBg, icon: <CheckCircleOutlined />, label: "Achevé" },
  annule: { color: semantic.error, bg: semantic.errorBg, icon: <PauseCircleOutlined />, label: "Annulé" },
  approuve: { color: semantic.success, bg: semantic.successBg, icon: <CheckCircleOutlined />, label: "Approuvé" },
  en_attente: { color: semantic.warning, bg: semantic.warningBg, icon: <ClockCircleOutlined />, label: "En attente" },
  critique: { color: "#ef4444", bg: "#fef2f2", icon: <StopOutlined />, label: "Critique" },
  haute: { color: "#f59e0b", bg: "#fffbeb", icon: <ClockCircleOutlined />, label: "Haute" },
  moyenne: { color: "#3b82f6", bg: "#eff6ff", icon: <ClockCircleOutlined />, label: "Moyenne" },
  basse: { color: "#10b981", bg: "#ecfdf5", icon: <CheckCircleOutlined />, label: "Basse" },
};

interface D2FStatusPillProps {
  status: StatusType;
  customLabel?: string;
  size?: "small" | "default";
}

export default function D2FStatusPill({ status, customLabel, size = "default" }: D2FStatusPillProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return <Tag>{status}</Tag>;

  return (
    <Tag
      icon={config.icon}
      color={config.color}
      style={{
        borderRadius: 9999,
        border: "none",
        background: config.bg,
        fontWeight: 500,
        fontSize: size === "small" ? 11 : 12,
        padding: size === "small" ? "1px 8px" : "2px 12px",
      }}
    >
      {customLabel || config.label}
    </Tag>
  );
}





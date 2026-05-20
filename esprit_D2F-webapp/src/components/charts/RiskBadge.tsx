import { Tag } from "antd";
import type { NiveauRisque, NiveauUrgence } from "@/models/analyse";

const URGENCE_CONFIG: Record<NiveauUrgence, { color: string; label: string }> = {
  FAIBLE:  { color: "success", label: "Faible" },
  MODEREE: { color: "warning", label: "Modérée" },
  HAUTE:   { color: "orange",  label: "Haute" },
  CRITIQUE:{ color: "error",   label: "Critique" },
};

const RISQUE_CONFIG: Record<NiveauRisque, { color: string; label: string }> = {
  FAIBLE:  { color: "success", label: "Faible" },
  MODERE:  { color: "warning", label: "Modéré" },
  ELEVE:   { color: "orange",  label: "Élevé" },
  CRITIQUE:{ color: "error",   label: "Critique" },
};

interface RiskBadgeProps {
  type:  "urgence" | "risque";
  value: NiveauUrgence | NiveauRisque;
}

export default function RiskBadge({ type, value }: RiskBadgeProps) {
  const cfg = type === "urgence"
    ? URGENCE_CONFIG[value as NiveauUrgence]
    : RISQUE_CONFIG[value as NiveauRisque];

  if (!cfg) return <Tag>{value}</Tag>;
  return <Tag color={cfg.color} style={{ fontWeight: 600 }}>{cfg.label}</Tag>;
}





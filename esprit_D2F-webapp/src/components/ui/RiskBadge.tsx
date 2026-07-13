import type { ReactNode } from "react";
import { riskStyle } from "@/utils/risk";

interface RiskBadgeProps {
  /** Score de risque normalisé dans [0, 1]. */
  readonly score: number;
  /** Affiche le pourcentage à côté du libellé. */
  readonly showPercent?: boolean;
  readonly size?: "sm" | "md";
}

/**
 * Badge de risque unique et réutilisable.
 * Source de vérité visuelle partagée par toutes les pages (Analyse Prédictive,
 * Tableau de bord, centres d'action). Ne jamais afficher un second score
 * de risque côte à côte sans le relier explicitement à cette même échelle.
 */
export default function RiskBadge({ score, showPercent = true, size = "md" }: RiskBadgeProps) {
  const s = riskStyle(score);
  const pad = size === "sm" ? "1px 8px" : "2px 10px";
  const font = size === "sm" ? 11 : 12;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          background: s.bg,
          color: s.text,
          fontWeight: 700,
          borderRadius: 999,
          padding: pad,
          fontSize: font,
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
      {showPercent && (
        <span style={{ color: "#334155", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(score * 100)}%
        </span>
      )}
    </span>
  );
}

interface RiskLevelTagProps {
  readonly level: string | null | undefined;
  readonly children?: ReactNode;
}

/** Petit tag coloré à partir d'une clé de niveau déjà connue (ex: niveau_risque). */
export function RiskLevelTag({ level, children }: RiskLevelTagProps) {
  const key = (level ?? "FAIBLE") as keyof typeof import("@/utils/risk").RISK_LEVELS;
  const styles = {
    CRITIQUE: { color: "#ef4444", bg: "#fee2e2" },
    ELEVE: { color: "#f97316", bg: "#ffedd5" },
    MODERE: { color: "#b45309", bg: "#fef3c7" },
    FAIBLE: { color: "#059669", bg: "#d1fae5" },
  }[key] ?? { color: "#64748b", bg: "#f1f5f9" };
  return (
    <span
      style={{
        color: styles.color,
        background: styles.bg,
        borderColor: "transparent",
        fontWeight: 700,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}

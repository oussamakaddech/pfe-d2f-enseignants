/**
 * RiskBreakdownPanel — Affiche cote a cote Score metier + Signal ML.
 * Consomme UNIQUEMENT l'API ml-signal (aucun calcul local).
 *
 * Implementation en React.createElement pour eviter un bug esbuild
 * avec le JSX dans ce fichier precis.
 */
import React from "react";
import { Card, Tag, Tooltip, Progress, Space, Alert } from "antd";
import {
  CheckCircleOutlined, WarningOutlined, LineChartOutlined,
  BulbOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import D2FService from "@/services/analyse/D2FService";

const h = React.createElement;

function levelFromScore(s: number | null | undefined): string {
  if (s == null) return "FAIBLE";
  if (s >= 0.75) return "CRITIQUE";
  if (s >= 0.5) return "ELEVE";
  if (s >= 0.25) return "MODERE";
  return "FAIBLE";
}

const COLORS: Record<string, string> = {
  CRITIQUE: "#f5222d",
  ELEVE: "#fa8c16",
  MODERE: "#faad14",
  FAIBLE: "#52c41a",
};

interface ScoreCellProps {
  readonly label: string;
  readonly score: number | null;
  readonly level: string;
  readonly tooltip: string;
  readonly icon: React.ReactNode;
  readonly suffix?: string;
}
function ScoreCell(props: Readonly<ScoreCellProps>) {
  const color = COLORS[props.level];
  const display = props.score == null ? "-" : Number(props.score).toFixed(3);
  const pct = props.score == null ? 0 : Math.round(Number(props.score) * 100);
  return h("div", { style: { flex: 1, minWidth: 200 } },
    h(Card, { size: "small", style: { borderTop: "3px solid " + color } },
      h(Space, { direction: "vertical", style: { width: "100%" }, size: 6 },
        h("div", { style: { display: "flex", alignItems: "center", gap: 6, color: "#666" } },
          props.icon,
          h("span", { style: { fontSize: 13 } }, props.label),
          h(Tooltip, { title: props.tooltip },
            h(InfoCircleOutlined, { style: { fontSize: 11, opacity: 0.6 } })
          )
        ),
        h("div", { style: { display: "flex", alignItems: "baseline", gap: 8 } },
          h("span", { style: { fontSize: 26, fontWeight: 600, color } }, display),
          h(Tag, { color: color }, props.level)
        ),
        h(Progress, { percent: pct, strokeColor: color, showInfo: false, size: "small" }),
        props.suffix ? h("div", { style: { fontSize: 11, color: "#888" } }, props.suffix) : null
      )
    )
  );
}

interface MLUnavailableAlertProps {
  readonly reason: string | null;
  readonly fallbackMode: boolean;
}
function MLUnavailableAlert(props: Readonly<MLUnavailableAlertProps>) {
  return h(Alert, {
    type: "info",
    showIcon: true,
    message: "Signal ML indisponible : " + (props.reason || "unknown"),
    description: props.fallbackMode
      ? "Le dashboard repose uniquement sur le score metier (deterministe). Lancez un re-entrainement pour activer le signal ML."
      : undefined,
  });
}

interface ConvergenceAlertProps {
  readonly converged: boolean;
  readonly businessLevel: string;
  readonly mlLevel: string;
}
function ConvergenceAlert(props: Readonly<ConvergenceAlertProps>) {
  return h(Alert, {
    type: props.converged ? "success" : "warning",
    showIcon: true,
    icon: props.converged ? h(CheckCircleOutlined) : h(WarningOutlined),
    message: props.converged
      ? "Convergence metier / ML"
      : "Divergence : metier=" + props.businessLevel + " vs ML=" + props.mlLevel,
    description: props.converged
      ? "Les deux evaluations aboutissent au meme niveau."
      : "Le dashboard conserve le score metier (deterministe) comme source de verite.",
  });
}

interface TopFactorsCardProps {
  readonly factors: Array<{ feature: string; importance: number }>;
  readonly modelName: string;
}
function TopFactorsCard(props: Readonly<TopFactorsCardProps>) {
  return h(Card, { size: "small", title: "Top facteurs ML (" + props.modelName + ")" },
    h(Space, { direction: "vertical", style: { width: "100%" }, size: 4 },
      props.factors.slice(0, 5).map(function (f) {
        return h("div", {
          key: f.feature,
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
          },
        },
          h("span", null, f.feature),
          h("span", { style: { color: "#666" } },
            "importance " + (Number(f.importance) * 100).toFixed(1) + "%"
          )
        );
      })
    )
  );
}

function useTeacherProfile(teacherId: string) {
  return useQuery({
    queryKey: ["d2f", "teacher", teacherId],
    queryFn: () => D2FService.getTeacherProfile(teacherId),
    enabled: !!teacherId,
    staleTime: 60000,
  });
}

function useTeacherMLSignal(teacherId: string) {
  return useQuery({
    queryKey: ["d2f", "ml-signal", teacherId],
    queryFn: () => D2FService.getTeacherMLSignal(teacherId),
    enabled: !!teacherId,
    staleTime: 60000,
  });
}

interface RiskBreakdownPanelProps {
  readonly teacherId: string;
}
export function RiskBreakdownPanel(props: Readonly<RiskBreakdownPanelProps>) {
  const profileQ = useTeacherProfile(props.teacherId);
  const mlQ = useTeacherMLSignal(props.teacherId);

  if (profileQ.isLoading || mlQ.isLoading) {
    return h(Card, { loading: true, size: "small" });
  }
  if (profileQ.isError || !profileQ.data) {
    return h(Alert, {
      type: "error",
      message: "Impossible de charger le profil enseignant",
      showIcon: true,
    });
  }

  const businessScore = Number(profileQ.data.risk_profile.risk_score);
  const businessLevel = levelFromScore(businessScore);
  const ml = mlQ.data;
  const mlScore = ml?.available ? ml.predicted_gap_next_3m : null;
  const mlLevel = levelFromScore(mlScore);
  const converged = !!ml?.available && mlScore !== null && businessLevel === mlLevel;

  return h(Space, { direction: "vertical", style: { width: "100%" }, size: 12 },
    h("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" } },
      h(ScoreCell, {
        label: "Score metier",
        score: businessScore,
        level: businessLevel,
        tooltip: "Formule deterministe officielle (risk_engine.py). Source de verite du dashboard.",
        icon: h(LineChartOutlined),
        suffix: "Echelle [0, 1]",
      }),
      h(ScoreCell, {
        label: "Signal ML",
        score: mlScore,
        level: mlLevel,
        tooltip: ml?.available
          ? "Prediction ML via " + ml.model_name + ". Anticipe le gap a 3 mois."
          : "Signal ML indisponible. Voir la raison ci-dessous.",
        icon: h(BulbOutlined),
        suffix: ml?.available
          ? "Confiance : " + (ml.confidence || 0).toFixed(2) + " - Modele : " + ml.model_name
          : undefined,
      })
    ),
    ml?.available
      ? h(TopFactorsCard, { factors: ml.top_factors, modelName: ml.model_name })
      : h(MLUnavailableAlert, { reason: ml?.reason ?? null, fallbackMode: !!ml?.fallback_mode }),
    ml?.available ? h(ConvergenceAlert, { converged, businessLevel, mlLevel }) : null
  );
}

export default RiskBreakdownPanel;

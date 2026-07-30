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

function levelFromScore(s) {
  if (s == null) return "FAIBLE";
  if (s >= 0.75) return "CRITIQUE";
  if (s >= 0.5) return "ELEVE";
  if (s >= 0.25) return "MODERE";
  return "FAIBLE";
}

const COLORS = {
  CRITIQUE: "#f5222d",
  ELEVE: "#fa8c16",
  MODERE: "#faad14",
  FAIBLE: "#52c41a",
};

function ScoreCell(props) {
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

function useTeacherProfile(teacherId) {
  return useQuery({
    queryKey: ["d2f", "teacher", teacherId],
    queryFn: () => D2FService.getTeacherProfile(teacherId),
    enabled: !!teacherId,
    staleTime: 60000,
  });
}

function useTeacherMLSignal(teacherId) {
  return useQuery({
    queryKey: ["d2f", "ml-signal", teacherId],
    queryFn: () => D2FService.getTeacherMLSignal(teacherId),
    enabled: !!teacherId,
    staleTime: 60000,
  });
}

export function RiskBreakdownPanel(props) {
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
  const mlScore = ml && ml.available ? ml.predicted_gap_next_3m : null;
  const mlLevel = levelFromScore(mlScore);
  const converged = !!(ml && ml.available && mlScore !== null && businessLevel === mlLevel);

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
        tooltip: ml && ml.available
          ? "Prediction ML via " + ml.model_name + ". Anticipe le gap a 3 mois."
          : "Signal ML indisponible. Voir la raison ci-dessous.",
        icon: h(BulbOutlined),
        suffix: ml && ml.available
          ? "Confiance : " + (ml.confidence || 0).toFixed(2) + " - Modele : " + ml.model_name
          : undefined,
      })
    ),
    !(ml && ml.available) ? h(Alert, {
      type: "info",
      showIcon: true,
      message: "Signal ML indisponible : " + ((ml && ml.reason) || "unknown"),
      description: ml && ml.fallback_mode
        ? "Le dashboard repose uniquement sur le score metier (deterministe). Lancez un re-entrainement pour activer le signal ML."
        : undefined,
    }) : null,
    ml && ml.available && ml.top_factors && ml.top_factors.length > 0 ? h(Card, {
      size: "small",
      title: "Top facteurs ML (" + ml.model_name + ")",
    },
      h(Space, { direction: "vertical", style: { width: "100%" }, size: 4 },
        ml.top_factors.slice(0, 5).map(function (f, i) {
          return h("div", {
            key: i,
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
    ) : null,
    ml && ml.available ? h(Alert, {
      type: converged ? "success" : "warning",
      showIcon: true,
      icon: converged ? h(CheckCircleOutlined) : h(WarningOutlined),
      message: converged
        ? "Convergence metier / ML"
        : "Divergence : metier=" + businessLevel + " vs ML=" + mlLevel,
      description: converged
        ? "Les deux evaluations aboutissent au meme niveau."
        : "Le dashboard conserve le score metier (deterministe) comme source de verite.",
    }) : null
  );
}

export default RiskBreakdownPanel;

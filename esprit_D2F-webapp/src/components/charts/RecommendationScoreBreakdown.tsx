import { Fragment } from "react";
import { Tooltip, Typography } from "antd";
import type { Recommendation, RecoScoreFactors } from "@/models/analyse";

const { Text } = Typography;

interface BarRow {
  key:   string;
  label: string;
  value: number | null | undefined;
  color: string;
  hint:  string;
}

function rowsFor(r: Recommendation): BarRow[] {
  const f: RecoScoreFactors = r.facteurs_score ?? {};
  return [
    {
      key: "pertinence",
      label: "Pertinence",
      value: r.score_pertinence,
      color: "#3b82f6",
      hint: "Adéquation de la formation avec le gap détecté (S₁ MSAS).",
    },
    {
      key: "reussite",
      label: "Réussite",
      value: r.score_reussite,
      color: "#10b981",
      hint: "Taux de complétion historique × note d'évaluation.",
    },
    {
      key: "disponibilite",
      label: "Disponibilité",
      value: r.score_disponibilite,
      color: "#f59e0b",
      hint: "Ouverture des inscriptions et état de la formation.",
    },
    {
      key: "pairs",
      label: "Pairs",
      value: f.pairs ?? null,
      color: "#8b5cf6",
      hint: "Signal collaboratif : adoption par des enseignants proches.",
    },
  ];
}

export default function RecommendationScoreBreakdown({ recommendation }: { recommendation: Recommendation }) {
  const rows = rowsFor(recommendation);
  const confiance = recommendation.facteurs_score?.["confiance" as keyof RecoScoreFactors];

  return (
    <div style={{ marginTop: 4 }}>
      <Text type="secondary" style={{ fontSize: 11 }}>
        Scoring avancé (MSAS)
      </Text>
      {rows.map((row) => {
        const pct = Math.round((row.value ?? 0) * 100);
        return (
          <Fragment key={row.key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <Tooltip title={row.hint}>
                <Text style={{ fontSize: 11 }}>{row.label}</Text>
              </Tooltip>
              <Text style={{ fontSize: 11, fontWeight: 600 }}>{row.value == null ? "—" : `${pct}%`}</Text>
            </div>
            <div
              style={{
                height: 5,
                borderRadius: 3,
                background: "rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${row.value == null ? 0 : pct}%`,
                  height: "100%",
                  background: row.color,
                  borderRadius: 3,
                }}
              />
            </div>
          </Fragment>
        );
      })}
      {confiance != null && (
        <Text type="secondary" style={{ fontSize: 10, display: "block", marginTop: 4 }}>
          Confiance du score : {Math.round(Number(confiance) * 100)}%
        </Text>
      )}
    </div>
  );
}

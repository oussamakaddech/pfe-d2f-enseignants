import { memo } from "react";
import { Skeleton, Tooltip } from "antd";
import {
  TeamOutlined, FireOutlined, FallOutlined, BellOutlined,
  SafetyCertificateOutlined, ExperimentOutlined, InfoCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
} from "@ant-design/icons";
import type { OverviewKpis, OverviewDeltas } from "@/models/analyse";

type TileKey = keyof OverviewDeltas;

interface TileDef {
  readonly key: TileKey;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly higherBetter: boolean;
  readonly fmt: (v: number) => string;
  readonly fmtDelta?: (d: number) => string;
  readonly hint: string;
}

const TILES: readonly TileDef[] = [
  { key: "nb_enseignants_suivis", label: "Enseignants suivis", icon: <TeamOutlined />, higherBetter: true, fmt: (v) => String(Math.round(v)), hint: "Nombre d'enseignants actuellement monitorés par le modèle prédictif." },
  { key: "score_risque_moyen", label: "Risque moyen", icon: <FireOutlined />, higherBetter: false, fmt: (v) => `${Math.round(v * 100)}%`, fmtDelta: (d) => `${Math.abs(d * 100).toFixed(0)} pts`, hint: "Score d'attrition moyen de tous les enseignants suivis (0 = aucun risque, 100 = risque maximal)." },
  { key: "nb_gaps_critiques", label: "Gaps critiques", icon: <FallOutlined />, higherBetter: false, fmt: (v) => String(Math.round(v)), hint: "Écarts de compétence les plus graves nécessitant une action prioritaire." },
  { key: "nb_alertes_nouvelles", label: "Alertes nouvelles", icon: <BellOutlined />, higherBetter: false, fmt: (v) => String(Math.round(v)), hint: "Alertes générées par le modèle et non encore traitées." },
  { key: "taux_couverture_global", label: "Couverture", icon: <SafetyCertificateOutlined />, higherBetter: true, fmt: (v) => `${v.toFixed(0)}%`, fmtDelta: (d) => `${Math.abs(d).toFixed(1)} pts`, hint: "Pourcentage de compétences dont le niveau actuel atteint le niveau requis." },
  { key: "precision_modele", label: "Précision modèle (R²)", icon: <ExperimentOutlined />, higherBetter: true, fmt: (v) => v.toFixed(2), hint: "Qualité du modèle de prédiction des gaps (R² entre 0 et 1, plus c'est élevé mieux c'est)." },
];

function DeltaChip({ delta, higherBetter, fmtDelta }: { readonly delta: number | null; readonly higherBetter: boolean; readonly fmtDelta?: (d: number) => string }) {
  if (delta == null) {
    return <span className="analyse-kpi-delta flat"><MinusOutlined /> stable</span>;
  }
  if (Math.abs(delta) < 1e-9) {
    return <span className="analyse-kpi-delta flat"><MinusOutlined /> 0</span>;
  }
  const isUp = delta > 0;
  const isGood = isUp === higherBetter;
  const label = fmtDelta ? fmtDelta(delta) : String(Math.abs(Math.round(delta)));
  return (
    <span className={`analyse-kpi-delta ${isGood ? "up" : "down"}`}>
      {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {label}
    </span>
  );
}

interface OverviewKpiTilesProps {
  readonly data?: OverviewKpis;
  readonly loading?: boolean;
}

/** Bandeau de tuiles KPI avec variation (deltas) vs la période précédente. */
const OverviewKpiTiles = memo(function OverviewKpiTiles({ data, loading }: OverviewKpiTilesProps) {
  if (loading && !data) {
    return (
      <div className="analyse-kpi-grid">
        {TILES.map((t) => (
          <div key={t.key} className="analyse-kpi-tile">
            <Skeleton active paragraph={{ rows: 1, width: "60%" }} title={{ width: "40%" }} />
          </div>
        ))}
      </div>
    );
  }

  const updatedAt = data?.generated_at
    ? new Date(data.generated_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div>
      <div className="analyse-kpi-grid">
        {TILES.map((t) => {
          const raw = data ? data[t.key] : null;
          const value = raw == null ? "—" : t.fmt(raw);
          const delta = data?.deltas?.[t.key] ?? null;
          return (
            <div key={t.key} className="analyse-kpi-tile">
              <div className="analyse-kpi-head">
                <Tooltip title={t.hint} placement="top">
                  <span className="analyse-kpi-info"><InfoCircleOutlined /> {t.label}</span>
                </Tooltip>
              </div>
              <div className="analyse-kpi-value">{value}</div>
              <DeltaChip delta={delta} higherBetter={t.higherBetter} fmtDelta={t.fmtDelta} />
            </div>
          );
        })}
      </div>
      {updatedAt && (
        <div className="analyse-kpi-updated">
          <InfoCircleOutlined /> Mis à jour le {updatedAt}
        </div>
      )}
    </div>
  );
});

export default OverviewKpiTiles;

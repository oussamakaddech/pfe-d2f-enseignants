import { memo } from "react";
import { Tag, Progress } from "antd";
import { FallOutlined, RiseOutlined, WarningOutlined } from "@ant-design/icons";
import type {
  DecliningCompetency,
  InDemandCompetency,
  TeacherRiskIndicator,
} from "@/models/analyse";

interface Props {
  declining: DecliningCompetency[];
  inDemand: InDemandCompetency[];
  riskIndicators: TeacherRiskIndicator[];
  riskThreshold: number;
}

const DashboardKpis = memo(function DashboardKpis({
  declining,
  inDemand,
  riskIndicators,
  riskThreshold,
}: Readonly<Props>) {
  const atRiskCount = riskIndicators.filter((r) => r.attrition_risk_score >= riskThreshold).length;
  const riskPct = riskIndicators.length
    ? Math.round((atRiskCount / riskIndicators.length) * 100)
    : 0;

  return (
    <div className="analyse-kpi-grid" style={{ marginBottom: 24 }}>
      {/* Compétences en Déclin */}
      <div className="analyse-kpi-tile accent-red">
        <div className="analyse-kpi-head">
          <FallOutlined /> Compétences en Déclin
        </div>
        <div className="analyse-kpi-value">{declining.length}</div>
        <div className="analyse-kpi-foot">
          {declining.length === 0 ? (
            <span className="analyse-kpi-delta flat">Aucune</span>
          ) : (
            declining.slice(0, 4).map((c) => (
              <Tag key={c.competency_name} color="red" style={{ marginBottom: 4 }}>
                {c.competency_name}
              </Tag>
            ))
          )}
        </div>
      </div>

      {/* En Forte Demande */}
      <div className="analyse-kpi-tile accent-green">
        <div className="analyse-kpi-head">
          <RiseOutlined /> En Forte Demande
        </div>
        <div className="analyse-kpi-value">{inDemand.length}</div>
        <div className="analyse-kpi-foot">
          {inDemand.slice(0, 4).map((c) => (
            <Tag key={c.competency_name} color="green" style={{ marginBottom: 4 }}>
              {c.competency_name}
            </Tag>
          ))}
        </div>
      </div>

      {/* Enseignants à Risque */}
      <div className="analyse-kpi-tile accent-amber">
        <div className="analyse-kpi-head">
          <WarningOutlined /> Enseignants à Risque
        </div>
        <div className="analyse-kpi-value">
          {atRiskCount}
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-400)", marginLeft: 6 }}>
            / {riskIndicators.length}
          </span>
        </div>
        <div className="analyse-kpi-foot">
          <Progress percent={riskPct} strokeColor="#f59e0b" size="small" />
        </div>
      </div>
    </div>
  );
});

export default DashboardKpis;

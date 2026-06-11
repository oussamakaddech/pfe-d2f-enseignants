import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Skeleton, Tag } from "antd";
import {
  ThunderboltOutlined, WarningOutlined, FallOutlined,
  BulbOutlined, ApartmentOutlined, RightOutlined,
} from "@ant-design/icons";
import DemandForecastChart from "@/components/charts/DemandForecastChart";
import { useDemandForecast, useDecliningCompetencies, useTeacherRiskIndicators } from "@/hooks/analyse/useAnalysePredictive";
import { useGlobalDashboard } from "@/hooks/dashboard/useDashboardData";
import type { TeacherRiskIndicator } from "@/models/analyse";
import type { DashboardScope } from "@/models/dashboard";

interface InsightRowProps {
  readonly icon: React.ReactNode;
  readonly tone: "danger" | "warning" | "info" | "success";
  readonly title: string;
  readonly value: string;
  readonly onClick?: () => void;
}

function InsightRow({ icon, tone, title, value, onClick }: InsightRowProps) {
  return (
    <button type="button" className={`dash-insight dash-insight-${tone}`} onClick={onClick} disabled={!onClick}>
      <span className="dash-insight-icon">{icon}</span>
      <span className="dash-insight-title">{title}</span>
      <span className="dash-insight-value">{value}{onClick && <RightOutlined />}</span>
    </button>
  );
}

const DashboardPredictiveInsights = memo(function DashboardPredictiveInsights({ scope }: { readonly scope: DashboardScope }) {
  const navigate = useNavigate();
  const forecast = useDemandForecast(6);
  const declining = useDecliningCompetencies();
  const risks = useTeacherRiskIndicators();
  const global = useGlobalDashboard(scope.isAdmin);

  const riskList = (risks.data ?? []) as TeacherRiskIndicator[];
  const topAtRisk = riskList
    .filter((r) => r.attrition_risk_score >= 0.5)
    .sort((a, b) => b.attrition_risk_score - a.attrition_risk_score)
    .slice(0, 3);
  const topDeclining = (declining.data ?? []).slice(0, 3);
  const reco = (global.data?.top_formations_recommandees ?? []).slice(0, 3);
  const lowCoverageDepts = (global.data?.taux_couverture_departements ?? []).filter((d) => d.taux_couverture < 50);

  return (
    <section className="dash-predictive">
      <div className="dash-predictive-head">
        <span className="dash-predictive-icon"><ThunderboltOutlined /></span>
        <div>
          <h3 className="dash-predictive-title">Intelligence prédictive</h3>
          <span className="dash-predictive-sub">Anticiper les risques et la demande de formation</span>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <div className="dash-predictive-chart">
            <div className="dash-predictive-chart-title">Prévision de la demande de formation</div>
            {forecast.isLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : <DemandForecastChart data={forecast.data} height={240} />}
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <div className="dash-insight-list">
            {scope.isAdmin && topAtRisk.map((r) => (
              <InsightRow
                key={r.teacher_id}
                icon={<WarningOutlined />}
                tone="danger"
                title={`À risque — ${r.teacher_name || r.teacher_id}`}
                value={`${Math.round(r.attrition_risk_score * 100)}%`}
                onClick={() => navigate(`/home/analytics/teacher/${r.teacher_id}`)}
              />
            ))}
            {topDeclining.map((c) => (
              <InsightRow key={`d-${c.competency_id}`} icon={<FallOutlined />} tone="warning" title={`Déclin — ${c.competency_name}`} value={`${(c.demand_3m ?? 0)} / 3m`} />
            ))}
            {reco.map((f) => (
              <InsightRow key={`r-${f.formation_id}`} icon={<BulbOutlined />} tone="success" title={`À lancer — ${f.formation_titre}`} value={`${f.nb_recommandations}×`} onClick={() => navigate("/home/Formation")} />
            ))}
            {scope.isAdmin && lowCoverageDepts.map((d) => (
              <InsightRow key={`c-${d.departement}`} icon={<ApartmentOutlined />} tone="info" title={`Intervenir — ${d.departement}`} value={`${d.taux_couverture}%`} onClick={() => navigate("/home/analytics/dashboard")} />
            ))}
            {!scope.isAdmin && topAtRisk.length === 0 && topDeclining.length === 0 && (
              <Tag>Tendances plateforme indisponibles à votre périmètre</Tag>
            )}
          </div>
        </Col>
      </Row>
    </section>
  );
});

export default DashboardPredictiveInsights;

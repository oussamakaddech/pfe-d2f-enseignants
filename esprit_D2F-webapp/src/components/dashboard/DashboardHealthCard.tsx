import { memo } from "react";
import { Progress, Skeleton } from "antd";
import { HeartOutlined } from "@ant-design/icons";
import { InfoCard } from "@/components/ui";
import { useGlobalParticipantKPI } from "@/hooks/kpi";
import { useOverview } from "@/hooks/analyse/useAnalysePredictive";
import { useBesoins } from "@/hooks/besoin/useBesoins";
import { useGlobalDashboard, useParticipationByUp, useInactifs } from "@/hooks/dashboard/useDashboardData";
import { computeHealthScore, isPendingBesoin } from "@/services/dashboard/dashboardService";
import type { GlobalParticipantKPI } from "@/models/analyse/kpi";
import type { AnalyticsUP } from "@/models/analyse/reporting";
import type { DashboardScope, HealthLevel } from "@/models/dashboard";

const LEVEL_COLOR: Record<HealthLevel, string> = {
  healthy: "#10b981",
  attention: "#f59e0b",
  critical: "#ef4444",
};
const LEVEL_LABEL: Record<HealthLevel, string> = {
  healthy: "Plateforme saine",
  attention: "Points d'attention",
  critical: "Situation critique",
};

const DashboardHealthCard = memo(function DashboardHealthCard({ scope }: { readonly scope: DashboardScope }) {
  const isAdmin = scope.isAdmin;
  const presenceQ = useGlobalParticipantKPI(scope.start, scope.end);
  const overview = useOverview();
  const besoins = useBesoins(isAdmin);
  const global = useGlobalDashboard(isAdmin);
  const upQ = useParticipationByUp(!isAdmin);
  const inactifs = useInactifs(!isAdmin);

  const loading = isAdmin
    ? presenceQ.isLoading || overview.isLoading || global.isLoading
    : upQ.isLoading || inactifs.isLoading;

  const ups = (upQ.data?.items ?? []) as AnalyticsUP[];
  const avg = (sel: (u: AnalyticsUP) => number) => (ups.length ? ups.reduce((s, u) => s + (sel(u) || 0), 0) / ups.length : undefined);

  const health = isAdmin
    ? computeHealthScore({
        presence: (presenceQ.data as GlobalParticipantKPI | undefined)?.tauxPresenceGlobal,
        coverage: overview.data?.taux_couverture_global,
        atRisk: global.data?.enseignants_a_risque?.length,
        totalTeachers: overview.data?.nb_enseignants_suivis,
        pendingNeeds: (besoins.data ?? []).filter(isPendingBesoin).length,
      })
    : computeHealthScore({
        participation: avg((u) => u.tauxParticipation),
        atRisk: inactifs.data?.total,
        totalTeachers: ups.reduce((s, u) => s + (u.nombreEnseignants || 0), 0),
      });

  return (
    <InfoCard title="Santé de la plateforme" icon={<HeartOutlined />}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : (
        <div className="dash-health">
          <div className="dash-health-gauge">
            <Progress
              type="dashboard"
              percent={health.score}
              strokeColor={LEVEL_COLOR[health.level]}
              format={(p) => <span className="dash-health-score">{p}<small>/100</small></span>}
              size={140}
            />
            <div className="dash-health-level" style={{ color: LEVEL_COLOR[health.level] }}>
              {LEVEL_LABEL[health.level]}
            </div>
          </div>
          <div className="dash-health-factors">
            {health.factors.map((f) => (
              <div key={f.key} className="dash-health-factor">
                <div className="dash-health-factor-head">
                  <span>{f.label}</span>
                  <b>{Math.round(f.score)}</b>
                </div>
                <Progress
                  percent={Math.round(f.score)}
                  showInfo={false}
                  size="small"
                  strokeColor={f.score >= 75 ? "#10b981" : f.score >= 50 ? "#f59e0b" : "#ef4444"}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </InfoCard>
  );
});

export default DashboardHealthCard;

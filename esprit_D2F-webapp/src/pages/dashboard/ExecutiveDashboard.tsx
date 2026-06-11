import { useState, useMemo, useCallback } from "react";
import { Row, Col, Collapse } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import FormationsByTypeFiltered from "@/pages/kpiFormation/FormationsByTypeFiltered";
import MetricCards from "@/pages/kpiFormation/MetricCards";
import FormationProgressBars from "@/pages/kpiFormation/FormationProgressBars";
import DonutByTrainerType from "@/pages/kpiFormation/DonutByTrainerType";
import TopParticipants from "@/pages/kpiFormation/TopParticipants";
import TopAbsentees from "@/pages/kpiFormation/TopAbsentees";
import NonAffectedList from "@/pages/kpiFormation/NonAffectedList";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardKpiGrid from "@/components/dashboard/DashboardKpiGrid";
import DashboardHealthCard from "@/components/dashboard/DashboardHealthCard";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import DashboardTimelineChart from "@/components/dashboard/DashboardTimelineChart";
import DashboardStatusChart from "@/components/dashboard/DashboardStatusChart";
import DashboardParticipationChart from "@/components/dashboard/DashboardParticipationChart";
import DashboardUpcomingFormations from "@/components/dashboard/DashboardUpcomingFormations";
import DashboardPendingNeeds from "@/components/dashboard/DashboardPendingNeeds";
import DashboardTopCompetencies from "@/components/dashboard/DashboardTopCompetencies";
import DashboardPredictiveInsights from "@/components/dashboard/DashboardPredictiveInsights";
import DashboardRecentActivity from "@/components/dashboard/DashboardRecentActivity";
import { useAnalyticsExport } from "@/hooks/analyse/useReporting";
import { rangeToDates } from "./dashboardRanges";
import type { DashboardRangeKey, DashboardScope } from "@/models/dashboard";
import "@/styles/pages/dashboard-page.css";

const INVALIDATE_KEYS = [["dashboard"], ["kpi"], ["analyse"], ["analytics"], ["besoins"], ["formations"]];

interface ExecutiveDashboardProps {
  readonly role: string; // "admin" | "cup"
}

export default function ExecutiveDashboard({ role }: ExecutiveDashboardProps) {
  const qc = useQueryClient();
  const { exporting, exportExcel } = useAnalyticsExport();
  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>("12m");
  const [refreshing, setRefreshing] = useState(false);

  const scope = useMemo<DashboardScope>(() => {
    const { start, end } = rangeToDates(rangeKey);
    const isAdmin = role === "admin";
    return {
      role, isAdmin, isCup: !isAdmin,
      isEnseignant: false, isAnimateur: false,
      start, end, rangeKey,
    };
  }, [role, rangeKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all(INVALIDATE_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
    setRefreshing(false);
  }, [qc]);

  const onExport = useCallback(() => {
    exportExcel(scope.isAdmin ? "PAR_DEPT" : "PAR_UP");
  }, [exportExcel, scope.isAdmin]);

  return (
    <div className="dash-container">
      <DashboardHeader
        scope={scope}
        onRangeChange={setRangeKey}
        onRefresh={onRefresh}
        onExport={onExport}
        refreshing={refreshing}
        exporting={exporting}
      />

      <DashboardKpiGrid scope={scope} />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={9}><DashboardHealthCard scope={scope} /></Col>
        <Col xs={24} lg={15}><DashboardAlerts scope={scope} /></Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}><DashboardTimelineChart scope={scope} /></Col>
        <Col xs={24} lg={10}><DashboardStatusChart scope={scope} /></Col>
      </Row>

      <DashboardParticipationChart scope={scope} />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={8}><DashboardUpcomingFormations /></Col>
        <Col xs={24} lg={8}><DashboardPendingNeeds scope={scope} /></Col>
        <Col xs={24} lg={8}><DashboardTopCompetencies /></Col>
      </Row>

      <DashboardPredictiveInsights scope={scope} />

      <DashboardRecentActivity scope={scope} />

      <Collapse
        ghost
        items={[{
          key: "kpi-detail",
          label: (
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--neutral-800)", display: "flex", alignItems: "center", gap: 8 }}>
              <BarChartOutlined style={{ color: "#b51200" }} /> KPI & Métriques — détail formation & formateurs
            </span>
          ),
          children: (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <FormationsByTypeFiltered />
              <MetricCards />
              <FormationProgressBars />
              <DonutByTrainerType />
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}><TopParticipants /></Col>
                <Col xs={24} lg={12}><TopAbsentees /></Col>
              </Row>
              <NonAffectedList />
            </div>
          ),
        }]}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)" }}
      />
    </div>
  );
}

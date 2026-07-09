import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Segmented, Button, Space, Tooltip } from "antd";
import {
  ReloadOutlined, DownloadOutlined, BookOutlined, LineChartOutlined,
} from "@ant-design/icons";
import { RANGE_PRESETS } from "@/pages/dashboard/dashboardRanges";
import type { DashboardRangeKey, DashboardScope } from "@/models/dashboard";

const SUBTITLE: Record<string, string> = {
  admin: "Vue globale de la plateforme D2F",
  cup: "Vue de suivi de votre département / UP",
  enseignant: "Vue personnalisée de votre développement",
  animateur: "Vue de vos formations et participations",
};

interface DashboardHeaderProps {
  readonly scope: DashboardScope;
  readonly onRangeChange: (key: DashboardRangeKey) => void;
  readonly onRefresh: () => void;
  readonly onExport?: () => void;
  readonly refreshing?: boolean;
  readonly exporting?: boolean;
}

const DashboardHeader = memo(function DashboardHeader({
  scope, onRangeChange, onRefresh, onExport, refreshing, exporting,
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="dash-header">
      <div className="dash-header-titles">
        <h1 className="dash-header-title">Tableau de bord</h1>
        <span className="dash-header-subtitle">{SUBTITLE[scope.role] ?? SUBTITLE.admin}</span>
      </div>

      <div className="dash-header-controls">
        <Segmented
          options={RANGE_PRESETS.map((p) => ({ label: p.label, value: p.key }))}
          value={scope.rangeKey === "custom" ? "annee" : scope.rangeKey}
          onChange={(v) => onRangeChange(v)}
        />
        <Space size={8}>
          <Tooltip title="Rafraîchir les données">
            <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={refreshing} />
          </Tooltip>
          {onExport && (
            <Tooltip title="Exporter le rapport (Excel)">
              <Button icon={<DownloadOutlined />} onClick={onExport} loading={exporting} />
            </Tooltip>
          )}
          <Tooltip title="Formations">
            <Button icon={<BookOutlined />} onClick={() => navigate("/home/Formation")} />
          </Tooltip>
          <Button type="primary" icon={<LineChartOutlined />} onClick={() => navigate("/home/AnalysePredictive")}>
            Analytique
          </Button>
        </Space>
      </div>
    </header>
  );
});

export default DashboardHeader;

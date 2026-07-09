import { useState, useMemo, useCallback, type ReactNode, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { Row, Col, Segmented, Button, Space, Tooltip, Tag } from "antd";
import {
  ReloadOutlined, DownloadOutlined, BookOutlined, LineChartOutlined,
  DashboardOutlined, HeartOutlined,
  StarOutlined, HistoryOutlined, BarChartOutlined,
  CalendarOutlined, FileTextOutlined, BulbOutlined,
  SafetyCertificateOutlined, FormOutlined, RiseOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAnalyticsExport } from "@/hooks/analyse/useReporting";
import { rangeToDates, RANGE_PRESETS } from "./dashboardRanges";
import type { DashboardRangeKey, DashboardScope } from "@/models/dashboard";
import { roleColors, brand, accent } from "@/styles/themes/tokens";
import "@/styles/pages/dashboard-page.css";

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
import DashboardFormationTypes from "@/components/dashboard/DashboardFormationTypes";
import DashboardTrainerTypes from "@/components/dashboard/DashboardTrainerTypes";
import DashboardTopPresences from "@/components/dashboard/DashboardTopPresences";
import DashboardTopAbsences from "@/components/dashboard/DashboardTopAbsences";
import DashboardNonAffected from "@/components/dashboard/DashboardNonAffected";

dayjs.locale("fr");

const INVALIDATE_KEYS = [["dashboard"], ["kpi"], ["analyse"], ["analytics"], ["besoins"], ["formations"]];

interface ExecutiveDashboardProps {
  readonly role: string;
}

function greeting(): { text: string; emoji: string } {
  const h = dayjs().hour();
  if (h < 12) return { text: "Bonjour", emoji: "🌅" };
  if (h < 18) return { text: "Bon après-midi", emoji: "☀️" };
  return { text: "Bonsoir", emoji: "🌙" };
}

interface QuickLink {
  readonly label: string;
  readonly to: string;
  readonly icon: ReactNode;
  readonly color: string;
  readonly roles: string[];
}

const QUICK_LINKS: readonly QuickLink[] = [
  { label: "Formations", to: "/home/Formation", icon: <BookOutlined />, color: brand[500], roles: ["admin", "cup", "chef"] },
  { label: "Besoins", to: "/home/besoins", icon: <BulbOutlined />, color: "#f59e0b", roles: ["admin", "cup", "chef", "enseignant", "animateur"] },
  { label: "Compétences", to: "/home/competences", icon: <SafetyCertificateOutlined />, color: "#8b5cf6", roles: ["admin", "cup", "chef"] },
  { label: "Calendrier", to: "/home/Calendrier", icon: <CalendarOutlined />, color: "#00b4d8", roles: ["admin", "cup", "chef"] },
  { label: "Analytique", to: "/home/analytics/dashboard", icon: <LineChartOutlined />, color: "#10b981", roles: ["admin", "cup", "chef"] },
  { label: "Inscriptions", to: "/home/Inscriptions", icon: <FormOutlined />, color: "#3b82f6", roles: ["admin", "cup", "chef", "enseignant", "animateur"] },
  { label: "Certificats", to: "/home/certificate", icon: <FileTextOutlined />, color: "#ef4444", roles: ["admin", "cup"] },
  { label: "Évaluations", to: "/home/Evaluations", icon: <StarOutlined />, color: "#ec4899", roles: ["admin", "cup", "chef", "enseignant", "animateur"] },
];

function SectionHeader({
  icon, title, subtitle, action, index,
}: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode; index?: number }) {
  return (
    <div className="dash-section-head" style={index != null ? { animationDelay: `${index * 60}ms` } as CSSProperties : undefined}>
      <span className="dash-section-head-icon">{icon}</span>
      <div className="dash-section-head-text">
        <div className="dash-section-head-title">{title}</div>
        {subtitle && <div className="dash-section-head-sub">{subtitle}</div>}
      </div>
      <span className="dash-section-head-line" />
      {action && <span className="dash-section-head-action">{action}</span>}
    </div>
  );
}

export default function ExecutiveDashboard({ role }: ExecutiveDashboardProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
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

  const navigate = useNavigate();
  const greet = greeting();
  const roleKey = String(user?.role ?? role).toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");
  const roleStyle = roleColors[roleKey] ?? roleColors[role] ?? { color: brand[500], bg: brand[50], label: "Utilisateur" };
  const displayName = user?.username ?? user?.email ?? "Utilisateur";
  const todayLabel = dayjs().format("dddd D MMMM YYYY");
  const visibleLinks = QUICK_LINKS.filter((l) => l.roles.includes(roleKey) || l.roles.includes(role));

  return (
    <div className="dash-container">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="dash-hero" style={{ "--hero-accent": brand[500], "--hero-accent2": accent[500] } as CSSProperties}>
        <div className="dash-hero-bg" aria-hidden="true" />
        <div className="dash-hero-content">
          <div className="dash-hero-left">
            <div className="dash-hero-eyebrow">
              <ThunderboltOutlined /> Plateforme D2F
              <Tag className="dash-hero-role" style={{ color: roleStyle.color, background: roleStyle.bg, borderColor: "transparent" }}>
                {roleStyle.label}
              </Tag>
            </div>
            <h1 className="dash-hero-title">
              {greet.emoji} {greet.text}, {displayName}
            </h1>
            <p className="dash-hero-sub">{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p>

            <div className="dash-hero-controls">
              <Segmented
                className="dash-hero-segment"
                options={RANGE_PRESETS.map((p) => ({ label: p.label, value: p.key }))}
                value={rangeKey === "custom" ? "annee" : rangeKey}
                onChange={(v) => setRangeKey(v as DashboardRangeKey)}
              />
              <Space size={8}>
                <Tooltip title="Rafraîchir les données">
                  <Button className="dash-hero-btn" icon={<ReloadOutlined />} onClick={onRefresh} loading={refreshing} />
                </Tooltip>
                <Tooltip title="Exporter le rapport (Excel)">
                  <Button className="dash-hero-btn" icon={<DownloadOutlined />} onClick={onExport} loading={exporting} />
                </Tooltip>
                <Tooltip title="Formations">
                  <Button className="dash-hero-btn" icon={<BookOutlined />} onClick={() => navigate("/home/Formation")} />
                </Tooltip>
                <Button type="primary" className="dash-hero-cta" icon={<LineChartOutlined />} onClick={() => navigate("/home/analytics/dashboard")}>
                  Analytique
                </Button>
              </Space>
            </div>
          </div>

          <div className="dash-hero-quick">
            {visibleLinks.map((l) => (
              <button
                key={l.label}
                type="button"
                className="dash-quick-tile"
                style={{ "--tile-color": l.color } as CSSProperties}
                onClick={() => navigate(l.to)}
              >
                <span className="dash-quick-tile-icon">{l.icon}</span>
                <span className="dash-quick-tile-label">{l.label}</span>
                <span className="dash-quick-tile-arrow"><RiseOutlined /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="dash-section dash-anim">
        <SectionHeader icon={<DashboardOutlined />} title="Vue d'ensemble opérationnelle" subtitle="Indicateurs clés de la période sélectionnée" />
        <DashboardKpiGrid scope={scope} />
      </section>

      <section className="dash-section dash-anim">
        <SectionHeader icon={<HeartOutlined />} title="Santé & alertes" subtitle="Pulsation de la plateforme en un coup d'œil" />
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={9}><DashboardHealthCard scope={scope} /></Col>
          <Col xs={24} lg={15}><DashboardAlerts scope={scope} /></Col>
        </Row>
      </section>

      <section className="dash-section dash-anim">
        <SectionHeader icon={<LineChartOutlined />} title="Tendances & participation" subtitle="Évolution et répartition sur la période" />
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={14}><DashboardTimelineChart scope={scope} /></Col>
          <Col xs={24} lg={10}><DashboardStatusChart scope={scope} /></Col>
        </Row>
        <div style={{ marginTop: 20 }}>
          <DashboardParticipationChart scope={scope} />
        </div>
      </section>

      <section className="dash-section dash-anim">
        <SectionHeader icon={<StarOutlined />} title="Repères du période" subtitle="À ne pas manquer" />
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={8}><DashboardUpcomingFormations /></Col>
          <Col xs={24} lg={8}><DashboardPendingNeeds scope={scope} /></Col>
          <Col xs={24} lg={8}><DashboardTopCompetencies /></Col>
        </Row>
      </section>

      <section className="dash-section dash-anim">
        <DashboardPredictiveInsights scope={scope} />
      </section>

      <section className="dash-section dash-anim">
        <SectionHeader icon={<HistoryOutlined />} title="Activité récente" />
        <DashboardRecentActivity scope={scope} />
      </section>

      {/* ── KPI & Métriques détail — même design que le reste du dashboard ── */}
      <section className="dash-section dash-anim">
        <div className="dash-detail-card">
          <div className="dash-detail-head">
            <span className="dash-detail-head-icon"><BarChartOutlined /></span>
            <div>
              <div className="dash-detail-head-title">KPI & Métriques — détail formation & formateurs</div>
              <div className="dash-detail-head-sub">Vue approfondie par typologie et par formateur</div>
            </div>
          </div>
          <div className="dash-detail-body">
            <DashboardFormationTypes scope={scope} />
            <Row gutter={[20, 20]}>
              <Col xs={24} lg={12}><DashboardTrainerTypes scope={scope} /></Col>
              <Col xs={24} lg={12}><DashboardTopPresences scope={scope} /></Col>
            </Row>
            <Row gutter={[20, 20]}>
              <Col xs={24} lg={12}><DashboardTopAbsences scope={scope} /></Col>
              <Col xs={24} lg={12}><DashboardNonAffected scope={scope} /></Col>
            </Row>
          </div>
        </div>
      </section>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { Doughnut, Radar } from "react-chartjs-2";
import { DatePicker, Divider, Tabs, Typography, Row, Col, Skeleton } from "antd";
import {
  BarChartOutlined,
  TeamOutlined,
  PieChartOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useFormationsByEtat, useGlobalParticipantKPI } from "@/hooks/kpi";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/kpichart.css";
import { neutral, brand, shadow, radius } from "@/styles/themes/tokens";

import FormationProgressBars  from "./FormationProgressBars";
import TopParticipants        from "./TopParticipants";
import TopAbsentees           from "./TopAbsentees";
import NonAffectedList        from "./NonAffectedList";
import MetricCards            from "./MetricCards";
import FormationsByTypeFiltered from "./FormationsByTypeFiltered";
import DonutByTrainerType     from "./DonutByTrainerType";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// ── Styles réutilisables ──────────────────────────────────────────────────────
const chartCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: radius.lg,
  border: `1px solid rgba(0,0,0,0.07)`,
  boxShadow: shadow.sm,
  padding: "20px 22px",
  display: "flex",
  flexDirection: "column",
};

const sectionTitle = (iconColor: string = brand[500]): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
  color: neutral[900],
  fontSize: 15,
  fontWeight: 600,
});

// ── Composant ────────────────────────────────────────────────────────────────
export default function KPIChart() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [start, setStart]         = useState("2025-01-01");
  const [end, setEnd]             = useState("2025-12-31");

  const enabled = activeTab === "dashboard";
  const { data: formationsByEtatRaw, isLoading: loadingEtat } =
    useFormationsByEtat(enabled ? start : "", enabled ? end : "");
  const { data: globalKpiRaw, isLoading: loadingGlobal } =
    useGlobalParticipantKPI(enabled ? start : "", enabled ? end : "");

  const loading = loadingEtat || loadingGlobal;

  const formationsByEtat = (formationsByEtatRaw ?? {}) as Record<string, number>;

  const globalKpiData = useMemo(() => {
    const g = globalKpiRaw as { nombreParticipantsTotal?: number; nombreParticipantsPresent?: number; tauxParticipation?: number } | undefined;
    return { total: g?.nombreParticipantsTotal ?? 0, presents: g?.nombreParticipantsPresent ?? 0, taux: g?.tauxParticipation ?? 0 };
  }, [globalKpiRaw]);

  const tabItems = [
    {
      key: "dashboard",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BarChartOutlined /> Tableau de bord
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <AppPageHeader
        icon={<BarChartOutlined />}
        title="KPI & Métriques"
        subtitle="Indicateurs de performance des formations et des participants"
      />

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 24 }}
        tabBarStyle={{ marginBottom: 0 }}
      />

      {activeTab === "dashboard" ? (
        <>
          {/* ── Sélecteur de période ────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 28,
            background: "#fff",
            borderRadius: radius.md,
            border: "1px solid rgba(0,0,0,0.07)",
            padding: "12px 18px",
            boxShadow: shadow.xs,
          }}>
            <LineChartOutlined style={{ color: brand[500], fontSize: 16 }} />
            <Text style={{ fontWeight: 500, color: neutral[700], fontSize: 13 }}>Période d'analyse :</Text>
            <RangePicker
              value={[dayjs(start), dayjs(end)]}
              format="DD/MM/YYYY"
              onChange={(dates, dateStrings) => {
                if (!dates) return;
                setStart(dateStrings[0].split("/").reverse().join("-"));
                setEnd(dateStrings[1].split("/").reverse().join("-"));
              }}
              allowClear={false}
              style={{ flex: 1, maxWidth: 280 }}
            />
          </div>

          {loading ? (
            <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
              {[1, 2].map(i => (
                <Col xs={24} md={12} key={i}>
                  <div style={{ ...chartCard, height: 280 }}>
                    <Skeleton active paragraph={{ rows: 5 }} />
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            <>
              {/* ── Indicateurs Formations ────────────────────────────── */}
              <SectionHeader icon={<PieChartOutlined />} color={brand[500]}>
                Indicateurs de formation
              </SectionHeader>

              <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
                {/* Participation Globale */}
                <Col xs={24} md={10}>
                  <div style={{ ...chartCard, minHeight: 300 }}>
                    <div style={sectionTitle("#3b82f6")}>
                      <TeamOutlined style={{ color: "#3b82f6" }} aria-hidden="true" />
                      Participation Globale
                    </div>
                    <div style={{ flex: 1, position: "relative", minHeight: 200 }}>
                      <Doughnut
                        data={{
                          labels: ["Présents", "Absents"],
                          datasets: [{
                            data: [
                              globalKpiData.presents,
                              Math.max(0, globalKpiData.total - globalKpiData.presents),
                            ],
                            backgroundColor: ["#10b981", "#e2e8f0"],
                            borderWidth: 0,
                          }],
                        }}
                        options={{
                          cutout: "68%",
                          plugins: { legend: { position: "bottom" } },
                          maintainAspectRatio: false,
                        }}
                        style={{ maxHeight: 210 }}
                      />
                    </div>
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 26, fontWeight: 700, color: neutral[900] }}>
                        {(globalKpiData.taux || 0).toFixed(1)}%
                      </span>
                      <Text style={{ display: "block", color: neutral[500], fontSize: 12 }}>
                        taux de présence
                      </Text>
                    </div>
                  </div>
                </Col>

                {/* Formations par état */}
                <Col xs={24} md={14}>
                  <div style={{ ...chartCard, minHeight: 300 }}>
                    <div style={sectionTitle("#7c3aed")}>
                      <BarChartOutlined style={{ color: "#7c3aed" }} aria-hidden="true" />
                      Répartition par état
                    </div>
                    <div style={{ flex: 1, position: "relative", minHeight: 220 }}>
                      <Radar
                        data={{
                          labels: ["Enregistré", "Planifié", "En cours", "Achevé", "Annulé"],
                          datasets: [{
                            data: [
                              formationsByEtat.enregistre ?? 0,
                              formationsByEtat.planifie ?? 0,
                              formationsByEtat.enCours ?? 0,
                              formationsByEtat.acheve ?? 0,
                              formationsByEtat.annule ?? 0,
                            ],
                            backgroundColor: "rgba(124,58,237,0.12)",
                            borderColor:     "rgba(124,58,237,0.8)",
                            borderWidth: 2,
                            pointBackgroundColor: "rgba(124,58,237,1)",
                          }],
                        }}
                        options={{
                          scales: { r: { beginAtZero: true, ticks: { font: { size: 11 } } } },
                          plugins: { legend: { display: false } },
                          maintainAspectRatio: false,
                        }}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                      />
                    </div>
                    <Text style={{ display: "block", textAlign: "center", color: neutral[500], fontSize: 12, marginTop: 8 }}>
                      Total : {formationsByEtat.total ?? 0} formations ({start} → {end})
                    </Text>
                  </div>
                </Col>
              </Row>

              {/* ── Indicateurs additionnels ──────────────────────────── */}
              <FormationsByTypeFiltered />
              <Divider style={{ margin: "24px 0" }} />
              <MetricCards />
              <Divider style={{ margin: "24px 0" }} />
              <FormationProgressBars />

              {/* ── Indicateurs des formateurs ───────────────────────── */}
              <Divider style={{ margin: "28px 0" }} />
              <SectionHeader icon={<TeamOutlined />} color="#059669">
                Indicateurs des formateurs
              </SectionHeader>

              <DonutByTrainerType />
              <Divider style={{ margin: "24px 0" }} />
              <TopParticipants />
              <Divider style={{ margin: "24px 0" }} />
              <TopAbsentees />
              <Divider style={{ margin: "24px 0" }} />
              <NonAffectedList />
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function SectionHeader({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      marginBottom: 16,
      paddingBottom: 10,
      borderBottom: `2px solid ${color}20`,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${color}15`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>
        {icon}
      </div>
      <Title level={5} style={{ margin: 0, color: neutral[800] }}>{children}</Title>
    </div>
  );
}





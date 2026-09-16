import React, { useState, useMemo } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  DatePicker,
  Skeleton,
  Row,
  Col,
  Tooltip,
  Space,
} from "antd";
import {
  BarChartOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BookOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  PieChartOutlined,
  FilterOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useFormationsByEtat, useGlobalParticipantKPI } from "@/hooks/kpi";
import "@/styles/pages/kpichart.css";
import { neutral } from "@/styles/themes/tokens";

import FormationProgressBars from "./FormationProgressBars";
import TopParticipants from "./TopParticipants";
import TopAbsentees from "./TopAbsentees";
import NonAffectedList from "./NonAffectedList";
import MetricCards from "./MetricCards";
import FormationsByTypeFiltered from "./FormationsByTypeFiltered";
import DonutByTrainerType from "./DonutByTrainerType";

const { RangePicker } = DatePicker;

type PresetKey = "ytd" | "6m" | "12m" | "current-year" | "all";

interface Preset {
  key: PresetKey;
  label: string;
  range: [Dayjs, Dayjs] | null;
}

const PRESETS: Preset[] = [
  {
    key: "ytd",
    label: "Depuis Janvier",
    range: [dayjs().startOf("year"), dayjs().endOf("year")],
  },
  {
    key: "6m",
    label: "6 derniers mois",
    range: [dayjs().subtract(6, "month").startOf("month"), dayjs().endOf("month")],
  },
  {
    key: "12m",
    label: "12 derniers mois",
    range: [dayjs().subtract(12, "month").startOf("month"), dayjs().endOf("month")],
  },
  {
    key: "current-year",
    label: "Cette année",
    range: [dayjs().startOf("year"), dayjs().endOf("year")],
  },
  {
    key: "all",
    label: "Tout",
    range: [dayjs("2020-01-01"), dayjs().endOf("year")],
  },
];

interface KpiSummaryCardProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: React.ReactNode;
  readonly unit?: string;
  readonly subtext?: React.ReactNode;
  readonly trend?: number;
  readonly accentColor: string;
  readonly accentSoftColor: string;
  readonly loading?: boolean;
}

function KpiSummaryCard({
  icon,
  label,
  value,
  unit,
  subtext,
  trend,
  accentColor,
  accentSoftColor,
  loading = false,
}: KpiSummaryCardProps) {
  const trendUp = (trend ?? 0) > 0;
  const trendDown = (trend ?? 0) < 0;
  let trendClass: string;
  if (trendUp) trendClass = "up";
  else if (trendDown) trendClass = "down";
  else trendClass = "flat";
  let trendIcon: React.ReactNode = null;
  if (trendUp) trendIcon = <ArrowUpOutlined style={{ fontSize: 9 }} />;
  else if (trendDown) trendIcon = <FallOutlined style={{ fontSize: 9 }} />;

  return (
    <div
      className="kpi-summary-card"
      style={
        {
          "--accent": accentColor,
          "--accent-soft": accentSoftColor,
          "--accent-bg": `${accentColor}14`,
        } as React.CSSProperties
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      ) : (
        <>
          <div className="kpi-summary-head">
            <div className="kpi-summary-icon">{icon}</div>
            {trend != null && (
              <span className={`kpi-summary-trend ${trendClass}`}>
                {trendIcon}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          <div className="kpi-summary-label">{label}</div>
          <div className="kpi-summary-value">
            <strong>{value}</strong>
            {unit && <small>{unit}</small>}
          </div>
          {subtext && <div className="kpi-summary-foot">{subtext}</div>}
        </>
      )}
    </div>
  );
}

interface KpiSectionTitleProps {
  readonly icon: React.ReactNode;
  readonly iconColor: string;
  readonly iconBg: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly tag?: string;
}

function KpiSectionTitle({ icon, iconColor, iconBg, title, subtitle, tag }: KpiSectionTitleProps) {
  return (
    <div className="kpi-section">
      <span
        className="kpi-section-icon"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </span>
      <div>
        <div className="kpi-section-title">{title}</div>
        {subtitle && <span className="kpi-section-sub">{subtitle}</span>}
      </div>
      <div className="kpi-section-line" />
      {tag && <span className="kpi-section-tag">{tag}</span>}
    </div>
  );
}

interface KpiChartCardProps {
  readonly title: React.ReactNode;
  readonly subtitle?: string;
  readonly icon: React.ReactNode;
  readonly iconColor: string;
  readonly pill?: React.ReactNode;
  readonly footer?: React.ReactNode;
  readonly loading?: boolean;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}

function KpiChartCard({
  title,
  subtitle,
  icon,
  iconColor,
  pill,
  footer,
  loading,
  children,
  style,
}: KpiChartCardProps) {
  return (
    <div className="kpi-chart-card" style={style}>
      <div className="kpi-chart-head">
        <div>
          <div className="kpi-chart-title">
            <span style={{ color: iconColor, fontSize: 16 }}>{icon}</span> {title}
          </div>
          {subtitle && <div className="kpi-chart-sub">{subtitle}</div>}
        </div>
        {pill && <span className="kpi-chart-pill">{pill}</span>}
      </div>
      <div className="kpi-chart-body">
        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : children}
      </div>
      {footer && <div className="kpi-chart-foot">{footer}</div>}
    </div>
  );
}

export default function KPIChart() {
  const [activePreset, setActivePreset] = useState<PresetKey>("current-year");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(
    PRESETS.find((p) => p.key === "current-year")!.range as [Dayjs, Dayjs]
  );
  const [start, setStart] = useState<string>(range[0].format("YYYY-MM-DD"));
  const [end, setEnd] = useState<string>(range[1].format("YYYY-MM-DD"));

  const { data: formationsByEtatRaw, isLoading: loadingEtat } =
    useFormationsByEtat(start, end);
  const { data: globalKpiRaw, isLoading: loadingGlobal } =
    useGlobalParticipantKPI(start, end);

  const loading = loadingEtat || loadingGlobal;

  const formationsByEtat = (formationsByEtatRaw ?? {}) as Record<string, number>;

  const globalKpiData = useMemo(() => {
    const g = globalKpiRaw as
      | { nombreParticipantsTotal?: number; nombreParticipantsPresent?: number; tauxParticipation?: number }
      | undefined;
    return {
      total: g?.nombreParticipantsTotal ?? 0,
      presents: g?.nombreParticipantsPresent ?? 0,
      taux: g?.tauxParticipation ?? 0,
    };
  }, [globalKpiRaw]);

  const totalFormations =
    (formationsByEtat.enregistre ?? 0) +
    (formationsByEtat.planifie ?? 0) +
    (formationsByEtat.enCours ?? 0) +
    (formationsByEtat.acheve ?? 0) +
    (formationsByEtat.annule ?? 0);

  const participationDonutData = useMemo(
    () => ({
      labels: ["Présents", "Absents"],
      datasets: [
        {
          data: [globalKpiData.presents, Math.max(0, globalKpiData.total - globalKpiData.presents)],
          backgroundColor: ["#10b981", "#e2e8f0"],
          borderColor: ["#ffffff", "#ffffff"],
          borderWidth: 4,
          hoverOffset: 6,
        },
      ],
    }),
    [globalKpiData]
  );

  const statusBarData = useMemo(
    () => ({
      labels: ["Enregistré", "Planifié", "En cours", "Achevé", "Annulé"],
      datasets: [
        {
          label: "Formations",
          data: [
            formationsByEtat.enregistre ?? 0,
            formationsByEtat.planifie ?? 0,
            formationsByEtat.enCours ?? 0,
            formationsByEtat.acheve ?? 0,
            formationsByEtat.annule ?? 0,
          ],
          backgroundColor: ["#94a3b8", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"],
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 28,
        },
      ],
    }),
    [formationsByEtat]
  );

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.95)",
        titleColor: "#fff",
        bodyColor: "#e2e8f0",
        padding: 10,
        cornerRadius: 8,
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.95)",
        titleColor: "#fff",
        bodyColor: "#e2e8f0",
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: neutral[500], font: { size: 11, weight: 500 as const } },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(15,23,42,0.05)" },
        ticks: { color: neutral[500], font: { size: 11 }, stepSize: 1 },
        border: { display: false },
      },
    },
  };

  function applyPreset(preset: Preset) {
    if (!preset.range) return;
    setActivePreset(preset.key);
    setRange(preset.range);
    setStart(preset.range[0].format("YYYY-MM-DD"));
    setEnd(preset.range[1].format("YYYY-MM-DD"));
  }

  function onRangeChange(dates: [Dayjs | null, Dayjs | null] | null) {
    if (!dates?.[0] || !dates[1]) return;
    setActivePreset("ytd");
    setRange([dates[0], dates[1]]);
    setStart(dates[0].format("YYYY-MM-DD"));
    setEnd(dates[1].format("YYYY-MM-DD"));
  }

  return (
    <div className="kpi-page">
      {/* ── Hero header ──────────────────────────────────────────────── */}
      <section className="kpi-hero" aria-label="En-tête KPI & Métriques">
        <div className="kpi-hero-row">
          <div className="kpi-hero-icon">
            <BarChartOutlined />
          </div>
          <div>
            <h1 className="kpi-hero-title">KPI & Métriques</h1>
            <span className="kpi-hero-subtitle">
              Indicateurs clés de performance des formations et des participants
            </span>
          </div>
          <div className="kpi-hero-spacer" />
          <Tooltip title="Période d'analyse active">
            <Space size="large" className="kpi-hero-stats" aria-label="Période active">
              <div className="kpi-hero-stat">
                <span className="kpi-hero-stat-value">{dayjs(start).format("DD MMM YYYY")}</span>
                <span className="kpi-hero-stat-label">Du</span>
              </div>
              <div className="kpi-hero-stat">
                <span className="kpi-hero-stat-value">{dayjs(end).format("DD MMM YYYY")}</span>
                <span className="kpi-hero-stat-label">Au</span>
              </div>
            </Space>
          </Tooltip>
        </div>
      </section>

      {/* ── Sticky toolbar with quick presets + range picker ─────────── */}
      <div className="kpi-toolbar" role="toolbar" aria-label="Filtres période">
        <span className="kpi-toolbar-label">
          <FilterOutlined /> Période
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`kpi-preset${activePreset === p.key ? " kpi-preset-active" : ""}`}
            onClick={() => applyPreset(p)}
            aria-pressed={activePreset === p.key}
          >
            {p.label}
          </button>
        ))}
        <div className="kpi-toolbar-spacer" />
        <RangePicker
          className="kpi-toolbar-range"
          value={range}
          format="DD/MM/YYYY"
          onChange={(dates) => onRangeChange(dates as [Dayjs | null, Dayjs | null] | null)}
          allowClear={false}
        />
      </div>

      {/* ── Top KPI summary cards ──────────────────────────────────────── */}
      <div className="kpi-summary">
        <KpiSummaryCard
          icon={<BookOutlined />}
          label="Formations"
          value={totalFormations}
          subtext={`${formationsByEtat.acheve ?? 0} achevées • ${formationsByEtat.enCours ?? 0} en cours`}
          trend={12}
          accentColor="#b51200"
          accentSoftColor="#ffb3ab"
          loading={loading}
        />
        <KpiSummaryCard
          icon={<TeamOutlined />}
          label="Participants"
          value={globalKpiData.total}
          subtext={`${globalKpiData.presents} présents uniques`}
          trend={8}
          accentColor="#3b82f6"
          accentSoftColor="#bfdbfe"
          loading={loading}
        />
        <KpiSummaryCard
          icon={<ClockCircleOutlined />}
          label="Heures de formation"
          value="—"
          subtext="Cumul sur la période"
          accentColor="#7c3aed"
          accentSoftColor="#ddd6fe"
          loading={false}
        />
        <KpiSummaryCard
          icon={<RiseOutlined />}
          label="Taux de présence"
          value={`${(globalKpiData.taux || 0).toFixed(1)}%`}
          subtext="Tous formateurs confondus"
          trend={3}
          accentColor="#10b981"
          accentSoftColor="#a7f3d0"
          loading={loading}
        />
      </div>

      {/* ── Section: Vue d'ensemble ───────────────────────────────────── */}
      <KpiSectionTitle
        icon={<PieChartOutlined />}
        iconColor="#3b82f6"
        iconBg="#eff6ff"
        title="Vue d'ensemble"
        subtitle="Participation & répartition par état"
        tag="Vue globale"
      />
      <div className="kpi-charts-row">
        <KpiChartCard
          title="Participation Globale"
          subtitle="Taux de présence des participants"
          icon={<TeamOutlined />}
          iconColor="#3b82f6"
          pill="Tous participants"
          loading={loading}
          footer={
            <div className="kpi-legend-inline">
              <span><i style={{ background: "#10b981" }} /> Présents ({globalKpiData.presents})</span>
              <span>
                <i style={{ background: "#e2e8f0" }} /> Absents (
                {Math.max(0, globalKpiData.total - globalKpiData.presents)})
              </span>
            </div>
          }
        >
          <div style={{ position: "relative", height: 220 }}>
            <div className="kpi-donut-center">
              <strong>{(globalKpiData.taux || 0).toFixed(1)}%</strong>
              <small>Taux de présence</small>
            </div>
            <Doughnut data={participationDonutData} options={donutOptions} />
          </div>
        </KpiChartCard>

        <KpiChartCard
          title="Répartition par état"
          subtitle="Formations par statut"
          icon={<BarChartOutlined />}
          iconColor="#7c3aed"
          pill={`${totalFormations} au total`}
          loading={loading}
          footer={
            <>
              {dayjs(start).format("DD/MM/YYYY")} → {dayjs(end).format("DD/MM/YYYY")}
            </>
          }
        >
          <div style={{ height: 240 }}>
            <Bar data={statusBarData} options={barOptions} />
          </div>
        </KpiChartCard>
      </div>

      {/* ── Section: Indicateurs de formation ──────────────────────────── */}
      <KpiSectionTitle
        icon={<BookOutlined />}
        iconColor="#b51200"
        iconBg="#fff0ee"
        title="Indicateurs de formation"
        subtitle="Détails, types et progression"
        tag="Formations"
      />
      <div className="kpi-block-card">
        <FormationsByTypeFiltered />
      </div>
      <div className="kpi-block-card">
        <MetricCards />
      </div>
      <div className="kpi-block-card">
        <FormationProgressBars />
      </div>

      {/* ── Section: Formateurs ─────────────────────────────────────────── */}
      <KpiSectionTitle
        icon={<UserOutlined />}
        iconColor="#059669"
        iconBg="#ecfdf5"
        title="Indicateurs des formateurs"
        subtitle="Type, top présence, absences, enseignants non affectés"
        tag="Formateurs"
      />
      <div className="kpi-block-card">
        <DonutByTrainerType />
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={24} lg={12}>
          <div className="kpi-block-card">
            <TopParticipants />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="kpi-block-card">
            <TopAbsentees />
          </div>
        </Col>
      </Row>
      <div className="kpi-block-card">
        <NonAffectedList />
      </div>
    </div>
  );
}

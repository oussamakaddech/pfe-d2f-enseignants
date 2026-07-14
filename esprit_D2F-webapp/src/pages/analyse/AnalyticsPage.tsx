import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReloadOutlined, ThunderboltOutlined, TeamOutlined, WarningOutlined,
  SafetyCertificateOutlined, BellOutlined, ExperimentOutlined, RiseOutlined,
  FallOutlined, BulbOutlined, LineChartOutlined, RocketOutlined,
  FilterOutlined, DashboardOutlined, AimOutlined, ApartmentOutlined,
  AlertOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from "@ant-design/icons";
import { Tag, Select, Segmented, Tooltip, Empty, Skeleton } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeRole } from "@/utils/constants/roles";
import {
  useOverview, useModelPerformance, useRiskDistribution, useRiskEvolution,
  useDemandForecast, useGapHeatmap, useDecliningCompetencies,
  useInDemandCompetencies, useTeacherRiskIndicators, useAlertsSummary,
  useDriftStatus, useTrainModel,
} from "@/hooks/analyse/useAnalysePredictive";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useQueryClient } from "@tanstack/react-query";
import WhatIfSimulator from "@/pages/analyse/WhatIfSimulator";
import "@/pages/analyse/AnalyticsPage.css";

dayjs.locale("fr");

/* ════════════════════════════════════════════════════════════════════════
   PALETTE — design system local (`ap-*` namespace), aucune dépendance au
   thème partagé `rd-*`. Tout est redessiné from scratch.
   ════════════════════════════════════════════════════════════════════════ */
const C = {
  bg: "#0b1020",
  panel: "#141b30",
  panel2: "#1b2440",
  line: "#2a3654",
  ink: "#eef2ff",
  ink2: "#aab4d4",
  ink3: "#6b7699",
  brand: "#6c8cff",
  brand2: "#9b6cff",
  cyan: "#36e0d0",
  green: "#34d399",
  amber: "#f5b942",
  red: "#ff6b81",
  violet: "#b07cff",
};
const RISK_COLORS: Record<string, string> = {
  FAIBLE: C.green, MODERE: C.cyan, ELEVE: C.amber, CRITIQUE: C.red,
  faible: C.green, modere: C.cyan, eleve: C.amber, critique: C.red,
};
const SEG = [
  { label: "3 mois", value: 3 },
  { label: "6 mois", value: 6 },
  { label: "12 mois", value: 12 },
];

function fmtPct(v: number | null | undefined, digits = 0) {
  return v == null ? "—" : `${v.toFixed(digits)} %`;
}
function fmtDelta(v: number | null | undefined) {
  if (v == null) return { txt: "", tone: "neutral" as const };
  const tone = v > 0 ? "up" : v < 0 ? "down" : "neutral";
  return { txt: `${v > 0 ? "+" : ""}${v.toFixed(1)}`, tone };
}

/* ── mini sparkline (SVG path) ─────────────────────────────────────────── */
function Sparkline({ data, color = C.brand }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const w = 120, h = 36, pad = 3;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
    const y = h - pad - ((d - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  return (
    <svg className="ap-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── donut chart (répartition des risques) ─────────────────────────────── */
function Donut({ segments, size = 180, thickness = 26 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number; thickness?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2;
  let acc = 0;
  const arcs = segments.map((s) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return { d: `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`, color: s.color, label: s.label, value: s.value };
  });
  return (
    <svg className="ap-donut" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth={thickness} />
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={thickness} strokeLinecap="butt">
          <title>{`${a.label}: ${a.value}`}</title>
        </path>
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" className="ap-donut-num">{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" className="ap-donut-lbl">enseignants</text>
    </svg>
  );
}

/* ── line + confidence band forecast chart ─────────────────────────────── */
function ForecastChart({ points, height = 220 }: {
  points: { month: string; value: number; lower?: number; upper?: number; isProjection?: boolean }[];
  height?: number;
}) {
  const w = 720, h = height, padL = 40, padR = 16, padT = 16, padB = 30;
  const all = points.flatMap((p) => [p.value, p.lower ?? p.value, p.upper ?? p.value]);
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => padL + (i / (points.length - 1 || 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (h - padT - padB);
  const firstProj = points.findIndex((p) => p.isProjection);
  const band = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.upper ?? p.value).toFixed(1)}`)
    .join(" ") + " " + [...points].reverse().map((p, k) => {
      const i = points.length - 1 - k;
      return `L${x(i).toFixed(1)} ${y(p.lower ?? p.value).toFixed(1)}`;
    }).join(" ") + " Z";
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const histLine = firstProj <= 0 ? line :
    points.slice(0, firstProj + 1).map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const projLine = firstProj < 0 ? "" :
    points.slice(firstProj).map((p, i) => `${i ? "L" : "M"}${x(firstProj + i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const ticks = points.map((p, i) => (i % Math.ceil(points.length / 6) === 0 ? i : -1)).filter((i) => i >= 0);
  return (
    <svg className="ap-fchart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.brand} stopOpacity="0.28" />
          <stop offset="100%" stopColor={C.brand} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line key={i} x1={padL} x2={w - padR} y1={padT + g * (h - padT - padB)} y2={padT + g * (h - padT - padB)} stroke={C.line} strokeDasharray="3 5" />
      ))}
      {points.some((p) => p.lower != null) && <path d={band} fill="url(#bandGrad)" stroke="none" />}
      <path d={histLine} fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinejoin="round" />
      {projLine && <path d={projLine} fill="none" stroke={C.brand} strokeWidth="2.5" strokeDasharray="6 5" strokeLinejoin="round" />}
      {firstProj > 0 && <line x1={x(firstProj)} x2={x(firstProj)} y1={padT} y2={h - padB} stroke={C.brand2} strokeDasharray="2 4" strokeOpacity="0.6" />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i >= firstProj && firstProj > 0 ? 3 : 2.5} fill={i >= firstProj && firstProj > 0 ? C.brand : C.cyan} />
      ))}
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={h - 10} textAnchor="middle" className="ap-axis">{points[i].month}</text>
      ))}
    </svg>
  );
}

/* ── area chart (évolution du risque) ──────────────────────────────────── */
function AreaChart({ series, height = 200 }: {
  series: { month: string; critical: number; high: number }[];
  height?: number;
}) {
  const w = 720, h = height, padL = 40, padR = 16, padT = 16, padB = 28;
  const total = series.map((s) => s.critical + s.high);
  const max = Math.max(...total, 1);
  const x = (i: number) => padL + (i / (series.length - 1 || 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - v / max) * (h - padT - padB);
  const mk = (key: "critical" | "high") =>
    series.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(s[key]).toFixed(1)}`).join(" ") +
    ` L${x(series.length - 1).toFixed(1)} ${h - padB} L${x(0).toFixed(1)} ${h - padB} Z`;
  const ticks = series.map((_, i) => (i % Math.ceil(series.length / 6) === 0 ? i : -1)).filter((i) => i >= 0);
  return (
    <svg className="ap-achart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.red} stopOpacity="0.45" />
          <stop offset="100%" stopColor={C.red} stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.amber} stopOpacity="0.4" />
          <stop offset="100%" stopColor={C.amber} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={mk("critical")} fill="url(#critGrad)" stroke={C.red} strokeWidth="2" />
      <path d={mk("high")} fill="url(#highGrad)" stroke={C.amber} strokeWidth="2" />
      {series.map((_, i) => i > 0 && i < series.length && (
        <line key={i} x1={x(i)} x2={x(i)} y1={padT} y2={h - padB} stroke={C.line} strokeOpacity="0.5" />
      ))}
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={h - 9} textAnchor="middle" className="ap-axis">{series[i].month}</text>
      ))}
    </svg>
  );
}

/* ── gauge (performance du modèle) ────────────────────────────────────── */
function Gauge({ value, label }: { value: number | null; label: string }) {
  const r = 70, cx = 90, cy = 90, circ = Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(1, value));
  const col = v >= 0.75 ? C.green : v >= 0.5 ? C.amber : C.red;
  return (
    <svg className="ap-gauge" viewBox="0 0 180 110">
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.line} strokeWidth="12" strokeLinecap="round" />
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(v * Math.PI * r).toFixed(1)} ${circ.toFixed(1)}`} />
      <text x={cx} y={cy - 14} textAnchor="middle" className="ap-gauge-num" fill={col}>{value == null ? "—" : `${Math.round(v * 100)}%`}</text>
      <text x={cx} y={cy + 6} textAnchor="middle" className="ap-gauge-lbl">{label}</text>
    </svg>
  );
}

/* ── horizontal bars (compétences en déclin) ───────────────────────────── */
function HBar({ rows, color = C.red }: { rows: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="ap-hbars">
      {rows.map((r, i) => (
        <div className="ap-hbar" key={i}>
          <span className="ap-hbar-label" title={r.label}>{r.label}</span>
          <div className="ap-hbar-track"><div className="ap-hbar-fill" style={{ width: `${(r.value / max) * 100}%`, background: color }} /></div>
          <span className="ap-hbar-val">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = useAppNotification();
  const qc = useQueryClient();
  const roleKey = normalizeRole(user?.role);
  const isAdmin = roleKey === "admin";
  const todayLabel = dayjs().format("dddd D MMMM YYYY");

  const [refreshing, setRefreshing] = useState(false);
  const [horizon, setHorizon] = useState(6);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ dept: string; comp: string } | null>(null);

  const overview = useOverview();
  const model = useModelPerformance();
  const drift = useDriftStatus();
  const riskDist = useRiskDistribution();
  const riskEvo = useRiskEvolution(horizon);
  const demand = useDemandForecast(horizon);
  const heatmap = useGapHeatmap();
  const declining = useDecliningCompetencies();
  const inDemand = useInDemandCompetencies();
  const atRisk = useTeacherRiskIndicators();
  const alerts = useAlertsSummary();
  const train = useTrainModel();

  const depts = useMemo(() => {
    const set = new Set<string>();
    (heatmap.data ?? []).forEach((c) => set.add(c.departement));
    (atRisk.data ?? []).forEach((t) => t.departement && set.add(t.departement));
    return Array.from(set).sort();
  }, [heatmap.data, atRisk.data]);

  const filteredAtRisk = useMemo(
    () => (deptFilter ? (atRisk.data ?? []).filter((t) => t.departement === deptFilter) : (atRisk.data ?? [])),
    [atRisk.data, deptFilter],
  );

  const donutSegments = useMemo(() => {
    const b = riskDist.data?.by_level ?? {};
    return [
      { label: "Critique", value: b.CRITIQUE ?? 0, color: C.red },
      { label: "Élevé", value: b.ELEVE ?? 0, color: C.amber },
      { label: "Modéré", value: b.MODERE ?? 0, color: C.cyan },
      { label: "Faible", value: b.FAIBLE ?? 0, color: C.green },
    ];
  }, [riskDist.data]);

  const forecastPoints = useMemo(() => {
    const d = demand.data;
    if (!d) return [];
    return [
      ...(d.history ?? []).map((p) => ({ month: p.month, value: p.value, lower: p.lower, upper: p.upper, isProjection: false })),
      ...(d.forecast ?? []).map((p) => ({ month: p.month, value: p.value, lower: p.lower, upper: p.upper, isProjection: true })),
    ];
  }, [demand.data]);

  const heatRows = useMemo(() => {
    const cells = heatmap.data ?? [];
    const comps = Array.from(new Set(cells.map((c) => c.competence_nom)));
    const ds = deptFilter ? cells.filter((c) => c.departement === deptFilter) : cells;
    const byComp = new Map<string, { dept: string; avg: number; count: number }[]>();
    ds.forEach((c) => {
      const arr = byComp.get(c.competence_nom) ?? [];
      arr.push({ dept: c.departement, avg: c.avg_gap, count: c.enseignants_count });
      byComp.set(c.competence_nom, arr);
    });
    return { comps: comps.slice(0, 12), rows: byComp };
  }, [heatmap.data, deptFilter]);

  const gapColor = (g: number) => g >= 2 ? C.red : g >= 1 ? C.amber : g >= 0.4 ? C.cyan : C.green;

  const simTeachers = useMemo(
    () => (atRisk.data ?? []).map((t) => ({ teacher_id: t.teacher_id, teacher_name: t.teacher_name, departement: t.departement })),
    [atRisk.data],
  );
  const simCompetences = useMemo(() => {
    const map = new Map<number, string>();
    (heatmap.data ?? []).forEach((c) => map.set(c.competence_id, c.competence_nom));
    return Array.from(map, ([competence_id, competence_nom]) => ({ competence_id, competence_nom }));
  }, [heatmap.data]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["analyse"] });
    setRefreshing(false);
    message.success("Données prédictives actualisées");
  }, [qc, message]);

  const onTrain = () => {
    train.mutate(undefined, {
      onSuccess: () => { message.success("Ré-entraînement du modèle lancé"); refresh(); },
      onError: () => message.error("Échec du ré-entraînement"),
    });
  };

  const ov = overview.data;
  const kpis = [
    { icon: <TeamOutlined />, label: "Enseignants suivis", value: ov?.nb_enseignants_suivis ?? null, delta: ov?.deltas.nb_enseignants_suivis, spark: [10, 12, 11, 14, 16, 18, ov?.nb_enseignants_suivis ?? 0], color: C.brand },
    { icon: <WarningOutlined />, label: "Gaps critiques", value: ov?.nb_gaps_critiques ?? null, delta: ov?.deltas.nb_gaps_critiques, spark: [8, 7, 9, 6, 8, 7, ov?.nb_gaps_critiques ?? 0], color: C.red },
    { icon: <SafetyCertificateOutlined />, label: "Couverture globale", value: ov?.taux_couverture_global ?? null, suffix: "%", delta: ov?.deltas.taux_couverture_global, spark: [60, 62, 65, 64, 68, 70, ov?.taux_couverture_global ?? 0], color: C.green },
    { icon: <LineChartOutlined />, label: "Score de risque moyen", value: ov?.score_risque_moyen ?? null, delta: ov?.deltas.score_risque_moyen, spark: [40, 44, 42, 46, 43, 45, ov?.score_risque_moyen ?? 0], color: C.amber },
    { icon: <AlertOutlined />, label: "Alertes nouvelles", value: ov?.nb_alertes_nouvelles ?? null, delta: ov?.deltas.nb_alertes_nouvelles, spark: [3, 5, 4, 6, 5, 7, ov?.nb_alertes_nouvelles ?? 0], color: C.violet },
  ];

  const loading = overview.isLoading || riskDist.isLoading || demand.isLoading;

  return (
    <div className="ap-root">
      {/* ── HERO ── */}
      <header className="ap-hero">
        <div className="ap-hero-glow" />
        <div className="ap-hero-main">
          <div className="ap-hero-title">
            <span className="ap-hero-kicker"><ExperimentOutlined /> Analyse Prédictive · D2F</span>
            <h1>Intelligence des compétences &amp; anticipation des risques</h1>
            <p className="ap-hero-sub">
              Modèles ML temps-réel · {todayLabel} · Horizon de projection <b>{horizon} mois</b>
            </p>
          </div>
          <div className="ap-hero-actions">
            <Tooltip title="Ré-entraîner le modèle (ADMIN)">
              <button className="ap-btn ap-btn-ghost" onClick={onTrain} disabled={!isAdmin || train.isPending}>
                <ThunderboltOutlined /> {train.isPending ? "Entraînement…" : "Ré-entraîner"}
              </button>
            </Tooltip>
            <Tooltip title="Actualiser les données">
              <button className="ap-btn ap-btn-primary" onClick={refresh} disabled={refreshing}>
                <ReloadOutlined className={refreshing ? "ap-spin" : ""} /> {refreshing ? "Sync…" : "Actualiser"}
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="ap-hero-meta">
          <div className={`ap-model-badge ${drift.data?.drift_detected ? "is-warn" : "is-ok"}`}>
            {drift.data?.drift_detected ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
            <div><b>Modèle</b><span>{drift.data?.drift_detected ? "Dérive détectée" : "Stable"} · {ov?.precision_modele != null ? `précision ${Math.round(ov.precision_modele * 100)}%` : "—"}</span></div>
          </div>
          <div className="ap-hero-filters">
            <span className="ap-filter-ico"><FilterOutlined /></span>
            <Select
              allowClear placeholder="Tous départements" value={deptFilter ?? undefined}
              onChange={(v) => setDeptFilter(v ?? null)} className="ap-select"
              options={depts.map((d) => ({ value: d, label: d }))} popupClassName="ap-pop" />
            <Segmented options={SEG.map((s) => ({ label: s.label, value: s.value }))} value={horizon}
              onChange={(v) => setHorizon(v as number)} className="ap-seg" />
          </div>
        </div>
      </header>

      {/* ── KPIs ── */}
      <section className="ap-kpis">
        {kpis.map((k, i) => {
          const d = fmtDelta(k.delta);
          return (
            <div className="ap-kpi" key={i} style={{ ["--accent" as string]: k.color }}>
              <div className="ap-kpi-top">
                <span className="ap-kpi-ico">{k.icon}</span>
                <span className={`ap-kpi-delta ap-${d.tone}`}>{d.txt || "—"}</span>
              </div>
              <div className="ap-kpi-value">{k.value == null ? <Skeleton.Input active size="small" /> : `${k.value}${k.suffix ?? ""}`}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <Sparkline data={k.spark} color={k.color} />
            </div>
          );
        })}
      </section>

      {loading ? (
        <div className="ap-loading"><Skeleton active paragraph={{ rows: 10 }} /></div>
      ) : (
        <>
          {/* ── CARTOGRAPHIE DES RISQUES ── */}
          <section className="ap-grid ap-grid-2">
            <div className="ap-card">
              <div className="ap-card-head">
                <h3><AimOutlined /> Répartition du risque enseignant</h3>
                <Tag color={donutSegments[0].value ? "red" : "green"}>{riskDist.data?.total ?? 0} évalués</Tag>
              </div>
              <div className="ap-card-body ap-donut-wrap">
                <Donut segments={donutSegments} />
                <div className="ap-legend">
                  {donutSegments.map((s) => (
                    <div className="ap-legend-row" key={s.label}>
                      <span className="ap-dot" style={{ background: s.color }} />
                      <span className="ap-legend-label">{s.label}</span>
                      <span className="ap-legend-val">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ap-card">
              <div className="ap-card-head">
                <h3><RiseOutlined /> Évolution du risque · {horizon} mois</h3>
                <span className="ap-chip">Critique vs Élevé</span>
              </div>
              <div className="ap-card-body">
                {riskEvo.data?.length ? (
                  <AreaChart series={riskEvo.data} />
                ) : <Empty description="Pas de données" />}
                <div className="ap-legend ap-legend-inline">
                  <span><span className="ap-dot" style={{ background: C.red }} /> Critique</span>
                  <span><span className="ap-dot" style={{ background: C.amber }} /> Élevé</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── PRÉVISION / FORECAST ── */}
          <section className="ap-card">
            <div className="ap-card-head">
              <h3><LineChartOutlined /> Prévision de la demande de compétences</h3>
              <span className="ap-chip">{demand.data?.method ?? "modèle"} · zone = intervalle de confiance</span>
            </div>
            <div className="ap-card-body">
              {forecastPoints.length ? (
                <ForecastChart points={forecastPoints} />
              ) : <Empty description="Pas de prévision" />}
              <div className="ap-legend ap-legend-inline">
                <span><span className="ap-line" style={{ background: C.cyan }} /> Historique</span>
                <span><span className="ap-line ap-dashed" style={{ background: C.brand }} /> Projection</span>
              </div>
            </div>
          </section>

          {/* ── SIMULATION WHAT-IF ── */}
          <section className="ap-card">
            <div className="ap-card-head">
              <h3><ExperimentOutlined /> Simulateur d'impact · projection &amp; scénarios</h3>
              <span className="ap-chip">risque avant / après plan de formation</span>
            </div>
            <div className="ap-card-body">
              <WhatIfSimulator
                teachers={simTeachers}
                competences={simCompetences}
                defaultTeacherId={filteredAtRisk[0]?.teacher_id ?? null}
              />
            </div>
          </section>

          {/* ── HEATMAP ── */}
          <section className="ap-card">
            <div className="ap-card-head">
              <h3><DashboardOutlined /> Cartographie des écarts (Gap Heatmap)</h3>
              {selectedCell && (
                <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => setSelectedCell(null)}>Réinitialiser · {selectedCell.dept} / {selectedCell.comp}</button>
              )}
            </div>
            <div className="ap-card-body">
              {heatRows.comps.length ? (
                <div className="ap-heat">
                  <div className="ap-heat-row ap-heat-head">
                    <span className="ap-heat-corner">Compétence \ Dépt.</span>
                    {depts.slice(0, 10).map((d) => (
                      <span className="ap-heat-col" key={d} title={d}>{d.slice(0, 6)}</span>
                    ))}
                  </div>
                  {heatRows.comps.map((comp) => (
                    <div className="ap-heat-row" key={comp}>
                      <span className="ap-heat-rowlabel" title={comp}>{comp}</span>
                      {depts.slice(0, 10).map((d) => {
                        const cell = (heatRows.rows.get(comp) ?? []).find((r) => r.dept === d);
                        const g = cell?.avg ?? 0;
                        const active = selectedCell?.dept === d && selectedCell?.comp === comp;
                        return (
                          <button key={d}
                            className={`ap-heat-cell ${active ? "is-active" : ""} ${cell ? "" : "is-empty"}`}
                            style={{ background: cell ? gapColor(g) : "transparent", opacity: cell ? 0.35 + (g / 2.5) * 0.6 : 1 }}
                            disabled={!cell}
                            onClick={() => cell && setSelectedCell({ dept: d, comp })}
                            title={cell ? `${comp} · ${d} · écart ${g.toFixed(1)} · ${cell.count} ens.` : "—"}>
                            {cell ? g.toFixed(1) : ""}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : <Empty description="Pas de heatmap" />}
              <div className="ap-legend ap-legend-inline">
                <span>Faible</span><span className="ap-heat-scale" />
                <span>Critique</span>
              </div>
            </div>
          </section>

          {/* ── DÉCLIN vs DEMANDE ── */}
          <section className="ap-grid ap-grid-2">
            <div className="ap-card">
              <div className="ap-card-head">
                <h3><FallOutlined /> Compétences en déclin</h3>
                <span className="ap-chip ap-bad">à surveiller</span>
              </div>
              <div className="ap-card-body">
                {declining.data?.length ? (
                  <HBar rows={(declining.data).slice(0, 8).map((c) => ({ label: c.competency_name, value: c.demand_12m ?? c.demand_3m ?? 0 }))} color={C.red} />
                ) : <Empty description="Aucune" />}
              </div>
            </div>
            <div className="ap-card">
              <div className="ap-card-head">
                <h3><RocketOutlined /> Compétences en forte demande</h3>
                <span className="ap-chip ap-good">priorité</span>
              </div>
              <div className="ap-card-body">
                {inDemand.data?.length ? (
                  <HBar rows={(inDemand.data).slice(0, 8).map((c) => ({ label: c.competency_name, value: c.demand_12m ?? c.demand_3m ?? 0 }))} color={C.green} />
                ) : <Empty description="Aucune" />}
              </div>
            </div>
          </section>

          {/* ── PERF MODÈLE ── */}
          <section className="ap-grid ap-grid-3">
            <div className="ap-card ap-center">
              <div className="ap-card-head"><h3><ExperimentOutlined /> Précision du modèle</h3></div>
              <Gauge value={model.data?.gap_model_accuracy ?? null} label="gap accuracy" />
              <div className="ap-model-meta">
                <span>Dernier entraînement</span>
                <b>{model.data?.last_retrained ? dayjs(model.data.last_retrained).format("DD/MM/YY HH:mm") : "—"}</b>
              </div>
              <div className={`ap-drift ${drift.data?.drift_detected ? "is-warn" : "is-ok"}`}>
                {drift.data?.drift_detected ? <WarningOutlined /> : <CheckCircleOutlined />}
                {drift.data?.message ?? (drift.data?.drift_detected ? "Dérive détectée" : "Aucune dérive")}
              </div>
            </div>

            <div className="ap-card">
              <div className="ap-card-head"><h3><BellOutlined /> Alertes par sévérité</h3></div>
              <div className="ap-card-body">
                {alerts.data ? (
                  <div className="ap-alert-stats">
                    <div className="ap-alert-stat ap-crit"><b>{alerts.data.critiques_ouvertes}</b><span>critiques</span></div>
                    <div className="ap-alert-stat ap-new"><b>{alerts.data.nouvelles}</b><span>nouvelles</span></div>
                    <div className="ap-alert-stat ap-tot"><b>{alerts.data.total}</b><span>total</span></div>
                  </div>
                ) : <Empty />}
                <div className="ap-chips">
                  {(alerts.data?.by_type ?? []).slice(0, 4).map((t) => (
                    <Tag key={t.key} className="ap-tag">{t.key.replaceAll("_", " ")} · {t.count}</Tag>
                  ))}
                </div>
              </div>
            </div>

            <div className="ap-card">
              <div className="ap-card-head"><h3><BulbOutlined /> Recommandation IA</h3></div>
              <div className="ap-card-body ap-reco">
                <p>Le modèle anticipe <b>{donutSegments[0].value + donutSegments[1].value}</b> enseignants à risque élevé/critique sur <b>{horizon} mois</b>.</p>
                <p>Priorisez les formations sur les <b>{inDemand.data?.length ?? 0}</b> compétences en forte demande avant la prochaine rentrée.</p>
                <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => navigate("/home/analytics/teacher")}>
                  <ApartmentOutlined /> Pilotage par enseignant
                </button>
              </div>
            </div>
          </section>

          {/* ── ENSEIGNANTS À RISQUE ── */}
          <section className="ap-card">
            <div className="ap-card-head">
              <h3><TeamOutlined /> Enseignants à risque {deptFilter ? `· ${deptFilter}` : ""}</h3>
              <span className="ap-chip">{filteredAtRisk.length} détectés</span>
            </div>
            <div className="ap-card-body">
              <div className="ap-table">
                <div className="ap-trow ap-thead">
                  <span>Enseignant</span><span>Département</span><span>Score risque</span><span>Tendance</span><span>Signaux</span><span>Action</span>
                </div>
                {filteredAtRisk.slice(0, 12).map((t) => {
                  const lvl = t.attrition_risk_score >= 0.75 ? "CRITIQUE" : t.attrition_risk_score >= 0.5 ? "ELEVE" : t.attrition_risk_score >= 0.25 ? "MODERE" : "FAIBLE";
                  return (
                    <div className="ap-trow" key={t.teacher_id}>
                      <span className="ap-tname">{t.teacher_name}</span>
                      <span className="ap-tdim">{t.departement ?? "—"}</span>
                      <span><span className="ap-risk-pill" style={{ background: RISK_COLORS[lvl], color: "#0b1020" }}>{Math.round(t.attrition_risk_score * 100)}%</span></span>
                      <span className={t.competency_stagnation_rate > 0.5 ? "ap-down" : "ap-up"}>
                        {t.competency_stagnation_rate > 0.5 ? <FallOutlined /> : <RiseOutlined />} {t.competency_stagnation_rate > 0.5 ? "Stagnation" : "Actif"}
                      </span>
                      <span className="ap-signals">{(t.disengagement_signals ?? []).slice(0, 2).join(", ") || "—"}</span>
                      <span className="ap-action">{t.recommendation}</span>
                    </div>
                  );
                })}
                {!filteredAtRisk.length && <Empty description="Aucun enseignant à risque" />}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

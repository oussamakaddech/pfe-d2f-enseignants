import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Select, Tag, Alert,
} from "antd";
import {
  ReloadOutlined, DownloadOutlined, DashboardOutlined, TeamOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, BookOutlined,
  RiseOutlined, ApartmentOutlined, ThunderboltOutlined,
  SafetyCertificateOutlined, BarChartOutlined, NodeIndexOutlined,
  PieChartOutlined, RightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeRole } from "@/utils/constants/roles";
import { greeting } from "@/utils/helpers/greeting";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useCupDashboard } from "@/hooks/dashboard/useCupDashboard";
import { generateDashboardPdf } from "@/utils/pdf/dashboardPdfExport";
import { brand, semantic, roleColors } from "@/styles/themes/tokens";
import { Section, Card } from "@/redesign/components/Section";
import KpiCard from "@/redesign/components/KpiCard";
import HorizontalBarChart from "@/redesign/components/charts/HorizontalBarChart";
import PolarAreaChart from "@/redesign/components/charts/PolarAreaChart";
import StackedProgress from "@/redesign/components/charts/StackedProgress";
import "@/pages/dashboard/CupDashboardPage.css";

dayjs.locale("fr");

const ACCENT = brand[500];

type FilterDept = string;

export default function CupDashboardPage() {
  const { user } = useAuth();
  const { message: notify } = useAppNotification();
  const navigate = useNavigate();
  const greet = greeting();

  const [refreshing, setRefreshing] = useState(false);
  const [deptFilter, setDeptFilter] = useState<FilterDept>("all");

  const {
    kpis, topCompetences, besoinsParDept, besoinsPriorises,
    tauxReussite, deptAnalytics, besoins, loading,
    deptLoading, formationsByType, formationsByTypeLoading, timeline, timelineLoading,
  } = useCupDashboard();

  const filteredBesoinsPriorises = useMemo(() => {
    if (deptFilter === "all") return besoinsPriorises;
    return besoinsPriorises.filter((b) => b.departement === deptFilter);
  }, [besoinsPriorises, deptFilter]);

  const departements = useMemo(() => {
    const set = new Set<string>();
    for (const b of besoins) {
      if (b.departement) set.add(b.departement);
    }
    return [...set].sort();
  }, [besoins]);

  const todayLabel = dayjs().format("dddd D MMMM YYYY");
  const displayName = user?.username ?? user?.email ?? "Utilisateur";
  const roleKey = normalizeRole(user?.role);
  const roleLabel = roleColors[roleKey ?? ""]?.label ?? roleKey ?? "";

  async function handleRefresh() {
    setRefreshing(true);
    try {
      notify.success("Tableau de bord actualisé.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleExportPdf() {
    try {
      generateDashboardPdf({
        kpis,
        topCompetences,
        besoinsParDept,
        besoinsPriorises: filteredBesoinsPriorises,
        tauxReussite,
      });
      notify.success("Rapport PDF téléchargé.");
    } catch {
      notify.error("Erreur lors de la génération du PDF.");
    }
  }

  const etatItems = [
    { key: "enregistre", label: "Enregistrées", value: 0, color: "#94a3b8" },
    { key: "planifie", label: "Planifiées", value: 0, color: "#6366f1" },
    { key: "enCours", label: "En cours", value: kpis.enCours, color: "#f59e0b" },
    { key: "acheve", label: "Achevées", value: kpis.achevees, color: semantic.success },
    { key: "annule", label: "Annulées", value: 0, color: semantic.error },
  ];

  const successByDept = useMemo(() => {
    return tauxReussite.map((d) => ({
      label: d.domaine,
      segments: [
        { label: "Réussite", value: d.reussite, color: semantic.success },
        { label: "En cours", value: d.enCours, color: "#f59e0b" },
        { label: "Échec", value: d.echec, color: semantic.error },
      ],
    }));
  }, [tauxReussite]);

  const radarItems = useMemo(() => {
    return (deptAnalytics?.departements ?? []).slice(0, 8).map((d) => ({
      label: d.departementNom,
      value: d.nombreFormationsOrganisees ?? 0,
    }));
  }, [deptAnalytics]);

  const typeItems = useMemo(() => [
    { label: "Interne", value: formationsByType?.interne ?? 0, color: "#6366f1" },
    { label: "Externe", value: formationsByType?.externe ?? 0, color: "#f59e0b" },
    { label: "En ligne", value: formationsByType?.enLigne ?? 0, color: "#0ea5e9" },
  ], [formationsByType]);

  const timelineData = useMemo(() => {
    return (timeline?.periodes ?? []).map((p) => ({ label: p.label, value: p.nombreFormations }));
  }, [timeline]);

  return (
    <div className="cd">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="cd-hero">
        <div className="cd-hero-avatar"><DashboardOutlined /></div>
        <div className="cd-hero-body">
          <div className="cd-hero-eyebrow">
            Tableau de bord CUP
            <span className="cd-hero-role">{roleLabel}</span>
          </div>
          <h1 className="cd-hero-title">{greet.emoji} {greet.text}, {displayName}</h1>
          <p className="cd-hero-sub">
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)} · Statistiques, compétences, besoins et priorisation pour la CUP.
          </p>
        </div>
        <div className="cd-hero-actions">
          <span className="cd-hero-status">
            <span className="cd-dot ok" />
            Données en direct
          </span>
          <button className="cd-btn" onClick={handleRefresh} disabled={refreshing}>
            <ReloadOutlined spin={refreshing} /> Rafraîchir
          </button>
          <button className="cd-btn cd-btn-export" onClick={handleExportPdf}>
            <DownloadOutlined /> Export PDF
          </button>
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <Section title="Indicateurs CUP" subtitle="Vue d'ensemble des métriques clés">
        <div className="cd-kpi-grid">
          <KpiCard
            label="Formations totales"
            value={kpis.totalFormations}
            unit="int"
            icon={<BarChartOutlined />}
            accent={ACCENT}
            accentBg="rgba(181,18,0,0.10)"
            helper={`${kpis.achevees} achevées`}
            loading={loading}
          />
          <KpiCard
            label="Taux de réussite"
            value={kpis.tauxReussiteGlobal}
            unit="pct"
            icon={<CheckCircleOutlined />}
            accent={semantic.success}
            accentBg={semantic.successBg}
            helper="Formations achevées / total"
            loading={loading}
          />
          <KpiCard
            label="Taux de participation"
            value={kpis.tauxParticipation}
            unit="pct"
            icon={<TeamOutlined />}
            accent="#0ea5e9"
            accentBg="rgba(14,165,233,0.12)"
            helper="Moyenne tous départements"
            loading={loading}
          />
          <KpiCard
            label="Besoins en attente"
            value={kpis.pendingBesoins}
            unit="int"
            icon={<ClockCircleOutlined />}
            accent="#f59e0b"
            accentBg="rgba(245,158,11,0.12)"
            helper={`${kpis.critiques} critiques`}
            loading={loading}
          />
          <KpiCard
            label="Heures de formation"
            value={kpis.totalHeures}
            unit="int"
            icon={<RiseOutlined />}
            accent="#0ea5e9"
            accentBg="rgba(14,165,233,0.12)"
            helper="Cumulées sur 12 mois"
            loading={loading}
          />
          <KpiCard
            label="Participants uniques"
            value={kpis.participants}
            unit="int"
            icon={<TeamOutlined />}
            accent="#6366f1"
            accentBg="rgba(99,102,241,0.12)"
            helper="Enseignants formés"
            loading={loading}
          />
          <KpiCard
            label="Départements actifs"
            value={kpis.departements}
            unit="int"
            icon={<ApartmentOutlined />}
            accent="#8b5cf6"
            accentBg="rgba(139,92,246,0.12)"
            helper="Participant à la formation"
            loading={loading}
          />
          <KpiCard
            label="Couverture compétences"
            value={kpis.couverture}
            unit="pct"
            icon={<SafetyCertificateOutlined />}
            accent={semantic.success}
            accentBg={semantic.successBg}
            helper="Niveau requis atteint"
            loading={loading}
          />
        </div>
      </Section>

      {/* ════════ FORMATIONS ════════ */}
      <Section title="Formations" subtitle="Typologie, évolution mensuelle et couverture">
        <div className="cd-grid cd-grid-2">
          <Card
            title="Par type"
            subtitle="Interne · Externe · En ligne"
            icon={<ApartmentOutlined />}
            iconColor="#6366f1"
            iconBg="rgba(99,102,241,0.12)"
          >
            {formationsByTypeLoading ? (
              <div className="cd-skel" style={{ height: 180 }} />
            ) : (
              <SegBars items={typeItems} />
            )}
          </Card>

          <Card
            title="Évolution mensuelle"
            subtitle={`${timeline?.totalFormations ?? 0} formations sur 12 mois`}
            icon={<RiseOutlined />}
            iconColor="#0ea5e9"
            iconBg="rgba(14,165,233,0.12)"
          >
            {timelineLoading ? (
              <div className="cd-skel" style={{ height: 230 }} />
            ) : (
              <AreaLineChart data={timelineData} color={ACCENT} />
            )}
          </Card>
        </div>
      </Section>

      {/* ════════ COMPÉTENCES LES PLUS DEMANDÉES ════════ */}
      <Section
        title="Compétences les plus demandées"
        subtitle="Top 10 des thèmes et domaines de formation les plus sollicités"
        extra={
          <Tag color="blue" icon={<ThunderboltOutlined />}>
            {topCompetences.length} compétences
          </Tag>
        }
      >
        <div className="cd-grid cd-grid-2">
          <Card
            title="Demande par compétence"
            subtitle="Basé sur les besoins de formation déposés"
            icon={<BookOutlined />}
            iconColor="#6366f1"
            iconBg="rgba(99,102,241,0.12)"
          >
            {loading ? (
              <div className="cd-skel" style={{ height: 360 }} />
            ) : (
              <HorizontalBarChart
                items={topCompetences.map((c) => ({ label: c.name, value: c.count }))}
                color="#6366f1"
                height={30}
              />
            )}
          </Card>

          <Card
            title="Répartition des formations par département"
            subtitle="Volume de formations organisées"
            icon={<PieChartOutlined />}
            iconColor="#f97316"
            iconBg="rgba(249,115,22,0.12)"
          >
            {deptLoading ? (
              <div className="cd-skel" style={{ height: 360 }} />
            ) : (
              <PolarAreaChart items={radarItems} size={240} innerRadius={55} />
            )}
          </Card>
        </div>
      </Section>

      {/* ════════ CONSULTATION BESOINS PAR UP / DÉPARTEMENT ════════ */}
      <Section
        title="Consultation des besoins par UP / Département"
        subtitle="Ventilation des besoins de formation selon les structures organisationnelles"
        extra={
          <Select
            value={deptFilter}
            onChange={setDeptFilter}
            style={{ width: 200 }}
            placeholder="Filtrer par département"
            allowClear
            size="small"
          >
            <Select.Option value="all">Tous les départements</Select.Option>
            {departements.map((d) => (
              <Select.Option key={d} value={d}>{d}</Select.Option>
            ))}
          </Select>
        }
      >
        <div className="cd-grid cd-grid-2">
          <Card
            title="Besoins par département"
            subtitle={`${besoinsParDept.length} départements`}
            icon={<ApartmentOutlined />}
            iconColor="#0ea5e9"
            iconBg="rgba(14,165,233,0.12)"
          >
            {loading ? (
              <div className="cd-skel" style={{ height: 280 }} />
            ) : (
              <PolarAreaChart
                items={besoinsParDept.map((d) => ({
                  label: d.departement,
                  value: d.total,
                }))}
                size={220}
                innerRadius={50}
              />
            )}
          </Card>

          <Card
            title="Détail par département"
            subtitle="Total · Approuvés · En attente · Critiques"
            icon={<BarChartOutlined />}
            iconColor="#8b5cf6"
            iconBg="rgba(139,92,246,0.12)"
          >
            {loading ? (
              <div className="cd-skel" style={{ height: 280 }} />
            ) : (
              <div className="cd-dept-table">
                <div className="cd-dept-head">
                  <span>Département</span>
                  <span>Total</span>
                  <span>Approuvés</span>
                  <span>En attente</span>
                  <span>Critiques</span>
                </div>
                {besoinsParDept.slice(0, 8).map((d) => (
                  <div key={d.departement} className="cd-dept-row">
                    <span className="cd-dept-name">{d.departement}</span>
                    <span className="cd-dept-val">{d.total}</span>
                    <span className="cd-dept-val" style={{ color: semantic.success }}>{d.approuves}</span>
                    <span className="cd-dept-val" style={{ color: "#f59e0b" }}>{d.enAttente}</span>
                    <span className="cd-dept-val" style={{ color: semantic.error }}>{d.critiques}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* ════════ PRIORISATION DES BESOINS ════════ */}
      <Section
        title="Priorisation des besoins"
        subtitle="Urgence × impact stratégique — besoins non traités triés par score"
        extra={
          <Tag color="red" icon={<WarningOutlined />}>
            {filteredBesoinsPriorises.filter((b) => b.urgency >= 4 && b.impact >= 4).length} critiques
          </Tag>
        }
      >
        <Card
          title="Tableau de priorisation"
          subtitle={`${filteredBesoinsPriorises.length} besoins en attente · triés par score décroissant`}
          icon={<NodeIndexOutlined />}
          iconColor={semantic.error}
          iconBg={semantic.errorBg}
        >
          {filteredBesoinsPriorises.length === 0 ? (
            <Alert type="success" message="Aucun besoin en attente" showIcon style={{ borderRadius: 12 }} />
          ) : (
            <div className="cd-prio-table">
              <div className="cd-prio-head">
                <span>Besoin</span>
                <span>Département</span>
                <span>Priorité</span>
                <span>Urgence</span>
                <span>Impact</span>
                <span>Score</span>
                <span>Action</span>
              </div>
              {[...filteredBesoinsPriorises]
                .sort((a, b) => (b.urgency + b.impact) - (a.urgency + a.impact))
                .slice(0, 15)
                .map((b) => {
                  const score = b.urgency + b.impact;
                  const isCritical = b.urgency >= 4 && b.impact >= 4;
                  const isUrgent = b.urgency >= 4 || b.impact >= 4;
                  const actionLabel = isCritical ? "Immédiate" : b.urgency >= 4 ? "Planifier" : b.impact >= 4 ? "Surveiller" : "Réalisable";
                  const actionColor = isCritical ? semantic.error : b.urgency >= 4 ? "#f59e0b" : b.impact >= 4 ? "#3b82f6" : semantic.success;
                  const prioColor = b.priorite === "CRITIQUE" ? "red" : b.priorite === "HAUTE" ? "orange" : b.priorite === "MOYENNE" ? "gold" : "blue";
                  return (
                    <div key={b.id} className="cd-prio-row">
                      <span className="cd-prio-label" title={b.label}>{b.label}</span>
                      <span className="cd-prio-dept">{b.departement ?? "—"}</span>
                      <span className="cd-prio-prio"><Tag color={prioColor} style={{ fontSize: 10, lineHeight: "16px", padding: "0 6px", margin: 0 }}>{b.priorite}</Tag></span>
                      <span className="cd-prio-urg">
                        <span className="cd-prio-dots">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span key={i} className={`cd-prio-dot ${i <= b.urgency ? "active" : ""}`} style={{ background: i <= b.urgency ? "#f59e0b" : undefined }} />
                          ))}
                        </span>
                      </span>
                      <span className="cd-prio-imp">
                        <span className="cd-prio-dots">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span key={i} className={`cd-prio-dot ${i <= b.impact ? "active" : ""}`} style={{ background: i <= b.impact ? "#3b82f6" : undefined }} />
                          ))}
                        </span>
                      </span>
                      <span className="cd-prio-score" style={{ color: isCritical ? semantic.error : isUrgent ? "#f59e0b" : semantic.success }}>
                        {score}
                      </span>
                      <span className="cd-prio-action">
                        <span className="cd-prio-action-chip" style={{ background: `${actionColor}15`, color: actionColor, border: `1px solid ${actionColor}30` }}>
                          {actionLabel}
                        </span>
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </Section>

      {/* ════════ TAUX DE RÉUSSITE ════════ */}
      <Section
        title="Taux de réussite par département"
        subtitle="Performance des formations par structure organisationnelle"
        extra={
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Réussite: {kpis.tauxReussiteGlobal}%
          </Tag>
        }
      >
        <div className="cd-grid cd-grid-2">
          <Card
            title="Performance par département"
            subtitle="Réussite · En cours · Échec"
            icon={<RiseOutlined />}
            iconColor={semantic.success}
            iconBg={semantic.successBg}
            className="cd-card-wide"
          >
            {loading ? (
              <div className="cd-skel" style={{ height: 280 }} />
            ) : (
              <StackedProgress items={successByDept} height={32} />
            )}
          </Card>

          <Card
            title="Synthèse des taux"
            subtitle="Vue globale de la performance"
            icon={<PieChartOutlined />}
            iconColor="#6366f1"
            iconBg="rgba(99,102,241,0.12)"
          >
            <div className="cd-rate-summary">
              <div className="cd-rate-item">
                <div className="cd-rate-ring">
                  <ProgressRing value={kpis.tauxReussiteGlobal} color={semantic.success} size={90} />
                </div>
                <div className="cd-rate-text">
                  <span className="cd-rate-label">Réussite globale</span>
                  <span className="cd-rate-desc">{kpis.achevees} formations achevées sur {kpis.totalFormations}</span>
                </div>
              </div>
              <div className="cd-rate-item">
                <div className="cd-rate-ring">
                  <ProgressRing value={kpis.tauxParticipation} color="#0ea5e9" size={90} />
                </div>
                <div className="cd-rate-text">
                  <span className="cd-rate-label">Participation moyenne</span>
                  <span className="cd-rate-desc">Taux moyen de présence aux sessions</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ── Footer info ─────────────────────────────────────── */}
      <div className="cd-card" style={{ marginTop: 4 }}>
        <Alert
          type="info"
          showIcon
          message="Analyse prédictive détaillée"
          description="Pour la liste nominative des enseignants à risque, l'historique des alertes et les recommandations IA, consultez l'Analyse Prédictive."
          action={
            <Button type="primary" size="small" onClick={() => navigate("/home/AnalysePredictive")}>
              Ouvrir <RightOutlined />
            </Button>
          }
        />
      </div>
    </div>
  );
}

/* ── SegBars (rounded gradient + %) ──────────────────────────────────── */
function SegBars({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const sum = items.reduce((s, t) => s + t.value, 0);
  if (sum === 0) return <div style={{ color: "var(--cd-text-3)", fontSize: 13, textAlign: "center", padding: 10 }}>Aucune donnée de typage</div>;
  return (
    <div className="cd-bars">
      {items.map((t) => (
        <div key={t.label} className="cd-bar-row">
          <div className="cd-bar-head">
            <span className="cd-bar-label">{t.label}</span>
            <span className="cd-bar-val">{t.value} · {Math.round((t.value / sum) * 100)}%</span>
          </div>
          <div className="cd-bar-track">
            <span style={{ width: `${(t.value / sum) * 100}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}cc)` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── AreaLineChart (gradient, grille, tooltip au survol) ─────────────── */
function AreaLineChart({ data, color }: { data: Array<{ label: string; value: number }>; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <div style={{ color: "var(--cd-text-3)", fontSize: 13, textAlign: "center", padding: 10 }}>Aucune donnée</div>;
  const W = 600, H = 230, PL = 34, PR = 16, PT = 16, PB = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  const n = data.length;
  const x = (i: number) => PL + (n <= 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / niceMax);

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p0 = pts[i - 1], p1 = pts[i], mx = (p0.x + p1.x) / 2;
    line += ` C ${mx.toFixed(1)} ${p0.y.toFixed(1)}, ${mx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - PB} L ${x(0).toFixed(1)} ${H - PB} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => PT + (H - PT - PB) * t);
  const step = Math.max(1, Math.ceil(n / 7));
  const gid = `cd-la-${color.replace(/[^a-z0-9]/gi, "")}`;
  const hoverPt = hover != null && hover < n ? pts[hover] : null;
  return (
    <div className="cd-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
        onMouseMove={(e) => {
          const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
          if (!rect) return;
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0, bd = Infinity;
          for (let i = 0; i < n; i++) { const dd = Math.abs(x(i) - px); if (dd < bd) { bd = dd; best = i; } }
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((gy, i) => (
          <g key={i}>
            <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="var(--cd-border)" strokeWidth={1} />
            <text x={PL - 7} y={gy + 3} textAnchor="end" fontSize="10" fill="var(--cd-text-3)">{Math.round(niceMax * (1 - i / 4))}</text>
          </g>
        ))}
        {hover != null && hoverPt && (
          <line x1={hoverPt.x} y1={PT} x2={hoverPt.x} y2={H - PB} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.06))" }} />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={hover === i ? 5 : 3} fill="#fff" stroke={color} strokeWidth={2} style={{ transition: "r .15s ease" }} />
        ))}
        {hover != null && hover < n && (
          <g style={{ pointerEvents: "none" }}>
            <rect x={x(hover) - 32} y={y(data[hover].value) - 30} width="64" height="22" rx="5" fill="var(--cd-text)" />
            <text x={x(hover)} y={y(data[hover].value) - 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{data[hover].value}</text>
          </g>
        )}
        {data.map((d, i) => (i % step === 0 || i === n - 1) ? (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--cd-text-3)">{d.label}</text>
        ) : null)}
      </svg>
      {hover != null && (
        <div className="cd-chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: 4 }}>
          <div className="cd-tip-date">{data[hover].label}</div>
          <div className="cd-tip-row">{data[hover].value} formations</div>
        </div>
      )}
    </div>
  );
}

/* ── ProgressRing (inline SVG) ─────────────────────────── */
function ProgressRing({ value, color, size = 90 }: { value: number; color: string; size?: number }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r, cx = size / 2, cy = size / 2;
  const frac = Math.max(0, Math.min(1, value / 100));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rd-surface-3, #eef2f7)" strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${frac * c} ${c - frac * c}`} transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray .8s cubic-bezier(.4,0,.2,1)" }} />
      <text x={cx} y={cy + 1} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--rd-text, #0f172a)">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

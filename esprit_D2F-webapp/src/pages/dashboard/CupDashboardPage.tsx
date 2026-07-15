import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Tag, Alert, Input, Statistic, Table, Segmented, Progress,
  Tooltip, Breadcrumb, Avatar, Badge,
} from "antd";
import {
  ReloadOutlined, PlusOutlined, BellOutlined, SearchOutlined, BookOutlined,
  TeamOutlined, CheckCircleOutlined, SafetyCertificateOutlined, RiseOutlined,
  ApartmentOutlined, ThunderboltOutlined, RightOutlined,
  NodeIndexOutlined, CalendarOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import { useCupDashboard } from "@/hooks/dashboard/useCupDashboard";
import { brand } from "@/styles/themes/tokens";
import { Card } from "@/redesign/components/Section";
import "@/pages/dashboard/CupDashboardPage.css";

dayjs.locale("fr");

const ACCENT = brand[500];

const pct = (v: number | null) => Math.max(0, Math.min(100, Math.round(v ?? 0)));

type PeriodKey = "30j" | "trimestre" | "semestre" | "annee";

const MOCK_INSCRIPTIONS_ATTENTE = 14;
const MOCK_FORMATIONS_A_VENIR = [
  { id: "f1", date: "12 oct.", title: "Python pour la data scientifique", inscrits: 24, capacite: 30, statut: "Planifiée" },
  { id: "f2", date: "18 oct.", title: "Approche pédagogique active", inscrits: 18, capacite: 20, statut: "Planifiée" },
  { id: "f3", date: "23 oct.", title: "Sécurité numérique", inscrits: 11, capacite: 25, statut: "Réservée" },
  { id: "f4", date: "02 nov.", title: "Anglais académique", inscrits: 9, capacite: 15, statut: "Planifiée" },
];

export default function CupDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("annee");
  const [besoinSearch, setBesoinSearch] = useState("");

  const {
    kpis, topCompetences, besoinsPriorises,
    loading, formationsByType, formationsByTypeLoading, timeline, timelineLoading,
  } = useCupDashboard();

  const displayName = user?.username ?? user?.email ?? "Utilisateur";
  const initials = displayName.split(/[\s.]+/).filter(Boolean).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const updateLabel = dayjs().format("DD MMM YYYY à HH:mm");
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function handleRefresh() {
    setRefreshing(true);
    try { await new Promise((r) => setTimeout(r, 500)); }
    finally { setRefreshing(false); }
  }

  const actionCount = (kpis.pendingBesoins ?? 0) + MOCK_INSCRIPTIONS_ATTENTE + (kpis.critiques ?? 0);

  const typeItems = useMemo(() => [
    { label: "Interne", value: formationsByType?.interne ?? 0, color: "#c1121f" },
    { label: "Externe", value: formationsByType?.externe ?? 0, color: "#2563eb" },
    { label: "En ligne", value: formationsByType?.enLigne ?? 0, color: "#0e7490" },
  ], [formationsByType]);

  const periodMonths: Record<PeriodKey, number> = { "30j": 2, trimestre: 3, semestre: 6, annee: 12 };
  const periodLabel: Record<PeriodKey, string> = {
    "30j": "30 derniers jours", trimestre: "ce trimestre", semestre: "ce semestre", annee: "12 derniers mois",
  };
  const chartData = useMemo(() => {
    const all = (timeline?.periodes ?? []).map((p) => ({ label: p.label, value: p.nombreFormations }));
    return all.slice(-periodMonths[period]);
  }, [timeline, period]);

  const besoinsTri = useMemo(() => {
    const q = besoinSearch.trim().toLowerCase();
    return [...besoinsPriorises]
      .filter((b) =>
        !q || (b.label ?? "").toLowerCase().includes(q) || (b.departement ?? "").toLowerCase().includes(q))
      .sort((a, b) => (b.urgency + b.impact) - (a.urgency + a.impact))
      .slice(0, 6);
  }, [besoinsPriorises, besoinSearch]);

  const top5 = useMemo(() => topCompetences.slice(0, 5), [topCompetences]);
  const coverageFor = (i: number) => Math.max(28, 92 - i * 14);

  const kpiList = [
    { id: "actives", label: "Formations actives", value: kpis.enCours ?? 0, suffix: "", delta: "+12 %", up: true, tone: "navy" as const, icon: <BookOutlined />, detail: { label: "Voir les formations", onClick: () => navigate("/home/Formation") }, spark: [4, 6, 5, 8, 7, 10, 9, 12] },
    { id: "insc", label: "Inscriptions en attente", value: MOCK_INSCRIPTIONS_ATTENTE, suffix: "", delta: "+5 %", up: true, tone: "orange" as const, icon: <TeamOutlined />, detail: { label: "Gérer les inscriptions", onClick: () => scrollTo("cd-suivi") }, spark: [10, 9, 11, 8, 12, 13, 12, 14] },
    { id: "completion", label: "Taux de complétion moyen", value: pct(kpis.tauxReussiteGlobal), suffix: "%", delta: "+8,4 %", up: true, tone: "green" as const, icon: <CheckCircleOutlined />, detail: { label: "Détail complétion", onClick: () => scrollTo("cd-couverture") }, spark: [60, 64, 63, 68, 70, 72, 74, 76] },
    { id: "couv", label: "Taux de couverture des compétences", value: pct(kpis.couverture), suffix: "%", delta: "+3,1 %", up: true, tone: "blue" as const, icon: <SafetyCertificateOutlined />, detail: { label: "Voir le référentiel", onClick: () => scrollTo("cd-couverture") }, spark: [70, 72, 71, 74, 76, 78, 80, 82] },
  ];

  const besoinCols = [
    { title: "Priorité", dataIndex: "priorite", key: "priorite", width: 110, render: (v: string) => <Tag color={v === "CRITIQUE" ? "red" : v === "HAUTE" ? "orange" : v === "MOYENNE" ? "gold" : "blue"}>{v}</Tag> },
    { title: "Thème / Besoin", dataIndex: "label", key: "label", ellipsis: true },
    { title: "Groupe / UP", dataIndex: "departement", key: "departement", render: (v: string) => v ?? "—" },
    { title: "Approbation", key: "app", width: 140, render: (_: unknown, r: typeof besoinsPriorises[number]) => <Tag color={r.urgency >= 4 ? "volcano" : "default"}>{r.urgency >= 4 ? "Urgent" : "À planifier"}</Tag> },
    { title: "Action", key: "act", width: 110, render: () => <Button size="small" type="primary" ghost onClick={() => scrollTo("cd-suivi")}>Traiter</Button> },
  ] as any[];

  const formCols = [
    { title: "Date", dataIndex: "date", key: "date", width: 88 },
    { title: "Formation", dataIndex: "title", key: "title", ellipsis: true },
    { title: "Inscrits", key: "insc", width: 86, render: (_: unknown, r: typeof MOCK_FORMATIONS_A_VENIR[number]) => `${r.inscrits}/${r.capacite}` },
    { title: "Remplissage", key: "fill", width: 160, render: (_: unknown, r: typeof MOCK_FORMATIONS_A_VENIR[number]) => <Progress percent={Math.round((r.inscrits / r.capacite) * 100)} size="small" /> },
    { title: "Statut", dataIndex: "statut", key: "statut", width: 110, render: (v: string) => <Tag color={v === "Planifiée" ? "blue" : v === "Réservée" ? "purple" : "default"}>{v}</Tag> },
  ] as any[];

  return (
    <div className="cd">
      {/* ── Topbar (propre, sticky, breadcrumb) ─────────────── */}
      <header className="cd-topbar">
        <div className="cd-topbar-left">
          <Breadcrumb
            separator="/"
            items={[{ title: "Accueil" }, { title: "Tableau de bord" }]}
          />
          <div className="cd-topbar-titles">
            <h1 className="cd-page-title">Tableau de bord CUP</h1>
            <p className="cd-page-sub">Vue consolidée de votre unité pédagogique</p>
          </div>
        </div>
        <div className="cd-topbar-right">
          <span className="cd-update"><ClockCircleOutlined /> Mise à jour : {updateLabel}</span>
          <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing}>Actualiser</Button>
          <Badge count={kpis.pendingBesoins ?? 0} size="small" offset={[-2, 2]}>
            <Button shape="circle" icon={<BellOutlined />} />
          </Badge>
          <Tooltip title={displayName}>
            <Avatar className="cd-avatar">{initials}</Avatar>
          </Tooltip>
        </div>
      </header>

      {/* ── Zone action prioritaire ─────────────────────────── */}
      <section className="cd-priority">
        <div className="cd-priority-main">
          <span className="cd-priority-dot" />
          <div>
            <div className="cd-priority-title">{actionCount} actions nécessitent votre attention</div>
            <div className="cd-priority-sub">Besoins en attente, inscriptions et formations à planifier dans votre unité.</div>
          </div>
        </div>
        <div className="cd-priority-stats">
          <div className="cd-pstat"><span className="cd-pstat-val">{kpis.pendingBesoins ?? 0}</span><span className="cd-pstat-lbl">Besoins en attente</span></div>
          <div className="cd-pstat"><span className="cd-pstat-val">{MOCK_FORMATIONS_A_VENIR.length}</span><span className="cd-pstat-lbl">Formations à venir</span></div>
          <div className="cd-pstat"><span className="cd-pstat-val">{MOCK_INSCRIPTIONS_ATTENTE}</span><span className="cd-pstat-lbl">Inscriptions à valider</span></div>
        </div>
        <div className="cd-priority-cta">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/home/Formation")}>Créer une formation</Button>
          <Button onClick={() => scrollTo("cd-suivi")}>Consulter les besoins</Button>
        </div>
      </section>

      {/* ── KPI principaux ──────────────────────────────────── */}
      <section className="cd-kpis">
        {kpiList.map((k) => (
          <KpiTile key={k.id} {...k} />
        ))}
      </section>

      {/* ── Activité des formations ─────────────────────────── */}
      <Section index={1} id="cd-activite" title="Activité des formations" subtitle="Répartition par type et évolution mensuelle de l'unité pédagogique">
        <Card
          className="cd-span-5"
          title="Répartition par type"
          subtitle="Interne · Externe · En ligne"
          icon={<ApartmentOutlined />}
          iconColor="#2563eb"
          iconBg="rgba(37,99,235,.12)"
          loading={formationsByTypeLoading}
        >
          <SegBars items={typeItems} />
        </Card>
        <Card
          className="cd-span-7"
          title="Évolution mensuelle"
          subtitle={`${timeline?.totalFormations ?? 0} formations · ${periodLabel[period]}`}
          icon={<RiseOutlined />}
          iconColor="#0e7490"
          iconBg="rgba(14,116,144,.12)"
          loading={timelineLoading}
          extra={
            <Segmented
              size="small"
              value={period}
              onChange={(v) => setPeriod(v as PeriodKey)}
              options={[
                { label: "30 j", value: "30j" },
                { label: "Trimestre", value: "trimestre" },
                { label: "Semestre", value: "semestre" },
                { label: "Année", value: "annee" },
              ]}
            />
          }
        >
          <AreaLineChart data={chartData} color={ACCENT} />
        </Card>
      </Section>

      {/* ── Suivi opérationnel ─────────────────────────────── */}
      <Section index={2} id="cd-suivi" title="Suivi opérationnel" subtitle="Formations à venir et besoins à traiter">
        <Card
          className="cd-span-6"
          title="Prochaines formations"
          subtitle={`${MOCK_FORMATIONS_A_VENIR.length} planifiées`}
          icon={<CalendarOutlined />}
          iconColor="#2563eb"
          iconBg="rgba(37,99,235,.12)"
        >
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            columns={formCols}
            dataSource={MOCK_FORMATIONS_A_VENIR}
          />
        </Card>
        <Card
          className="cd-span-6"
          title="Besoins à traiter"
          subtitle={`${besoinsPriorises.length} besoins · triés par priorité`}
          icon={<NodeIndexOutlined />}
          iconColor="#c1121f"
          iconBg="rgba(193,18,31,.10)"
          extra={
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined />}
              placeholder="Rechercher"
              value={besoinSearch}
              onChange={(e) => setBesoinSearch(e.target.value)}
              style={{ width: 180 }}
            />
          }
        >
          <Table
            rowKey="id"
            size="middle"
            pagination={false}
            loading={loading}
            columns={besoinCols}
            dataSource={besoinsTri}
          />
        </Card>
      </Section>

      {/* ── Couverture et compétences ──────────────────────── */}
      <Section index={3} id="cd-couverture" title="Couverture et compétences" subtitle="Niveau de couverture de l'UP et compétences à renforcer">
        <Card
          className="cd-span-5"
          title="Couverture globale"
          subtitle="Part des compétences au niveau requis"
          icon={<SafetyCertificateOutlined />}
          iconColor="#16a34a"
          iconBg="rgba(22,163,74,.12)"
        >
          <div className="cd-coverage-global">
            <Progress type="dashboard" percent={pct(kpis.couverture)} strokeColor="#16a34a" />
            <div className="cd-coverage-global-note">
              <div className="cd-coverage-global-val">{pct(kpis.couverture)} %</div>
              <div className="cd-coverage-global-lbl">des compétences de l'UP sont couvertes au niveau requis.</div>
              <Button size="small" type="link" icon={<RightOutlined />} onClick={() => navigate("/home/competences")}>Voir le référentiel</Button>
            </div>
          </div>
        </Card>
        <Card
          className="cd-span-7"
          title="Top 5 compétences à renforcer"
          subtitle="Les plus demandées et les moins couvertes"
          icon={<ThunderboltOutlined />}
          iconColor="#ea580c"
          iconBg="rgba(234,88,12,.12)"
        >
          <ol className="cd-coverage-list">
            {top5.map((c, i) => (
              <li key={c.name} className="cd-coverage-item">
                <span className="cd-coverage-rank">{i + 1}</span>
                <div className="cd-coverage-main">
                  <div className="cd-coverage-name">{c.name}</div>
                  <div className="cd-coverage-meta">
                    <Tag color={i < 2 ? "red" : "orange"}>{i < 2 ? "HAUTE" : "MOYENNE"}</Tag>
                    <span>{c.count} enseignants impactés</span>
                  </div>
                  <Progress percent={coverageFor(i)} size="small" strokeColor="#ea580c" />
                </div>
                <Button size="small" onClick={() => navigate("/home/Formation")}>Planifier</Button>
              </li>
            ))}
          </ol>
        </Card>
      </Section>

      {/* ── Analyse prédictive ─────────────────────────────── */}
      <Section title="Analyse prédictive">
        <Card className="cd-span-12" title={undefined}>
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
        </Card>
      </Section>
    </div>
  );
}

/* ── Section (titre + corps en grille 12 col + index) ─────────────── */
function Section({
  id, index, title, subtitle, extra, children,
}: {
  id?: string;
  index?: number;
  title: string;
  subtitle?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rd-section" id={id}>
      <div className="rd-section-head">
        <div className="rd-section-titles">
          {index != null && <span className="cup-sec-idx">{String(index).padStart(2, "0")}</span>}
          <div>
            <h2 className="rd-section-title">{title}</h2>
            {subtitle && <p className="rd-section-sub">{subtitle}</p>}
          </div>
        </div>
        {extra}
      </div>
      <div className="cd-sec-body">{children}</div>
    </section>
  );
}

/* ── KPI tile (valeur dominante + delta + sparkline + lien) ──────── */
function KpiTile({
  label, value, suffix, delta, up, tone, icon, detail, spark,
}: {
  label: string;
  value: number;
  suffix: string;
  delta: string;
  up: boolean;
  tone: "navy" | "orange" | "green" | "blue";
  icon: ReactNode;
  detail: { label: string; onClick: () => void };
  spark: number[];
}) {
  const color = tone === "green" ? "#16a34a" : tone === "orange" ? "#ea580c" : tone === "blue" ? "#2563eb" : "#102a43";
  return (
    <div className={`cup-kpi cup-kpi--${tone}`}>
      <div className="cup-kpi-top">
        <span className="cup-kpi-label">{label}</span>
        <Tooltip title={label}>
          <span className="cup-kpi-ic" style={{ color, background: `${color}14` }}>{icon}</span>
        </Tooltip>
      </div>
      <div className="cup-kpi-val">
        <Statistic value={value} suffix={suffix ? ` ${suffix}` : ""} valueStyle={{ color: "#0f2740", fontWeight: 800, fontSize: 30, letterSpacing: "-.02em" }} />
      </div>
      <div className="cup-kpi-foot">
        <span className={`cup-delta ${up ? "up" : "down"}`}>{up ? "▲" : "▼"} {delta}</span>
        <span className="cup-delta-note">vs préc.</span>
        <Sparkline data={spark} tone={tone} />
      </div>
      <a className="cup-kpi-link" onClick={detail.onClick}>{detail.label} <RightOutlined /></a>
    </div>
  );
}

/* ── Sparkline (mini courbe SVG) ─────────────────────────────── */
function Sparkline({ data, tone }: { data: number[]; tone: string }) {
  const w = 76, h = 26;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(" ");
  const color = tone === "green" ? "#16a34a" : tone === "orange" ? "#ea580c" : tone === "blue" ? "#2563eb" : "#102a43";
  return (
    <svg className="cup-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── SegBars (rounded gradient + %) ──────────────────────────── */
function SegBars({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const sum = items.reduce((s, t) => s + t.value, 0);
  if (sum === 0) return <div className="cup-empty">Aucune donnée de typage</div>;
  const max = Math.max(1, ...items.map((t) => t.value));
  return (
    <div className="cd-bars">
      {items.map((t) => {
        const pct = (t.value / sum) * 100;
        return (
          <div key={t.label} className="cd-bar-row">
            <div className="cd-bar-head">
              <span className="cd-bar-label">
                <span className="cd-bar-icn" style={{ background: t.color }} />
                {t.label}
              </span>
              <span className="cd-bar-val"><b>{t.value}</b> · {Math.round(pct)}%</span>
            </div>
            <div className="cd-bar-track">
              <span
                className="cd-bar-fill"
                style={{ width: `${(t.value / max) * 100}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}aa)` }}
              >
                <span className="cd-bar-fill-pct">{Math.round(pct)}%</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── AreaLineChart (courbe lissée + aire + tooltip) ───────────── */
function buildSmoothPath(pts: ReadonlyArray<readonly [number, number]>) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const t = 0.16;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function AreaLineChart({ data, color = ACCENT }: { data: Array<{ label: string; value: number }>; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <div className="cup-empty">Aucune donnée</div>;

  const W = 640, H = 260, PL = 40, PR = 20, PT = 22, PB = 38;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const n = data.length;
  const innerW = W - PL - PR, innerH = H - PT - PB;
  const x = (i: number) => PL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PT + innerH * (1 - v / niceMax);

  const px = data.map((d, i) => [x(i), y(d.value)] as const);
  const line = buildSmoothPath(px);
  const area = `${line} L ${x(n - 1).toFixed(1)} ${PT + innerH} L ${x(0).toFixed(1)} ${PT + innerH} Z`;

  const fmtX = (label: string) => {
    const d = dayjs(label);
    if (!d.isValid()) return label;
    const s = d.format("MMM YYYY");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const step = Math.max(1, Math.ceil(n / 6));
  const gid = `cd-la-${color.replace(/[^a-z0-9]/gi, "")}`;
  const hoverPt = hover != null && hover < n ? px[hover] : null;

  return (
    <div className="cd-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pxr = ((e.clientX - rect.left) / rect.width) * W;
          const ratio = (pxr - PL) / innerW;
          setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.30} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((i) => {
          const gy = PT + (innerH * i) / 4;
          const vy = Math.round(niceMax * (1 - i / 4));
          return (
            <g key={i}>
              <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="var(--cd-border)" strokeWidth={1} />
              <text x={PL - 8} y={gy + 3} textAnchor="end" fontSize="9" fontWeight={600} fill="var(--cd-ink-3)">{vy}</text>
            </g>
          );
        })}

        {hoverPt && <line x1={hoverPt[0]} y1={PT} x2={hoverPt[0]} y2={PT + innerH} stroke={color} strokeWidth={1} strokeDasharray="3 4" opacity={0.4} />}

        <path d={area} fill={`url(#${gid})`} className="cd-line-area" />
        <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="cd-line-draw" />

        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={hover === i ? 5 : 3} fill="#fff" stroke={color} strokeWidth={2} style={{ transition: "r .15s ease" }} />
        ))}

        {hover != null && hoverPt && (() => {
          const boxX = Math.max(PL, Math.min(hoverPt[0] - 52, W - PR - 104));
          const boxY = Math.max(PT - 4, hoverPt[1] - 46);
          return (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={hoverPt[0]} cy={hoverPt[1]} r={9} fill={color} opacity={0.16} />
              <circle cx={hoverPt[0]} cy={hoverPt[1]} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
              <rect x={boxX} y={boxY} width={104} height={34} rx={9} fill="#0f2740" opacity={0.94} />
              <text x={boxX + 52} y={boxY + 14} textAnchor="middle" fontSize="11" fontWeight={700} fill="#fff">{data[hover].value} formations</text>
              <text x={boxX + 52} y={boxY + 27} textAnchor="middle" fontSize="9" fill="#cbd5e1">{fmtX(data[hover].label)}</text>
            </g>
          );
        })()}

        {data.map((d, i) => (i % step === 0 || i === n - 1) ? (
          <text key={i} x={x(i)} y={H - 12} textAnchor="middle" fontSize="9" fontWeight={600} fill="var(--cd-ink-3)">{fmtX(d.label)}</text>
        ) : null)}
      </svg>
      <div className="cd-line-legend"><span className="cd-line-dot" style={{ background: color }} /> Formations créées par mois</div>
    </div>
  );
}

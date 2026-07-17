import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row, Col, Select, Alert, Empty, Tag, Button, Spin, Tooltip, Modal,
  Segmented, message, DatePicker,
} from "antd";
import {
  TeamOutlined, AlertOutlined, LineChartOutlined, WarningOutlined,
  DashboardOutlined, ReloadOutlined, ClockCircleOutlined, HeatMapOutlined,
  TrophyOutlined, SafetyCertificateOutlined, RiseOutlined, FallOutlined,
  InfoCircleOutlined, DownloadOutlined, ArrowDownOutlined,
  FilePdfOutlined, BulbOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  useDashboard,
  useAtRisk,
  useAlerts,
  useUpdateAlert,
  useDecliningSkills,
} from "../hooks/useAnalyticsQueries";
import { analyticsApi } from "../services/analyticsApi";
import {
  AtRiskTeachersTable, DecliningSkillsChart, RiskDistributionChart,
  TrendChart, Heatmap, AlertCenter,
} from "../components";
import type { DashboardFilters, NiveauRisque, AtRiskTeacher, HeatmapCell, TopFormation } from "../types";
import { formatDepartment, formatUP, toCsv, downloadCsv } from "../utils/format";
import "./analyticsDashboard.redesign.css";

const { RangePicker } = DatePicker;

/* ── Définitions métier des KPI (affichées en tooltip) ──────── */
const KPI_DEFS: Record<string, string> = {
  "Enseignants monitorés": "Enseignants réellement monitorés (présents dans la couverture des compétences ou ayant au moins un gap calculé sur la fenêtre).",
  "Indice de risque moyen": "Score 0–1 du modèle multi-facteurs (absence de formation, stagnation, gaps critiques, besoins non couverts). Seuils : < 0,25 Faible · 0,25–0,5 Modéré · 0,5–0,75 Élevé · ≥ 0,75 Critique.",
  "Gaps critiques (≥ 0,7)": "Nombre d'écarts sévères (écart ≥ 0,7) sur la fenêtre sélectionnée (30 j par défaut).",
  "Alertes nouvelles": "Alertes non traitées (NOUVELLE/LUE) créées sur la fenêtre.",
  "Taux de couverture": "Part des couples (enseignant × compétence) déjà au niveau requis, tous départements confondus.",
  "En régression": "Enseignants ayant au moins un gap marqué en régression sur la fenêtre.",
  "En stagnation (≥ 3 mois)": "Enseignants sans progression depuis ≥ 3 mois (sur la fenêtre).",
  "Besoins critiques non satisfaits": "Gaps d'urgence CRITIQUE non satisfaits sur la fenêtre.",
  "Alertes critiques ouvertes": "Alertes de sévérité CRITICAL encore non traitées.",
};

/* ── Petite carte KPI « riche » (dégradé + bulle d'icône) ──────── */
function RichKpi({
  title, value, icon, tone, hint, loading, tooltip, onClick,
}: {
  readonly title: string;
  readonly value: ReactNode;
  readonly icon: ReactNode;
  readonly tone: "primary" | "warning" | "danger" | "info" | "success";
  readonly hint?: string;
  readonly loading?: boolean;
  readonly tooltip?: string;
  readonly onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        className={`ad-kpi ad-kpi--${tone} ad-kpi--clickable`}
        onClick={onClick}
      >
        <div className="ad-kpi__icon">{icon}</div>
        <div className="ad-kpi__body">
          <div className="ad-kpi__title">
            {title}
            {tooltip && (
              <Tooltip title={tooltip}>
                <InfoCircleOutlined style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }} />
              </Tooltip>
            )}
          </div>
          {loading
            ? <div className="ad-kpi__value" style={{ opacity: 0.5 }}>···</div>
            : <div className="ad-kpi__value">{value}</div>}
          {hint && <div className="ad-kpi__hint">{hint}</div>}
        </div>
      </button>
    );
  }
  return (
    <div className={`ad-kpi ad-kpi--${tone}`}>
      <div className="ad-kpi__icon">{icon}</div>
      <div className="ad-kpi__body">
        <div className="ad-kpi__title">
          {title}
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }} />
            </Tooltip>
          )}
        </div>
        {loading
          ? <div className="ad-kpi__value" style={{ opacity: 0.5 }}>···</div>
          : <div className="ad-kpi__value">{value}</div>}
        {hint && <div className="ad-kpi__hint">{hint}</div>}
      </div>
    </div>
  );
}

/* ── Section « glass » réutilisable ──────────────────────────── */
function Section({
  title, icon, extra, children, loading, id,
}: {
  readonly title: string;
  readonly icon?: ReactNode;
  readonly extra?: ReactNode;
  readonly children: ReactNode;
  readonly loading?: boolean;
  readonly id?: string;
}) {
  return (
    <div className="ad-card" id={id}>
      <div className="ad-card__head">
        <span className="ad-card__title">
          <span className="ad-dot" />
          {icon} {title}
        </span>
        {extra}
      </div>
      {loading ? <div className="ad-loading"><Spin size="large" /></div> : children}
    </div>
  );
}

const WINDOWS: { label: string; days: number }[] = [
  { label: "7 j", days: 7 },
  { label: "30 j", days: 30 },
  { label: "Trimestre", days: 90 },
  { label: "Semestre", days: 180 },
];

/**
 * Dashboard global décisionnel (ADMIN / CUP) — version pilotage.
 * Filtres département / UP / niveau / temporel (réels), drill-down heatmap,
 * alertes groupées, recommandations enrichies, export CSV.
 */
export default function AnalyticsDashboardPage() {
  const [windowDays, setWindowDays] = useState<number>(30);
  const [range, setRange] = useState<[string, string] | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [methodOpen, setMethodOpen] = useState(false);
  const [drill, setDrill] = useState<{ departement: string; competenceId: number; competenceNom: string } | null>(null);

  /** Drill-down (F4) : un KPI ouvre la section pertinente du dashboard. */
  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const navigate = useNavigate();

  // Fenêtre temporelle → params ISO envoyés au backend.
  const periode = useMemo(() => {
    if (range) return { periode_debut: range[0], periode_fin: range[1] };
    const fin = new Date();
    const debut = new Date(fin.getTime() - windowDays * 86400000);
    return { periode_debut: debut.toISOString(), periode_fin: fin.toISOString() };
  }, [windowDays, range]);

  const dashboard = useDashboard({ ...filters, ...periode });
  const atRisk = useAtRisk({ ...filters, ...periode });
  const alerts = useAlerts({ departement_id: filters.departement_id, size: 100 });
  const updateAlert = useUpdateAlert();
  const declining = useDecliningSkills(filters);
  const data = dashboard.data;
  const kpis = data?.kpis;

  const hasRiskData =
    (data?.enseignants_a_risque?.length ?? 0) > 0 ||
    (kpis?.nb_profils_risque ?? 0) > 0;
  const hasGaps = (data?.heatmap?.length ?? 0) > 0 || (data?.alertes_recentes?.length ?? 0) > 0;

  const departmentOptions = useMemo(() => {
    const seen = new Set<string>();
    const add = (d?: string | null) => {
      if (d && d !== "non_affecte" && d !== "NON_AFFECTE") seen.add(d);
    };
    (data?.heatmap ?? []).forEach((h) => add(h.departement));
    (atRisk.data ?? []).forEach((t) => add(t.departement));
    return Array.from(seen).sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: formatDepartment(v) }));
  }, [data?.heatmap, atRisk.data]);

  const upOptions = useMemo(() => {
    const seen = new Set<string>();
    (atRisk.data ?? []).forEach((t) => { if (t.up && t.up !== "non_affecte") seen.add(t.up); });
    return Array.from(seen).sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: formatUP(v) }));
  }, [atRisk.data]);

  const filteredAtRisk = useMemo<AtRiskTeacher[]>(() => {
    return (atRisk.data ?? []).filter((t) =>
      (!filters.departement_id || t.departement === filters.departement_id) &&
      (!filters.up_id || t.up === filters.up_id) &&
      (!filters.niveau_risque || t.niveau_risque === filters.niveau_risque),
    );
  }, [atRisk.data, filters.departement_id, filters.up_id, filters.niveau_risque]);

  const filteredHeatmap = useMemo<HeatmapCell[]>(() => {
    return (data?.heatmap ?? []).filter(
      (h) =>
        h.departement && h.departement !== "non_affecte" &&
        (!filters.departement_id || h.departement === filters.departement_id),
    );
  }, [data?.heatmap, filters.departement_id]);

  const filteredDistribution = useMemo(() => {
    const dist: Record<string, number> = { FAIBLE: 0, MODERE: 0, ELEVE: 0, CRITIQUE: 0 };
    filteredAtRisk.forEach((t) => { dist[t.niveau_risque] = (dist[t.niveau_risque] ?? 0) + 1; });
    return (Object.keys(dist) as NiveauRisque[]).map((niveau) => ({ niveau, count: dist[niveau] }));
  }, [filteredAtRisk]);

  const filteredRiskKpis = useMemo(() => {
    const list = filteredAtRisk;
    const nb = list.length;
    const scoreMoyen = nb ? list.reduce((s, t) => s + t.score_risque, 0) / nb : 0;
    const gapsCritiques = list.reduce((s, t) => s + t.nb_gaps_critiques, 0);
    return { nb, scoreMoyen, gapsCritiques };
  }, [filteredAtRisk]);

  // Drill-down heatmap → enseignants impactés.
  const drillQuery = useQuery({
    queryKey: ["analytics", "cell", drill?.departement, drill?.competenceId],
    enabled: !!drill,
    queryFn: () => analyticsApi.getTeachersByCell(drill!.departement, drill!.competenceId, 50),
  });

  const onRefresh = () => { dashboard.refetch(); atRisk.refetch(); };

  const onExportPdf = () => window.print();

  const onExport = () => {
    const rows = [
      { indicateur: "Enseignants monitorés", valeur: kpis?.nb_enseignants_suivis ?? 0 },
      { indicateur: "Indice de risque moyen", valeur: (kpis?.score_risque_moyen ?? 0).toFixed(2) },
      { indicateur: "Gaps critiques (≥ 0,7)", valeur: kpis?.nb_gaps_critiques ?? 0 },
      { indicateur: "Alertes nouvelles", valeur: kpis?.nb_alertes_nouvelles ?? 0 },
      { indicateur: "Taux de couverture (%)", valeur: kpis?.taux_couverture_global ?? 0 },
      { indicateur: "En régression", valeur: kpis?.nb_regression ?? 0 },
      { indicateur: "En stagnation (≥ 3 mois)", valeur: kpis?.nb_stagnation ?? 0 },
      { indicateur: "Besoins critiques non satisfaits", valeur: kpis?.besoins_critiques_non_satisfaits ?? 0 },
      { indicateur: "Alertes critiques ouvertes", valeur: kpis?.alertes_critiques_ouvertes ?? 0 },
    ];
    downloadCsv("dashboard-analytique.csv", toCsv(rows, ["indicateur", "valeur"]));
    message.success("Export CSV généré");
  };

  return (
    <div className="ad-page" data-theme={theme}>
      <header className="ad-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <DashboardOutlined className="ad-header__icon" />
          <div className="ad-header__titles">
            <span className="ad-header__title">Tableau de bord analytique</span>
            <span className="ad-header__subtitle">Pilotage du développement professionnel des enseignants</span>
          </div>
        </div>
        <div className="ad-header__actions">
          {data?.generated_at && (
            <Tooltip title="Date du dernier recalcul du snapshot (cache ≤ 6 h)">
              <span className="ad-header__updated">
                <ClockCircleOutlined /> Recalcul : {data.generated_at}
              </span>
            </Tooltip>
          )}
          <Button type="text" icon={<InfoCircleOutlined />} onClick={() => setMethodOpen(true)} style={{ color: "#fff" }}>
            Méthodologie
          </Button>
          <Button type="text" icon={<BulbOutlined />} onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))} style={{ color: "#fff" }}>
            {theme === "light" ? "Mode sombre" : "Mode clair"}
          </Button>
          <Button className="ad-refresh-btn" icon={<FilePdfOutlined />} onClick={onExportPdf}>
            Export PDF
          </Button>
          <Button className="ad-refresh-btn" icon={<DownloadOutlined />} onClick={onExport}>
            Export CSV
          </Button>
          <Button className="ad-refresh-btn" icon={<LineChartOutlined />} onClick={() => navigate("/home/analytics/pilotage")}>
            Prévision
          </Button>
          <Button
            className="ad-refresh-btn"
            icon={<ReloadOutlined />}
            loading={dashboard.isFetching || atRisk.isFetching}
            onClick={onRefresh}
          >
            Actualiser
          </Button>
        </div>
      </header>

      {dashboard.isError && (
        <Alert type="error" showIcon message="Impossible de charger le dashboard." style={{ marginBottom: 16, borderRadius: 12 }} />
      )}

      {/* ── Barre de filtres ─────────────── */}
      <div className="ad-filters">
        <span className="ad-filters__label">Filtres</span>
        <Segmented
          value={range ? "custom" : String(windowDays)}
          onChange={(v) => {
            if (v === "custom") return;
            setRange(null);
            setWindowDays(Number(v));
          }}
          options={[
            ...WINDOWS.map((w) => ({ label: w.label, value: String(w.days) })),
            { label: "Période…", value: "custom" },
          ]}
        />
        {range && (
          <RangePicker
            value={range as any}
            onChange={(dates) =>
              setRange(dates?.[0] && dates?.[1]
                ? [dates[0].toISOString(), dates[1].toISOString()]
                : null)
            }
          />
        )}
        <Select
          allowClear placeholder="Département" className="ad-filter-select"
          value={filters.departement_id}
          onChange={(v) => setFilters((f) => ({ ...f, departement_id: v }))}
          options={departmentOptions} notFoundContent="Aucun département"
        />
        <Select
          allowClear placeholder="UP" className="ad-filter-select"
          value={filters.up_id}
          onChange={(v) => setFilters((f) => ({ ...f, up_id: v }))}
          options={upOptions} notFoundContent="Aucune UP"
        />
        <Select
          allowClear placeholder="Niveau de risque" className="ad-filter-select"
          value={filters.niveau_risque}
          onChange={(v) => setFilters((f) => ({ ...f, niveau_risque: v as NiveauRisque }))}
          options={["FAIBLE", "MODERE", "ELEVE", "CRITIQUE"].map((r) => ({ value: r, label: r }))}
        />
        <span className="ad-filters__spacer" />
        <Button type="text" onClick={() => { setFilters({}); setRange(null); setWindowDays(30); }}>Réinitialiser</Button>
      </div>

      {/* ── Ligne 1 : KPI globaux ─────────────── */}
      <Row gutter={[16, 16]} className="ad-kpi-row">
        <Col xs={12} md={6}>
          <RichKpi title="Enseignants monitorés" tone="primary" icon={<TeamOutlined />}
            value={kpis?.nb_enseignants_suivis ?? 0} tooltip={KPI_DEFS["Enseignants suivis"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-atrisk")} />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi title="Indice de risque moyen" tone="warning" icon={<LineChartOutlined />}
            value={(kpis?.score_risque_moyen ?? filteredRiskKpis.scoreMoyen).toFixed(2)} tooltip={KPI_DEFS["Score de risque moyen"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-atrisk")} />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi title="Gaps critiques (≥ 0,7)" tone="danger" icon={<AlertOutlined />}
            value={filteredRiskKpis.gapsCritiques} hint="Fenêtre sélectionnée" tooltip={KPI_DEFS["Gaps critiques"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-heatmap")} />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi title="Alertes nouvelles" tone="info" icon={<WarningOutlined />}
            value={kpis?.nb_alertes_nouvelles ?? 0} tooltip={KPI_DEFS["Alertes nouvelles"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-alertes")} />
        </Col>
      </Row>

      {/* ── Ligne 1b : KPI décisionnels ─────────────── */}
      <Row gutter={[16, 16]} className="ad-kpi-row">
        <Col xs={12} md={6}>
          <RichKpi title="Taux de couverture" tone="success" icon={<RiseOutlined />}
            value={`${(kpis?.taux_couverture_global ?? 0).toFixed(1)}%`} tooltip={KPI_DEFS["Taux de couverture"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-heatmap")} />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi title="En régression" tone="warning" icon={<FallOutlined />}
            value={kpis?.nb_regression ?? 0} tooltip={KPI_DEFS["En régression"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-declin")} />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi title="En stagnation (≥ 3 mois)" tone="warning" icon={<FallOutlined />}
            value={kpis?.nb_stagnation ?? 0} tooltip={KPI_DEFS["En stagnation"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-declin")} />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi title="Alertes critiques ouvertes" tone="danger" icon={<AlertOutlined />}
            value={kpis?.alertes_critiques_ouvertes ?? 0} tooltip={KPI_DEFS["Alertes critiques ouvertes"]} loading={dashboard.isLoading}
            onClick={() => jump("sec-alertes")} />
        </Col>
      </Row>

      {/* ── Avertissement si peu de données ─────── */}
      {!dashboard.isLoading && !hasRiskData && hasGaps && (
        <Alert className="ad-banner" type="info" showIcon
          message="Données de risque agrégées non encore calculées"
          description="Lancez une analyse ou le batch pour peupler les profils de risque. Les indicateurs utilisent les données disponibles (gaps, alertes)." />
      )}

      {/* ── Ligne 2 : à risque + répartition ─────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Section id="sec-atrisk" title="Enseignants à risque (score ≥ 0,5)" icon={<SafetyCertificateOutlined />}
            extra={<Tag color={filteredAtRisk.length ? "red" : "default"}>{filteredAtRisk.length}</Tag>}
            loading={atRisk.isLoading}>
            <AtRiskTeachersTable teachers={filteredAtRisk} loading={atRisk.isLoading}
              onSelect={(id) => navigate(`/home/analytics/teacher/${id}`)} />
          </Section>
        </Col>
        <Col xs={24} lg={10}>
          <Section title="Répartition des risques" icon={<RiseOutlined />} loading={dashboard.isLoading}>
            <RiskDistributionChart distribution={filteredDistribution} loading={dashboard.isLoading} />
          </Section>
        </Col>

        {/* ── Ligne 3 : heatmap + compétences en déclin ─────── */}
        <Col xs={24} lg={14}>
          <Section id="sec-heatmap" title="Cartographie des écarts — Département × Compétence" icon={<HeatMapOutlined />}
            extra={<Tooltip title="Cliquez une cellule pour voir les enseignants impactés"><HeatMapOutlined style={{ color: "#c8102e" }} /></Tooltip>}
            loading={dashboard.isLoading}>
            {filteredHeatmap.length
              ? <Heatmap cells={filteredHeatmap} loading={dashboard.isLoading}
                  onCellClick={(d, c, n) => setDrill({ departement: d, competenceId: c, competenceNom: n })} />
              : <div className="ad-empty"><Empty description="Aucun gap pour ce département" /></div>}
          </Section>
        </Col>
        <Col xs={24} lg={10}>
          <Section id="sec-declin" title="Compétences en décrochage" icon={<FallOutlined />} loading={declining.isLoading}>
            {declining.data?.length
              ? <DecliningSkillsChart skills={declining.data} loading={declining.isLoading} />
              : <div className="ad-empty"><Empty description="Aucune compétence en déclin détectée" /></div>}
          </Section>
        </Col>

        {/* ── Ligne 4 : alertes + tendances ─────── */}
        <Col xs={24} lg={12}>
          <Section id="sec-alertes" title="Alertes & signaux à traiter" icon={<WarningOutlined />}
            extra={<Tag color="orange">{(alerts.data?.alerts ?? []).length}</Tag>}
            loading={alerts.isLoading}>
            <AlertCenter
              alerts={alerts.data?.alerts ?? []}
              loading={alerts.isLoading}
              onUpdate={(id, payload) => updateAlert.mutate({ id, payload })}
              onSelectEnseignant={(id) => navigate(`/home/analytics/teacher/${id}`)}
            />
          </Section>
        </Col>
        <Col xs={24} lg={12}>
          <Section title="Tendances d'évolution du risque" icon={<RiseOutlined />} loading={dashboard.isLoading}>
            {data?.tendances?.length
              ? <TrendChart trends={data.tendances} loading={dashboard.isLoading} />
              : <div className="ad-empty"><Empty description="Aucune donnée de tendance" /></div>}
          </Section>
        </Col>

        {/* ── Ligne 5 : top formations + actions prioritaires ─────── */}
        <Col xs={24} lg={14}>
          <Section title="Formations recommandées (argumentées)" icon={<TrophyOutlined />} loading={dashboard.isLoading}>
            {data?.top_formations?.length
              ? <TopFormationsTable formations={data.top_formations} />
              : <div className="ad-empty"><Empty description="Aucune recommandation récente" /></div>}
          </Section>
        </Col>
        <Col xs={24} lg={10}>
          <Section title="Plan d'action prioritaire" icon={<ArrowDownOutlined />} loading={dashboard.isLoading}>
            <PriorityActions kpis={kpis} atRisk={filteredAtRisk} onFilter={setFilters} />
          </Section>
        </Col>
      </Row>

      {/* ── Modal méthodologie ─────────────── */}
      <Modal title="Méthodologie du score de risque" open={methodOpen} onOk={() => setMethodOpen(false)} onCancel={() => setMethodOpen(false)} footer={null}>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          L'<b>indice de risque</b> (0–1) est calculé par un modèle multi-facteurs pondérant :
          l'absence de formation récente, la stagnation, les gaps critiques et les besoins
          non couverts. Seuils : <Tag color="green">FAIBLE &lt; 0,25</Tag>{" "}
          <Tag color="orange">MODÉRÉ 0,25–0,5</Tag> <Tag color="red">ÉLEVÉ 0,5–0,75</Tag>{" "}
          <Tag color="red">CRITIQUE ≥ 0,75</Tag>.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          Les <b>gaps critiques</b> et les <b>alertes</b> sont calculés sur la fenêtre temporelle
          sélectionnée (7 j / 30 j / trimestre / semestre). Le tableau de bord exploite un
          snapshot calculé toutes les 6 h (recalcul à la volée si une fenêtre personnalisée est
          choisie). La couverture est issue de l'état réel des niveaux enseignant × compétence.
        </p>
      </Modal>

      {/* ── Modal drill-down heatmap ─────────────── */}
      <Modal
        title={`Enseignants impactés — ${drill?.competenceNom ?? ""}`}
        open={!!drill} onCancel={() => setDrill(null)} footer={null}
        width={640}
      >
        {drillQuery.isLoading && <div className="ad-loading"><Spin /></div>}
        {drillQuery.data && drillQuery.data.length > 0 && (
          <table className="ad-tbl">
            <thead>
              <tr>
                <th>Enseignant</th><th>Département</th><th>UP</th><th>Écart moyen</th><th>Urgence</th>
              </tr>
            </thead>
            <tbody>
              {drillQuery.data.map((t: any, i: number) => (
                <tr key={String(t.enseignant_id ?? i)}>
                  <td className="ad-tbl-td">{t.nom}</td>
                  <td className="ad-tbl-td">{formatDepartment(t.departement) || "Non affecté"}</td>
                  <td className="ad-tbl-td">{formatUP(t.up) || "Non affecté"}</td>
                  <td className="ad-tbl-td">{Math.round((Number(t.gap_moyen ?? 0)) * 100)}%</td>
                  <td className="ad-tbl-td"><Tag>{t.urgence}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {drillQuery.data?.length === 0 && <Empty description="Aucun enseignant sur cette cellule" />}
      </Modal>
    </div>
  );
}

/* ── Bloc "Actions prioritaires" (orienté décision) ─────────── */
function PriorityActions({
  kpis, atRisk, onFilter,
}: {
  readonly kpis: any;
  readonly atRisk: AtRiskTeacher[];
  readonly onFilter: (f: DashboardFilters) => void;
}) {
  const actions: { label: string; count: number; tone: string; filter?: DashboardFilters }[] = [
    { label: "Traiter les alertes critiques ouvertes", count: kpis?.alertes_critiques_ouvertes ?? 0, tone: "red" },
    { label: "Couvrir les besoins critiques non satisfaits", count: kpis?.besoins_critiques_non_satisfaits ?? 0, tone: "red" },
    { label: "Relancer les enseignants en stagnation", count: kpis?.nb_stagnation ?? 0, tone: "orange" },
    { label: "Soutenir les enseignants en régression", count: kpis?.nb_regression ?? 0, tone: "orange" },
    { label: "Examiner les enseignants à risque CRITIQUE", count: atRisk.filter((t) => t.niveau_risque === "CRITIQUE").length, tone: "red", filter: { niveau_risque: "CRITIQUE" } },
  ];
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {actions.map((a, i) => (
        <li key={a.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: 13 }}>
            <Tag color={a.tone}>{a.count}</Tag> {a.label}
          </span>
          {a.filter && <Button size="small" type="link" onClick={() => onFilter(a.filter!)}>Filtrer</Button>}
        </li>
      ))}
    </ul>
  );
}

/* ── Tableau « Top formations » enrichi ─────────────────── */
function TopFormationsTable({ formations }: { readonly formations: TopFormation[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="ad-tbl">
        <thead>
          <tr>
            <th>Formation</th>
            <th>Cible principale</th>
            <th>Enseignants ciblés</th>
            <th>Score moyen</th>
            <th>Impact estimé</th>
          </tr>
        </thead>
        <tbody>
          {formations.map((f, i) => (
            <tr key={String(f.formation_id ?? i)}>
               <td className="ad-tbl-td"><b>{f.formation_titre}</b>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {f.competences_couvertes?.join(", ")} · {f.departements?.map(formatDepartment).join(", ")}
                </div>
              </td>
              <td className="ad-tbl-td">{f.competences_couvertes?.[0] ?? "—"}</td>
              <td className="ad-tbl-td"><Tag>{f.enseignants_cibles ?? 0}</Tag></td>
              <td className="ad-tbl-td"><span style={{ fontWeight: 700, color: "#c8102e" }}>{Math.round((Number(f.score_moyen ?? 0)) * 100)}%</span></td>
              <td className="ad-tbl-td">
                {(() => {
                  if (f.impact_estime > 0.5) return <Tag color="red">Baisse risque élevée</Tag>;
                  if (f.impact_estime > 0.25) return <Tag color="orange">Baisse risque moyenne</Tag>;
                  return <Tag color="default">À évaluer</Tag>;
                })()}
                <div style={{ fontSize: 11, color: "#94a3b8" }}>écart {Math.round((Number(f.impact_estime ?? 0)) * 100)}%</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

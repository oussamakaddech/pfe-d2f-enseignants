import { useMemo, useState, type ReactNode } from "react";
import { Row, Col, Select, DatePicker, Alert, Empty, Tag, Button, Spin, Tooltip } from "antd";
import {
  TeamOutlined, AlertOutlined, LineChartOutlined, WarningOutlined,
  DashboardOutlined, ReloadOutlined, ClockCircleOutlined, HeatMapOutlined,
  TrophyOutlined, SafetyCertificateOutlined, RiseOutlined, FallOutlined,
} from "@ant-design/icons";
import { useDashboard, useAtRisk } from "../hooks/useAnalyticsQueries";
import {
  AtRiskTeachersTable, DecliningSkillsChart, RiskDistributionChart,
  TrendChart, Heatmap, AlertCenter,
} from "../components";
import type { DashboardFilters, NiveauRisque, AtRiskTeacher, HeatmapCell } from "../types";
import { formatDepartment, formatUP } from "../utils/format";
import "./analyticsDashboard.redesign.css";

const { RangePicker } = DatePicker;

/* ── Petite carte KPI « riche » (dégradé + bulle d'icône) ──────── */
function RichKpi({
  title, value, icon, tone, hint, loading,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  tone: "primary" | "warning" | "danger" | "info" | "success";
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className={`ad-kpi ad-kpi--${tone}`}>
      <div className="ad-kpi__icon">{icon}</div>
      <div className="ad-kpi__body">
        <div className="ad-kpi__title">{title}</div>
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
  title, icon, extra, children, loading,
}: {
  title: string;
  icon?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="ad-card">
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

/**
 * Dashboard global décisionnel (ADMIN / CUP) — version « moderne & riche ».
 * Filtres département / UP / niveau de risque / période peuplés dynamiquement
 * depuis les données réelles, avec filtrage client des tableaux & heatmap.
 */
export default function AnalyticsDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const dashboard = useDashboard(filters);
  const atRisk = useAtRisk(filters);

  const data = dashboard.data;
  const kpis = data?.kpis;

  const hasRiskData = (data?.enseignants_a_risque?.length ?? 0) > 0;
  const hasGaps = (data?.heatmap?.length ?? 0) > 0 || (data?.alertes_recentes?.length ?? 0) > 0;

  /* Options de filtres réels.
     Le backend ne renvoie pas taux_couverture_departements ; on dérive donc
     les départements réels depuis la heatmap (department_gap_heatmap) et la
     liste des enseignants à risque, garanti non vides et cohérents. */
  const departmentOptions = useMemo(() => {
    const seen = new Set<string>();
    const add = (d?: string | null) => {
      if (d && d !== "non_affecte" && d !== "NON_AFFECTE") seen.add(d);
    };
    (data?.heatmap ?? []).forEach((h) => add(h.departement));
    (atRisk.data ?? []).forEach((t) => add(t.departement));
    return Array.from(seen).sort().map((v) => ({ value: v, label: formatDepartment(v) }));
  }, [data?.heatmap, atRisk.data]);

  const upOptions = useMemo(() => {
    const seen = new Set<string>();
    (atRisk.data ?? []).forEach((t) => { if (t.up && t.up !== "non_affecte") seen.add(t.up); });
    return Array.from(seen).sort().map((v) => ({ value: v, label: formatUP(v) }));
  }, [atRisk.data]);

  /* Filtrage client des enseignants à risque & de la heatmap. */
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

  /* Répartition des risques dérivée de la liste FILTRÉE (cohérente avec le
     tableau et les KPI), au lieu de la répartition globale du serveur. */
  const filteredDistribution = useMemo(() => {
    const dist: Record<string, number> = { FAIBLE: 0, MODERE: 0, ELEVE: 0, CRITIQUE: 0 };
    filteredAtRisk.forEach((t) => { dist[t.niveau_risque] = (dist[t.niveau_risque] ?? 0) + 1; });
    return (Object.keys(dist) as NiveauRisque[]).map((niveau) => ({ niveau, count: dist[niveau] }));
  }, [filteredAtRisk]);

  /* KPI réactifs au filtre : calculés depuis la liste FILTRÉE d'enseignants
     à risque pour rester cohérents avec le tableau et la répartition. */
  const filteredRiskKpis = useMemo(() => {
    const list = filteredAtRisk;
    const nb = list.length;
    const scoreMoyen = nb ? list.reduce((s, t) => s + t.score_risque, 0) / nb : 0;
    const gapsCritiques = list.reduce((s, t) => s + t.nb_gaps_critiques, 0);
    return { nb, scoreMoyen, gapsCritiques };
  }, [filteredAtRisk]);

  const onRefresh = () => { dashboard.refetch(); atRisk.refetch(); };

  return (
    <div className="ad-page">
      {/* ── En-tête dégradé ───────────────────────────────── */}
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
            <span className="ad-header__updated">
              <ClockCircleOutlined /> Mis à jour : {data.generated_at}
            </span>
          )}
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

      {/* ── Barre de filtres (options réelles) ─────────────── */}
      <div className="ad-filters">
        <span className="ad-filters__label">Filtres</span>
        <Select
          allowClear
          placeholder="Département"
          className="ad-filter-select"
          value={filters.departement_id}
          onChange={(v) => setFilters((f) => ({ ...f, departement_id: v }))}
          options={departmentOptions}
          notFoundContent="Aucun département"
        />
        <Select
          allowClear
          placeholder="UP"
          className="ad-filter-select"
          value={filters.up_id}
          onChange={(v) => setFilters((f) => ({ ...f, up_id: v }))}
          options={upOptions}
          notFoundContent="Aucune UP"
        />
        <Select
          allowClear
          placeholder="Niveau de risque"
          className="ad-filter-select"
          value={filters.niveau_risque}
          onChange={(v) => setFilters((f) => ({ ...f, niveau_risque: v as NiveauRisque }))}
          options={["FAIBLE", "MODERE", "ELEVE", "CRITIQUE"].map((r) => ({ value: r, label: r }))}
        />
        <RangePicker
          onChange={(dates) =>
            setFilters((f) => ({
              ...f,
              periode_debut: dates?.[0]?.toISOString(),
              periode_fin: dates?.[1]?.toISOString(),
            }))
          }
        />
        <span className="ad-filters__spacer" />
        <Button type="text" onClick={() => setFilters({})}>Réinitialiser</Button>
      </div>

      {/* ── Cartes KPI ─────────────────────────────────────── */}
      <Row gutter={[16, 16]} className="ad-kpi-row">
        <Col xs={12} md={6}>
          <RichKpi
            title="Enseignants suivis" tone="primary" icon={<TeamOutlined />}
            value={kpis?.nb_enseignants_suivis ?? 0} hint="Enseignants monitorés"
            loading={dashboard.isLoading}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Score de risque moyen" tone="warning" icon={<LineChartOutlined />}
            value={filteredRiskKpis.scoreMoyen.toFixed(2)} hint="Score agrégé (0 – 1)"
            loading={dashboard.isLoading}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Gaps critiques" tone="danger" icon={<AlertOutlined />}
            value={filteredRiskKpis.gapsCritiques} hint="Gaps ≥ 0.7 (30 j)"
            loading={dashboard.isLoading}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Alertes nouvelles" tone="info" icon={<WarningOutlined />}
            value={kpis?.nb_alertes_nouvelles ?? 0} hint="30 derniers jours"
            loading={dashboard.isLoading}
          />
        </Col>
      </Row>

      {/* ── Avertissement si peu de données de risque ─────── */}
      {!dashboard.isLoading && !hasRiskData && hasGaps && (
        <Alert
          className="ad-banner"
          type="info"
          showIcon
          message="Données de risque agrégées non encore calculées"
          description="Lancez une analyse (bouton « Lancer l'analyse » sur la fiche enseignant) ou le batch pour peupler les profils de risque. Les indicateurs ci-dessous utilisent les données disponibles (gaps, alertes)."
        />
      )}

      {/* ── Ligne principale : à risque + répartition ─────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Section
            title="Enseignants à risque"
            icon={<SafetyCertificateOutlined />}
            extra={<Tag color={filteredAtRisk.length ? "red" : "default"}>{filteredAtRisk.length}</Tag>}
            loading={atRisk.isLoading}
          >
            <AtRiskTeachersTable teachers={filteredAtRisk} loading={atRisk.isLoading} />
          </Section>
        </Col>
        <Col xs={24} lg={10}>
           <Section title="Répartition des risques" icon={<RiseOutlined />} loading={dashboard.isLoading}>
             <RiskDistributionChart distribution={filteredDistribution} loading={dashboard.isLoading} />
           </Section>
        </Col>

        {/* ── Heatmap des gaps ─────────────────────────────── */}
        <Col xs={24} lg={14}>
          <Section
            title="Heatmap des gaps (département × compétence)"
            icon={<HeatMapOutlined />}
              extra={<Tooltip title="Filtrer par département via la barre ci-dessus"><HeatMapOutlined style={{ color: "#c8102e" }} /></Tooltip>}
            loading={dashboard.isLoading}
          >
            {filteredHeatmap.length
              ? <Heatmap cells={filteredHeatmap} loading={dashboard.isLoading} />
              : <div className="ad-empty"><Empty description="Aucun gap pour ce département" /></div>}
          </Section>
        </Col>

        {/* ── Alertes récentes ─────────────────────────────── */}
        <Col xs={24} lg={10}>
          <Section
            title="Alertes récentes"
            icon={<WarningOutlined />}
            extra={<Tag color="orange">{(data?.alertes_recentes?.length ?? 0)}</Tag>}
            loading={dashboard.isLoading}
          >
            {data?.alertes_recentes?.length
              ? <AlertCenter alerts={data.alertes_recentes} loading={dashboard.isLoading} />
              : <div className="ad-empty"><Empty description="Aucune alerte récente" /></div>}
          </Section>
        </Col>

        {/* ── Compétences en déclin ────────────────────────── */}
        <Col xs={24} lg={12}>
          <Section title="Compétences en déclin" icon={<FallOutlined />} loading={dashboard.isLoading}>
            {data?.competences_en_declin?.length
              ? <DecliningSkillsChart skills={data.competences_en_declin} loading={dashboard.isLoading} />
              : <div className="ad-empty"><Empty description="Aucune compétence en déclin détectée" /></div>}
          </Section>
        </Col>

        {/* ── Tendances ────────────────────────────────────── */}
        <Col xs={24} lg={12}>
          <Section title="Tendances d'évolution" icon={<RiseOutlined />} loading={dashboard.isLoading}>
            {data?.tendances?.length
              ? <TrendChart trends={data.tendances} loading={dashboard.isLoading} />
              : <div className="ad-empty"><Empty description="Aucune donnée de tendance" /></div>}
          </Section>
        </Col>

        {/* ── Top formations recommandées ─────────────────── */}
        <Col xs={24}>
          <Section
            title="Top formations recommandées"
            icon={<TrophyOutlined />}
            loading={dashboard.isLoading}
          >
            {data?.top_formations?.length ? (
              <TopFormationsTable formations={data.top_formations} />
            ) : (
              <div className="ad-empty"><Empty description="Aucune recommandation récente" /></div>
            )}
          </Section>
        </Col>
      </Row>
    </div>
  );
}

/* ── Tableau « Top formations » stylé ─────────────────────────── */
function TopFormationsTable({ formations }: { formations: Array<Record<string, unknown>> }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: "left", color: "#64748b", fontWeight: 600 }}>
          <th style={th}>Formation</th>
          <th style={th}>Recommandations</th>
          <th style={th}>Score moyen</th>
          <th style={th}>Proba. réussite</th>
        </tr>
      </thead>
      <tbody>
        {formations.map((f, i) => (
          <tr key={String(f.formation_id ?? i)} style={{ borderTop: "1px solid #eef2f7" }}>
            <td style={td}>{f.formation_titre}</td>
            <td style={td}><Tag>{Number(f.nb_recommandations ?? 0)}</Tag></td>
            <td style={td}>
              <span style={{ fontWeight: 700, color: "#4f46e5" }}>
                {Math.round((Number(f.score_moyen ?? 0)) * 100)}%
              </span>
            </td>
            <td style={td}>{Math.round((Number(f.proba_reussite_moy ?? 0)) * 100)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "10px", color: "#0f172a" };

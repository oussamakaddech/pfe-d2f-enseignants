import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Select,
  Alert,
  Empty,
  Tag,
  Button,
  Skeleton,
  Tooltip,
  Modal,
  Segmented,
  message,
  Spin,
} from 'antd';
import {
  TeamOutlined,
  AlertOutlined,
  LineChartOutlined,
  WarningOutlined,
  DashboardOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  HeatMapOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  FallOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  ArrowDownOutlined,
  FilePdfOutlined,
  BulbOutlined,
  AppstoreOutlined,
  FilterOutlined,
  BankOutlined,
  ApartmentOutlined,
  FireOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  useRealDashboardImpact,
  useAlerts,
  useUpdateAlert,
  useRiskTrends,
} from '@/hooks/analytics/useAnalyticsQueries';
import { useSupplyDemand } from '@/hooks/analyse/useAnalysePredictive';
import { analyticsApi } from '@/services/analyse/analyticsApi';
import {
  AtRiskTeachersTable,
  TrendChart,
  Heatmap,
  AlertCenter,
  TrainingImpactPanel,
} from '@/components/analytics';
import SupplyDemandChart from '@/components/charts/SupplyDemandChart';
import type {
  DashboardFilters,
  NiveauRisque,
  AtRiskTeacher,
  HeatmapCell,
  TopFormation,
  RealDashboardImpact,
  AlertEvent,
} from '@/models/analyse/analyticsFeature';
import {
  formatDepartment,
  formatUP,
  toCsv,
  downloadCsv,
  formatCount,
} from '@/utils/analytics/format';
import './analyticsDashboard.redesign.css';

/** Libellé du compteur de filtres actifs (« 2 critères actifs » / « Aucun critère actif »). */
function formatActiveFilterLabel(count: number): string {
  if (count <= 0) {
    return 'Aucun critère actif';
  }
  const plural = count > 1 ? 's' : '';
  return `${count} critère${plural} actif${plural}`;
}

/* ── Définitions métier des KPI (affichées en tooltip) ──────── */
const KPI_DEFS: Record<string, string> = {
  'Enseignants en base':
    'Enseignants actifs présents en base (formation.enseignants, deleted_at IS NULL).',
  'Indice de risque moyen':
    'Score moyen des derniers snapshots de risque (0–1). Seuils : < 0,25 Faible · 0,25–0,5 Modéré · 0,5–0,75 Élevé · ≥ 0,75 Critique.',
  'Gaps critiques':
    "Écarts d'urgence CRITIQUE calculés sur les données réelles (analyse.skill_gaps).",
  'Alertes non traitées': 'Alertes réelles au statut NOUVELLE ou LUE (analyse.alert_events).',
  'Taux de couverture':
    'Part des enseignants actifs ayant au moins une compétence affectée (competence.enseignant_competences).',
  'Gaps haute priorité': "Écarts d'urgence HAUTE sur les données réelles.",
  'Avec gaps calculés':
    'Enseignants distincts présents dans la table des gaps (analyse.skill_gaps).',
  'Alertes critiques ouvertes': 'Alertes réelles de sévérité CRITICAL/CRITIQUE non traitées.',
};

/* ── Petite carte KPI « riche » (dégradé + bulle d'icône) ──────── */
function RichKpi({
  title,
  value,
  icon,
  tone,
  hint,
  loading,
  tooltip,
  onClick,
}: {
  readonly title: string;
  readonly value: ReactNode;
  readonly icon: ReactNode;
  readonly tone: 'primary' | 'warning' | 'danger' | 'info' | 'success';
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
          {loading ? (
            <div className="ad-kpi__value" style={{ opacity: 0.5 }}>
              ···
            </div>
          ) : (
            <div className="ad-kpi__value">{value}</div>
          )}
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
        {loading ? (
          <div className="ad-kpi__value" style={{ opacity: 0.5 }}>
            ···
          </div>
        ) : (
          <div className="ad-kpi__value">{value}</div>
        )}
        {hint && <div className="ad-kpi__hint">{hint}</div>}
      </div>
    </div>
  );
}

/* ── Section « glass » réutilisable ──────────────────────────── */
function Section({
  title,
  icon,
  extra,
  children,
  loading,
  id,
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
      <div className="ad-section__head">
        {icon && <div className="ad-section__icon">{icon}</div>}
        <div className="ad-section__title">{title}</div>
        {extra && <div className="ad-section__extra">{extra}</div>}
      </div>
      {loading ? <Skeleton active paragraph={{ rows: 4 }} style={{ margin: 16 }} /> : children}
    </div>
  );
}

const WINDOWS: { label: string; days: number }[] = [
  { label: '7 j', days: 7 },
  { label: '30 j', days: 30 },
  { label: 'Trimestre', days: 90 },
  { label: 'Semestre', days: 180 },
];

/** Libellés lisibles des niveaux de risque (valeurs base : FAIBLE/MODERE/ELEVE/CRITIQUE). */
const RISK_LABELS: Record<NiveauRisque, string> = {
  FAIBLE: 'Faible',
  MODERE: 'Modéré',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const RISK_TONES: { value: NiveauRisque; label: string; tone: string }[] = [
  { value: 'FAIBLE', label: 'Faible', tone: 'faible' },
  { value: 'MODERE', label: 'Modéré', tone: 'modere' },
  { value: 'ELEVE', label: 'Élevé', tone: 'eleve' },
  { value: 'CRITIQUE', label: 'Critique', tone: 'critique' },
];

/** Options du filtre « niveau de risque » avec pastille colorée. */
const RISK_OPTIONS = RISK_TONES.map((r) => ({
  value: r.value,
  label: (
    <span className={`ad-risk-opt ad-risk-opt--${r.tone}`}>
      <span className="ad-risk-opt__dot" aria-hidden="true" />
      {r.label}
    </span>
  ),
}));

/** Niveau de risque (valeurs base) → niveau UI. */
function toNiveauRisque(raw: string | null | undefined): NiveauRisque {
  const v = (raw ?? '').toUpperCase();
  if (v === 'CRITIQUE' || v === 'CRITICAL') return 'CRITIQUE';
  if (v === 'ELEVE' || v === 'HIGH') return 'ELEVE';
  if (v === 'MODERE' || v === 'MEDIUM') return 'MODERE';
  return 'FAIBLE';
}

/** Enseignants à risque réels (score 0–1 en base) → format tableau.
 *  `departement`/`up` portent les CODES (dept_id/up_id) : identité + filtres ;
 *  les composants d'affichage passent par formatDepartment()/formatUP(). */
function toAtRiskTeacher(row: RealDashboardImpact['at_risk_teachers'][number]): AtRiskTeacher {
  return {
    enseignant_id: row.enseignant_id,
    nom: `${row.prenom ?? ''} ${row.nom ?? ''}`.trim() || row.enseignant_id,
    departement: row.dept_id ?? null,
    up: row.up_id ?? null,
    score_risque: row.score_risque ?? 0,
    niveau_risque: toNiveauRisque(row.niveau_risque),
    nb_gaps_critiques: row.nb_gaps_critiques ?? 0,
    tendance: row.tendance ?? 'STABLE',
  };
}

/** Heatmap réelle (département × compétence) → format UI.
 *  `departement` porte le CODE (dept_id) : il sert de clé d'identité et est
 *  transmis tel quel au drill-down /teachers-by-cell (qui compare avec
 *  e.dept_id). L'affichage du libellé est fait par formatDepartment(). */
function toHeatmapCell(row: RealDashboardImpact['heatmap'][number]): HeatmapCell {
  return {
    departement: row.dept_id ?? 'non_affecte',
    competence_id: row.competence_id,
    competence_nom: row.competence_nom ?? row.competence_code,
    avg_gap: row.avg_gap_score ?? 0,
    enseignants_count: row.nb_enseignants_touches ?? 0,
  };
}

/** Top formations réelles → format tableau. */
function toTopFormation(row: RealDashboardImpact['top_formations'][number]): TopFormation {
  return {
    formation_id: row.formation_id,
    formation_titre: row.titre_formation ?? `Formation #${row.formation_id}`,
    nb_recommandations: row.nb_recommandations ?? 0,
    score_moyen: row.score_moyen ?? 0,
    proba_reussite_moy: row.score_moyen ?? 0,
    enseignants_cibles: row.nb_enseignants ?? 0,
    departements: [],
    competences_couvertes: row.competence_nom ? [row.competence_nom] : [],
    impact_estime: row.score_moyen ?? 0,
  };
}

/**
 * Dashboard global décisionnel (ADMIN / CUP) — version pilotage.
 * Toutes les données proviennent de la base PostgreSQL réelle :
 *   - /dashboard/real/impact  (KPIs, heatmap, à-risque, formations)
 *   - /alerts                 (alertes réelles)
 *   - /dashboard/supply-demand, /dashboard/training-impact
 *   - /dashboard/risk-evolution (tendances mensuelles)
 */
export default function AnalyticsDashboardPage() {
  const [windowDays, setWindowDays] = useState<number>(30);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [methodOpen, setMethodOpen] = useState(false);
  const [drill, setDrill] = useState<{
    departement: string;
    competenceId: number;
    competenceNom: string;
  } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const navigate = useNavigate();

  /** Drill-down (F4) : un KPI ouvre la section pertinente du dashboard. */
  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const impact = useRealDashboardImpact();
  const [alertsPage, setAlertsPage] = useState<number>(1);
  const alerts = useAlerts({ departement_id: filters.departement_id, page: alertsPage, size: 100 });
  const updateAlert = useUpdateAlert();
  const supplyDemand = useSupplyDemand();

  // Accumule les pages d'alertes (charge plus) ; reset dès que le filtre change.
  const [accumAlerts, setAccumAlerts] = useState<AlertEvent[]>([]);
  useEffect(() => {
    if (filters.departement_id !== undefined) {
      setAlertsPage(1);
      setAccumAlerts([]);
    }
  }, [filters.departement_id]);
  useEffect(() => {
    const page = alerts.data?.alerts ?? [];
    setAccumAlerts((prev) => {
      if (alertsPage === 1) return page;
      const seen = new Set(prev.map((a) => a.id));
      return [...prev, ...page.filter((a) => !seen.has(a.id))];
    });
  }, [alerts.data?.alerts, alertsPage]);
  const canLoadMoreAlerts = !!alerts.data && alerts.data.total > accumAlerts.length;

  // Fenêtre temporelle → fenêtre des tendances (le backend agrège par mois).
  const trendWindow = WINDOWS.find((w) => w.days === windowDays) ?? WINDOWS[3];
  const trendMonths = Math.max(1, Math.round(trendWindow.days / 30));
  const trends = useRiskTrends(trendMonths);

  const data = impact.data;
  const kpis = data?.kpis;

  // Données réelles → formes UI.
  const allAtRisk = useMemo<AtRiskTeacher[]>(
    () => (data?.at_risk_teachers ?? []).map(toAtRiskTeacher),
    [data],
  );
  const allHeatmap = useMemo<HeatmapCell[]>(() => (data?.heatmap ?? []).map(toHeatmapCell), [data]);
  const topFormations = useMemo<TopFormation[]>(
    () => (data?.top_formations ?? []).map(toTopFormation),
    [data],
  );

  /** Libellés officiels fournis par l'API (formation.departements / formation.ups),
   *  avec repli sur formatDepartment()/formatUP() si absent. */
  const departmentOptions = useMemo(() => {
    const labels = new Map<string, string>();
    const add = (code?: string | null, libelle?: string | null) => {
      if (!code || code === 'non_affecte' || code === 'NON_AFFECTE') return;
      if (!labels.has(code)) labels.set(code, libelle ?? formatDepartment(code));
    };
    (data?.heatmap ?? []).forEach((r) => add(r.dept_id, r.dept_libelle));
    (data?.at_risk_teachers ?? []).forEach((r) => add(r.dept_id, r.dept_libelle));
    return Array.from(labels.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [data]);

  const upOptions = useMemo(() => {
    const labels = new Map<string, string>();
    (data?.at_risk_teachers ?? []).forEach((r) => {
      if (!r.up_id || r.up_id === 'non_affecte') return;
      if (!labels.has(r.up_id)) labels.set(r.up_id, r.up_libelle ?? formatUP(r.up_id));
    });
    return Array.from(labels.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [data]);

  const filteredAtRisk = useMemo<AtRiskTeacher[]>(() => {
    return allAtRisk.filter(
      (t) =>
        t.score_risque >= 0.5 &&
        (!filters.departement_id || t.departement === filters.departement_id) &&
        (!filters.up_id || t.up === filters.up_id) &&
        (!filters.niveau_risque || t.niveau_risque === filters.niveau_risque),
    );
  }, [allAtRisk, filters.departement_id, filters.up_id, filters.niveau_risque]);

  const filteredHeatmap = useMemo<HeatmapCell[]>(() => {
    return allHeatmap.filter(
      (h) =>
        h.departement &&
        h.departement !== 'non_affecte' &&
        (!filters.departement_id || h.departement === filters.departement_id),
    );
  }, [allHeatmap, filters.departement_id]);

  // Alertes ouvertes réelles (backend, filtre département appliqué) → résumé AlertCenter.
  const alertOpenTotal = useMemo(() => {
    const sev = alerts.data?.severity_open;
    if (sev) return sev.CRITICAL + sev.WARNING + sev.INFO;
    return kpis?.nb_alertes_non_traitees;
  }, [alerts.data?.severity_open, kpis?.nb_alertes_non_traitees]);

  const hasActiveFilters = !!(filters.departement_id || filters.up_id || filters.niveau_risque);
  const activeFilterCount = [filters.departement_id, filters.up_id, filters.niveau_risque].filter(
    Boolean,
  ).length;
  const activeFilterLabel = formatActiveFilterLabel(activeFilterCount);
  const periodResetNeeded = windowDays !== 30;

  const clearFilters = () => {
    setFilters({});
    setWindowDays(30);
  };

  // Drill-down heatmap → enseignants impactés.
  const drillQuery = useQuery({
    queryKey: ['analytics', 'cell', drill?.departement, drill?.competenceId],
    enabled: !!drill,
    queryFn: () => analyticsApi.getTeachersByCell(drill!.departement, drill!.competenceId, 50),
  });

  const onRefresh = () => {
    impact.refetch();
    alerts.refetch();
    trends.refetch();
  };

  const onExportPdf = () => window.print();

  const onExport = () => {
    const rows = [
      { indicateur: 'Enseignants en base', valeur: formatCount(kpis?.nb_enseignants) },
      {
        indicateur: 'Enseignants avec gaps calculés',
        valeur: formatCount(kpis?.nb_enseignants_avec_gaps),
      },
      { indicateur: 'Indice de risque moyen', valeur: (kpis?.avg_risk_score ?? 0).toFixed(2) },
      { indicateur: 'Gaps critiques', valeur: formatCount(kpis?.nb_gaps_critiques) },
      { indicateur: 'Gaps haute priorité', valeur: formatCount(kpis?.nb_gaps_haute) },
      { indicateur: 'Alertes non traitées', valeur: formatCount(kpis?.nb_alertes_non_traitees) },
      { indicateur: 'Alertes critiques ouvertes', valeur: formatCount(kpis?.nb_alertes_critiques) },
      { indicateur: 'Taux de couverture (%)', valeur: (kpis?.taux_couverture_pct ?? 0).toFixed(1) },
    ];
    downloadCsv('dashboard-analytique.csv', toCsv(rows, ['indicateur', 'valeur']));
    message.success('Export CSV généré');
  };

  return (
    <div className="ad-page" data-theme={theme}>
      <header className="ad-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <DashboardOutlined className="ad-header__icon" />
          <div className="ad-header__titles">
            <span className="ad-header__title">Tableau de bord analytique</span>
            <span className="ad-header__subtitle">
              Pilotage du développement professionnel des enseignants — données réelles (base)
            </span>
          </div>
        </div>
        <div className="ad-header__actions">
          {kpis?.model?.mode && (
            <Tooltip title="Mode d'exécution du modèle de risque (ML ou fallback heuristique)">
              <span className="ad-header__updated">
                <ClockCircleOutlined /> Modèle : {kpis.model.mode}
                {kpis.model.version ? ` · v${kpis.model.version.slice(0, 10)}` : ''}
              </span>
            </Tooltip>
          )}
          <Button
            type="text"
            icon={<InfoCircleOutlined />}
            onClick={() => setMethodOpen(true)}
            style={{ color: '#fff' }}
          >
            Méthodologie
          </Button>
          <Button
            type="text"
            icon={<BulbOutlined />}
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            style={{ color: '#fff' }}
          >
            {theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          </Button>
          <Button className="ad-refresh-btn" icon={<FilePdfOutlined />} onClick={onExportPdf}>
            Export PDF
          </Button>
          <Button className="ad-refresh-btn" icon={<DownloadOutlined />} onClick={onExport}>
            Export CSV
          </Button>
          <Button
            className="ad-refresh-btn"
            icon={<LineChartOutlined />}
            onClick={() => navigate('/home/analytics/pilotage')}
          >
            Prévision
          </Button>
          <Button
            className="ad-refresh-btn"
            icon={<ReloadOutlined />}
            loading={impact.isFetching || alerts.isFetching}
            onClick={onRefresh}
          >
            Actualiser
          </Button>
        </div>
      </header>

      {impact.isError && (
        <Alert
          type="error"
          showIcon
          message="Impossible de charger le dashboard (données réelles)."
          style={{ marginBottom: 16, borderRadius: 12 }}
        />
      )}

      {/* ── Barre de filtres ─────────────── */}
      <div className="ad-filters">
        <div className="ad-filters__head">
          <span className="ad-filters__badge" aria-hidden="true">
            <FilterOutlined />
          </span>
          <div className="ad-filters__head-text">
            <span className="ad-filters__label">Filtres</span>
            <span className="ad-filters__sub">{activeFilterLabel}</span>
          </div>
        </div>

        <div className="ad-filter-group">
          <span className="ad-filter-group__label">
            <ClockCircleOutlined /> Période
          </span>
          <div className="ad-segmented-wrap">
            <Segmented
              value={String(windowDays)}
              onChange={(v) => setWindowDays(Number(v))}
              options={WINDOWS.map((w) => ({ label: w.label, value: String(w.days) }))}
            />
          </div>
        </div>

        <div className="ad-filter-group">
          <span className="ad-filter-group__label">
            <BankOutlined /> Département
          </span>
          <Select
            allowClear
            placeholder="Tous les départements"
            className={`ad-filter-select${filters.departement_id ? ' ad-filter-select--active' : ''}`}
            prefix={<BankOutlined />}
            value={filters.departement_id}
            onChange={(v) => setFilters((f) => ({ ...f, departement_id: v }))}
            options={departmentOptions}
            notFoundContent="Aucun département"
          />
        </div>

        <div className="ad-filter-group">
          <span className="ad-filter-group__label">
            <ApartmentOutlined /> UP
          </span>
          <Select
            allowClear
            placeholder="Toutes les UP"
            className={`ad-filter-select${filters.up_id ? ' ad-filter-select--active' : ''}`}
            prefix={<ApartmentOutlined />}
            value={filters.up_id}
            onChange={(v) => setFilters((f) => ({ ...f, up_id: v }))}
            options={upOptions}
            notFoundContent="Aucune UP"
          />
        </div>

        <div className="ad-filter-group">
          <span className="ad-filter-group__label">
            <FireOutlined /> Niveau de risque
          </span>
          <Select
            allowClear
            placeholder="Tous les niveaux"
            className={`ad-filter-select${filters.niveau_risque ? ' ad-filter-select--active' : ''}`}
            prefix={<FireOutlined />}
            value={filters.niveau_risque}
            onChange={(v) => setFilters((f) => ({ ...f, niveau_risque: v as NiveauRisque }))}
            options={RISK_OPTIONS}
            notFoundContent="Aucun niveau"
          />
        </div>

        <span className="ad-filters__spacer" />
        <Tooltip title="Rétablir la période (30 j) et effacer les filtres">
          <Button
            className="ad-filters__reset"
            icon={<UndoOutlined />}
            onClick={clearFilters}
            disabled={!hasActiveFilters && !periodResetNeeded}
          >
            Réinitialiser
          </Button>
        </Tooltip>
      </div>

      {hasActiveFilters && (
        <div className="ad-filters-active">
          <span className="ad-filters-active__label">
            <FilterOutlined /> Filtres actifs :
          </span>
          {filters.departement_id && (
            <Tag
              color="red"
              closable
              onClose={() => setFilters((f) => ({ ...f, departement_id: undefined }))}
            >
              {formatDepartment(filters.departement_id)}
            </Tag>
          )}
          {filters.up_id && (
            <Tag
              color="orange"
              closable
              onClose={() => setFilters((f) => ({ ...f, up_id: undefined }))}
            >
              {formatUP(filters.up_id)}
            </Tag>
          )}
          {filters.niveau_risque && (
            <Tag
              color="purple"
              closable
              onClose={() => setFilters((f) => ({ ...f, niveau_risque: undefined }))}
            >
              Risque {RISK_LABELS[filters.niveau_risque]}
            </Tag>
          )}
          <span className="ad-filters-active__hint">
            At-risk, heatmap et alertes sont filtrés · tendances sur {trendWindow.label}
          </span>
        </div>
      )}

      {/* ── Ligne 1 : KPI globaux (données réelles) ─────────────── */}
      <Row gutter={[16, 16]} className="ad-kpi-row">
        <Col xs={12} md={6}>
          <RichKpi
            title="Enseignants en base"
            tone="primary"
            icon={<TeamOutlined />}
            value={formatCount(kpis?.nb_enseignants)}
            tooltip={KPI_DEFS['Enseignants en base']}
            loading={impact.isLoading}
            onClick={() => jump('sec-atrisk')}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Indice de risque moyen"
            tone="warning"
            icon={<LineChartOutlined />}
            value={(kpis?.avg_risk_score ?? 0).toFixed(2)}
            tooltip={KPI_DEFS['Indice de risque moyen']}
            loading={impact.isLoading}
            onClick={() => jump('sec-atrisk')}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Gaps critiques"
            tone="danger"
            icon={<AlertOutlined />}
            value={formatCount(kpis?.nb_gaps_critiques)}
            hint="Urgence CRITIQUE"
            tooltip={KPI_DEFS['Gaps critiques']}
            loading={impact.isLoading}
            onClick={() => jump('sec-heatmap')}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Alertes non traitées"
            tone="info"
            icon={<WarningOutlined />}
            value={formatCount(kpis?.nb_alertes_non_traitees)}
            tooltip={KPI_DEFS['Alertes non traitées']}
            loading={impact.isLoading}
            onClick={() => jump('sec-alertes')}
          />
        </Col>
      </Row>

      {/* ── Ligne 1b : KPI décisionnels ─────────────── */}
      <Row gutter={[16, 16]} className="ad-kpi-row">
        <Col xs={12} md={6}>
          <RichKpi
            title="Taux de couverture"
            tone="success"
            icon={<RiseOutlined />}
            value={`${(kpis?.taux_couverture_pct ?? 0).toFixed(1)}%`}
            tooltip={KPI_DEFS['Taux de couverture']}
            loading={impact.isLoading}
            onClick={() => jump('sec-heatmap')}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Gaps haute priorité"
            tone="warning"
            icon={<FallOutlined />}
            value={formatCount(kpis?.nb_gaps_haute)}
            tooltip={KPI_DEFS['Gaps haute priorité']}
            loading={impact.isLoading}
            onClick={() => jump('sec-heatmap')}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Avec gaps calculés"
            tone="info"
            icon={<RiseOutlined />}
            value={formatCount(kpis?.nb_enseignants_avec_gaps)}
            tooltip={KPI_DEFS['Avec gaps calculés']}
            loading={impact.isLoading}
            onClick={() => jump('sec-supply-demand')}
          />
        </Col>
        <Col xs={12} md={6}>
          <RichKpi
            title="Alertes critiques ouvertes"
            tone="danger"
            icon={<AlertOutlined />}
            value={formatCount(kpis?.nb_alertes_critiques)}
            tooltip={KPI_DEFS['Alertes critiques ouvertes']}
            loading={impact.isLoading}
            onClick={() => jump('sec-alertes')}
          />
        </Col>
      </Row>

      {/* ── Ligne 2 : à risque + impact formations ─────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Section
            id="sec-atrisk"
            title="Enseignants à risque (score ≥ 0,5)"
            icon={<SafetyCertificateOutlined />}
            extra={
              <Tooltip
                title={`${filteredAtRisk.length} enseignant(s) avec score ≥ 0,5 sur ${allAtRisk.length} suivis`}
              >
                <Tag color={filteredAtRisk.length ? 'red' : 'default'}>
                  {filteredAtRisk.length} / {allAtRisk.length}
                </Tag>
              </Tooltip>
            }
            loading={impact.isLoading}
          >
            <AtRiskTeachersTable
              teachers={filteredAtRisk}
              loading={impact.isLoading}
              onSelect={(id) => navigate(`/home/analytics/teacher/${id}`)}
            />
          </Section>
        </Col>
        <Col xs={24} lg={10}>
          <Section
            id="sec-impact"
            title="Impact des formations"
            icon={<TrophyOutlined />}
            loading={impact.isLoading}
          >
            <TrainingImpactPanel />
          </Section>
        </Col>

        {/* ── Ligne 3 : heatmap + offre/demande ─────── */}
        <Col xs={24} lg={14}>
          <Section
            id="sec-heatmap"
            title="Cartographie des écarts — Département × Compétence"
            icon={<HeatMapOutlined />}
            extra={
              <Tooltip title="Cliquez une cellule pour voir les enseignants impactés">
                <HeatMapOutlined style={{ color: '#c8102e' }} />
              </Tooltip>
            }
            loading={impact.isLoading}
          >
            {filteredHeatmap.length ? (
              <Heatmap
                cells={filteredHeatmap}
                loading={impact.isLoading}
                onCellClick={(d, c, n) =>
                  setDrill({ departement: d, competenceId: c, competenceNom: n })
                }
              />
            ) : (
              <div className="ad-empty">
                <Empty description="Aucun gap pour ce département" />
              </div>
            )}
          </Section>
        </Col>
        <Col xs={24} lg={10}>
          <Section
            id="sec-supply-demand"
            title="Offre / Demande par compétence"
            icon={<AppstoreOutlined />}
            loading={supplyDemand.isLoading}
          >
            <SupplyDemandChart data={supplyDemand.data} loading={supplyDemand.isLoading} />
          </Section>
        </Col>

        {/* ── Ligne 4 : alertes + tendances ─────── */}
        <Col xs={24} lg={12}>
          <Section
            id="sec-alertes"
            title="Alertes & signaux à traiter"
            icon={<WarningOutlined />}
            extra={<Tag color="orange">{formatCount(alerts.data?.total)}</Tag>}
            loading={alerts.isLoading}
          >
            <AlertCenter
              alerts={accumAlerts}
              loading={alerts.isLoading}
              loadingMore={alerts.isFetching && alertsPage > 1}
              total={alertOpenTotal}
              severityTotal={alerts.data?.severity_open}
              canLoadMore={canLoadMoreAlerts}
              onLoadMore={() => setAlertsPage((p) => p + 1)}
              onUpdate={(id, payload) => updateAlert.mutate({ id, payload })}
              onSelectEnseignant={(id) => navigate(`/home/analytics/teacher/${id}`)}
            />
          </Section>
        </Col>
        <Col xs={24} lg={12}>
          <Section
            title={`Tendances d'évolution du risque (${trendWindow.label})`}
            icon={<RiseOutlined />}
            loading={trends.isLoading}
          >
            {trends.data?.length ? (
              <TrendChart trends={trends.data} loading={trends.isLoading} />
            ) : (
              <div className="ad-empty">
                <Empty description="Aucune donnée de tendance (snapshots historiques)" />
              </div>
            )}
          </Section>
        </Col>

        {/* ── Ligne 5 : top formations + actions prioritaires ─────── */}
        <Col xs={24} lg={14}>
          <Section
            title="Formations recommandées (argumentées)"
            icon={<TrophyOutlined />}
            loading={impact.isLoading}
          >
            {topFormations.length ? (
              <TopFormationsTable formations={topFormations} />
            ) : (
              <div className="ad-empty">
                <Empty description="Aucune recommandation récente" />
              </div>
            )}
          </Section>
        </Col>
        <Col xs={24} lg={10}>
          <Section
            title="Plan d'action prioritaire"
            icon={<ArrowDownOutlined />}
            loading={impact.isLoading}
          >
            <PriorityActions kpis={kpis} atRisk={filteredAtRisk} onFilter={setFilters} />
          </Section>
        </Col>
      </Row>

      {/* ── Modal méthodologie ─────────────── */}
      <Modal
        title="Méthodologie du score de risque"
        open={methodOpen}
        onOk={() => setMethodOpen(false)}
        onCancel={() => setMethodOpen(false)}
        footer={null}
      >
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          L'<b>indice de risque</b> (0–1) est calculé par un modèle multi-facteurs pondérant :
          l'absence de formation récente, la stagnation, les gaps critiques et les besoins non
          couverts. Seuils : <Tag color="green">FAIBLE &lt; 0,25</Tag>{' '}
          <Tag color="orange">MODÉRÉ 0,25–0,5</Tag> <Tag color="red">ÉLEVÉ 0,5–0,75</Tag>{' '}
          <Tag color="red">CRITIQUE ≥ 0,75</Tag>.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          Toutes les données affichées sont issues de la <b>base PostgreSQL réelle</b> (schémas{' '}
          <code>formation</code>, <code>competence</code> et <code>analyse</code> : skill_gaps,
          teacher_risk_snapshots, alert_events, recommendations). Aucun jeu de données de
          démonstration n'est utilisé. La heatmap, les enseignants à risque, les alertes et les
          tendances mensuelles sont recalculés depuis ces tables.
        </p>
      </Modal>

      {/* ── Modal drill-down heatmap ─────────────── */}
      <Modal
        title={`Enseignants impactés — ${drill?.competenceNom ?? ''}`}
        open={!!drill}
        onCancel={() => setDrill(null)}
        footer={null}
        width={720}
        styles={{ body: { overflowX: 'auto' } }}
      >
        {drillQuery.isLoading && (
          <div className="ad-loading">
            <Spin />
          </div>
        )}
        {drillQuery.data && drillQuery.data.length > 0 && (
          <table className="ad-drill-tbl">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Département</th>
                <th>UP</th>
                <th>Écart moyen</th>
                <th>Urgence</th>
              </tr>
            </thead>
            <tbody>
              {drillQuery.data.map((t: Record<string, unknown>, i: number) => (
                <tr key={String(t.enseignant_id ?? i)}>
                  <td>{String(t.nom ?? '')}</td>
                  <td>{formatDepartment(String(t.departement ?? '')) || 'Non affecté'}</td>
                  <td>{formatUP(String(t.up ?? '')) || 'Non affecté'}</td>
                  <td style={{ fontWeight: 600 }}>{Math.round(Number(t.gap_moyen ?? 0) * 100)}%</td>
                  <td>
                    <Tag>{String(t.urgence ?? '')}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {drillQuery.data?.length === 0 && (
          <Empty description="Aucun enseignant sur cette cellule" />
        )}
      </Modal>
    </div>
  );
}

/* ── Bloc "Actions prioritaires" (orienté décision) ─────────── */
function PriorityActions({
  kpis,
  atRisk,
  onFilter,
}: {
  readonly kpis: RealDashboardImpact['kpis'] | undefined;
  readonly atRisk: AtRiskTeacher[];
  readonly onFilter: (f: DashboardFilters) => void;
}) {
  const actions: {
    label: string;
    count: number;
    tone: 'red' | 'orange';
    filter?: DashboardFilters;
  }[] = [
    {
      label: 'Traiter les alertes critiques ouvertes',
      count: kpis?.nb_alertes_critiques ?? 0,
      tone: 'red',
    },
    {
      label: 'Couvrir les gaps critiques (urgence CRITIQUE)',
      count: kpis?.nb_gaps_critiques ?? 0,
      tone: 'red',
    },
    { label: 'Traiter les gaps haute priorité', count: kpis?.nb_gaps_haute ?? 0, tone: 'orange' },
    {
      label: 'Enseignants avec gaps calculés',
      count: kpis?.nb_enseignants_avec_gaps ?? 0,
      tone: 'orange',
    },
    {
      label: 'Examiner les enseignants à risque CRITIQUE',
      count: atRisk.filter((t) => t.niveau_risque === 'CRITIQUE').length,
      tone: 'red',
      filter: { niveau_risque: 'CRITIQUE' },
    },
  ];
  return (
    <ul className="ad-actions">
      {actions.map((a) => (
        <li key={a.label}>
          <span className={`ad-actions__badge ad-actions__badge--${a.tone}`}>
            {formatCount(a.count)}
          </span>
          <span className="ad-actions__label">{a.label}</span>
          {a.filter && (
            <Button size="small" type="link" onClick={() => onFilter(a.filter!)}>
              Filtrer
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Tableau « Top formations » enrichi ─────────────────── */
function TopFormationsTable({ formations }: { readonly formations: TopFormation[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="ad-drill-tbl">
        <thead>
          <tr>
            <th>Formation</th>
            <th>Compétences</th>
            <th>Enseignants</th>
            <th>Score</th>
            <th>Impact estimé</th>
          </tr>
        </thead>
        <tbody>
          {formations.map((f, i) => (
            <tr key={String(f.formation_id ?? i)}>
              <td>
                <b>{f.formation_titre}</b>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {f.departements?.map(formatDepartment).join(', ')}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {f.competences_couvertes?.map((c) => (
                    <Tag key={c} style={{ fontSize: 11, margin: 0 }}>
                      {c}
                    </Tag>
                  )) ?? '—'}
                </div>
              </td>
              <td>
                <Tag>{f.enseignants_cibles ?? 0}</Tag>
              </td>
              <td>
                <span style={{ fontWeight: 700, color: '#c8102e' }}>
                  {Math.round(Number(f.score_moyen ?? 0) * 100)}%
                </span>
              </td>
              <td>
                {(() => {
                  if (f.impact_estime > 0.5) return <Tag color="red">Baisse risque élevée</Tag>;
                  if (f.impact_estime > 0.25)
                    return <Tag color="orange">Baisse risque moyenne</Tag>;
                  return <Tag color="default">À évaluer</Tag>;
                })()}
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  −{Math.round(Number(f.impact_estime ?? 0) * 100)}% risque
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

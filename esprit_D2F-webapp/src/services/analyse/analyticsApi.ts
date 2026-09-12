/**
 * Service API centralisé du feature-module Analytics.
 *
 * Toutes les requêtes passent par le client HTTP global (cookie HttpOnly JWT,
 * intercepteurs 401/403) et par la gateway : /api/v1/analytics.
 * Aucun appel direct aux microservices internes n'est effectué côté frontend.
 *
 * Le backend réel est le module predictive-analytics : le nouveau DDD
 * (app.api.v1) enveloppe ses réponses dans { data, meta, errors }, tandis que
 * les endpoints legacy (app_legacy, lus depuis la base PostgreSQL réelle)
 * renvoient des payloads bruts. `unpack` gère les deux formes.
 * Le gateway route /api/analyse/** vers le service avec le rewrite
 * /api/analyse/(.*) -> /api/(.*), donc pour atteindre /api/v1/analytics/...
 * le frontend appelle /api/analyse/v1/analytics/... (config.ANALYSE_URL = "/api").
 *
 * Endpoints couverts (alignés sur le nouveau module) :
 *   - /teachers/{id}/risk, /teachers/{id}/gaps, /teachers/{id}/recommendations
 *   - /dashboard/global (KPIs + à-risque + heatmap + formations réelles),
 *     /dashboard/teachers-at-risk, /dashboard/gap-heatmap,
 *     /dashboard/risk-evolution, /alerts (+ PATCH statut)
 * Les réponses (enveloppe) sont mappées vers les types UI stricts définis
 * dans @/models/analyse/analyticsFeature pour que les composants restent
 * découplés du backend.
 */
import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
import { riskLabel } from '@/utils/analytics/format';
import type {
  AnalyseResult,
  AlertEvent,
  AlertListResponse,
  AlertUpdatePayload,
  AtRiskTeacher,
  RealDashboardImpact,
  TeacherScopeAnalysis,
  DashboardFilters,
  DashboardResponse,
  DecliningSkill,
  DriftReport,
  GapsResponse,
  HeatmapCell,
  ModelMode,
  ModelStatus,
  NiveauRisque,
  NiveauUrgence,
  PilotageResponse,
  Recommendation,
  RecommendationsResponse,
  RetrainResponse,
  RiskFactor,
  RiskHistoryResponse,
  RiskScore,
  SeveriteAlerte,
  SkillGap,
  StatutAlerte,
  TopFormation,
  TrainingImpactResponse,
  TrainingImpactTopFormationsResponse,
  TrainingPath,
  TrendPoint,
  TypeAlerte,
  WhatIfRequestPayload,
  WhatIfResponse,
} from '@/models/analyse/analyticsFeature';

const BASE = `${config.ANALYSE_URL}/analyse/v1/analytics`;

function toParams(filters?: DashboardFilters): Record<string, unknown> {
  if (!filters) return {};
  const p: Record<string, unknown> = {};
  if (filters.departement_id) p.departement_id = filters.departement_id;
  if (filters.up_id) p.up_id = filters.up_id;
  if (filters.periode_debut) p.periode_debut = filters.periode_debut;
  if (filters.periode_fin) p.periode_fin = filters.periode_fin;
  if (filters.niveau_risque) p.niveau_risque = filters.niveau_risque;
  return p;
}

// ── Nouveau module predictive-analytics : DTO backend ───────

/** Enveloppe standard de toutes les réponses du nouveau module. */
interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  errors: unknown[];
}

/**
 * Extrait le payload de l'enveloppe {data, meta, errors}.
 * Tolérant : si la réponse est déjà le payload brut (endpoints legacy DB),
 * il est renvoyé tel quel.
 */
function unpack<T>(envelope: ApiEnvelope<T> | T): T {
  const d = (envelope as ApiEnvelope<T>)?.data;
  return d ?? (envelope as T);
}

interface BackendRiskFactor {
  feature: string;
  code: string;
  label: string;
  raw_value: number;
  normalized_value: number;
  weight: number;
  contribution: number;
  contribution_percent: number;
  /** Périmètre des gaps comptés (TEACHER / DEPARTMENT), fourni par le backend. */
  scope?: string;
  /** Type du scope (TEACHER / DEPARTMENT / UP), fourni par le backend. */
  scope_type?: string;
  /** Identifiant du scope (ex : ENS024, DEP_RESEAUX), fourni par le backend. */
  scope_id?: string | null;
  /** Libellé affichable du scope (ex : « Département Réseaux »), fourni par le backend. */
  scope_label?: string | null;
  /** Compat ancien DTO (valeur brute) — prioritaire sur rien, simple repli. */
  value?: number;
}

interface BackendRiskProfile {
  teacher_id: string;
  risk_score: number; // 0..100 (compat)
  risk_level: string; // LOW/MEDIUM/HIGH/CRITICAL (compat)
  score: number; // 0..1
  score_percent: number; // 0..100
  level: string; // LOW/MEDIUM/HIGH/CRITICAL
  level_label: string; // FAIBLE/MODERE/ELEVE/CRITIQUE
  is_capped: boolean;
  uncapped_score: number;
  factors: BackendRiskFactor[];
  computed_at: string;
}

interface BackendGapDiagnostic {
  competence_id: number;
  competence_code: string;
  competence_nom: string;
  observed_result: number; // Résultat réel observé de l'enseignant
  knowledge_difficulty_level: number; // Niveau de difficulté du savoir (référentiel)
  gap_score: number; // 0..1
  severity: string; // FAIBLE/MOYENNE/HAUTE/CRITIQUE
  trend: string; // IMPROVING/STABLE/DECLINING
  as_of: string;
}

interface BackendRecommendation {
  formation_id: number;
  titre: string;
  competence_id: number | null;
  rank_score: number;
  reason: string;
  matched_savoirs: string[];
}

interface BackendRiskRow {
  teacher_id: string;
  department_code: string;
  risk_score: number;
  risk_level: string;
  top_gap: string;
  gap_count: number;
}

interface BackendHeatmapCell {
  department_code: string;
  domain_id: string;
  gap_count: number;
  max_severity: string;
  weighted_severity: number;
}

interface BackendTrainingDemandRow {
  training_id: string;
  title: string;
  demand_count: number;
  avg_relevance: number;
  target_domains: string[];
}

// ── Mappers backend → types UI ──────────────────────────────

const RISK_LEVEL_MAP: Record<string, NiveauRisque> = {
  LOW: 'FAIBLE',
  MEDIUM: 'MODERE',
  HIGH: 'ELEVE',
  CRITICAL: 'CRITIQUE',
  FAIBLE: 'FAIBLE',
  MODERE: 'MODERE',
  MODEREE: 'MODERE',
  ELEVE: 'ELEVE',
  CRITIQUE: 'CRITIQUE',
};

const URGENCE_MAP: Record<string, NiveauUrgence> = {
  LOW: 'FAIBLE',
  MEDIUM: 'MODEREE',
  MOYENNE: 'MODEREE',
  HIGH: 'HAUTE',
  CRITICAL: 'CRITIQUE',
  CRITIQUE: 'CRITIQUE',
  FAIBLE: 'FAIBLE',
  HAUTE: 'HAUTE',
};

function mapRiskLevel(level: string | null | undefined): NiveauRisque {
  const mapped = RISK_LEVEL_MAP[(level ?? '').toUpperCase()];
  return mapped ?? 'FAIBLE';
}

function mapUrgence(level: string | null | undefined): NiveauUrgence {
  const mapped = URGENCE_MAP[(level ?? '').toUpperCase()];
  return mapped ?? 'FAIBLE';
}

/** Mappe le mode d'exécution du modèle (backend app/core/ml_status.py). */
function mapModelMode(mode: string | null | undefined): ModelMode {
  const m = (mode ?? '').toUpperCase();
  if (m === 'PRODUCTION_ML' || m === 'ML') return m === 'PRODUCTION_ML' ? 'PRODUCTION_ML' : 'ML';
  if (m === 'DEMO_ML') return 'DEMO_ML';
  // Moteur de risque en repli fail-closed : etiquete explicitement.
  if (m === 'HEURISTIC') return 'HEURISTIC';
  return 'HEURISTIC_FALLBACK';
}

/** Hash numérique stable (les IDs backend sont des chaînes de caractères). */
function hashId(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + (input.codePointAt(i) ?? 0)) >>> 0;
  }
  return h;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const FACTOR_LABELS: Record<string, string> = {
  stagnation: 'Stagnation',
  decline: 'Régression',
  attendance: 'Taux de présence',
  low_eval: 'Évaluations faibles',
  repeated_need: 'Besoins répétés',
  low_engagement: 'Faible engagement',
  // Noms réels des features du backend predictive-analytics :
  critical_gaps: 'Gaps critiques',
  high_gaps: 'Gaps de haute urgence',
  avg_gap_score: 'Score moyen des gaps',
  critical_gaps_rule: 'Règle métier (≥ 3 gaps critiques)',
  n_critical_gaps: 'Nombre de gaps critiques',
  stagnation_months: 'Mois de stagnation',
};

const PROBA_CLASS_LABELS: Record<string, string> = {
  LOW: 'Probabilité classe Faible',
  MEDIUM: 'Probabilité classe Modérée',
  HIGH: 'Probabilité classe Élevée',
  CRITICAL: 'Probabilité classe Critique',
};

function mapFactorNom(feature: string): string {
  const probaMatch = /^(.+)_proba$/i.exec(feature);
  if (probaMatch) {
    const classe = probaMatch[1].toUpperCase();
    if (PROBA_CLASS_LABELS[classe]) return PROBA_CLASS_LABELS[classe];
  }
  return FACTOR_LABELS[feature] ?? feature;
}

type BackendRiskFactorItem = BackendRiskProfile['factors'][number];

function mapHeuristicFactor(f: BackendRiskFactorItem): RiskFactor {
  const isProba = /_proba$/i.test(f.code || f.feature);
  const displayNom = f.label?.trim() ? f.label : mapFactorNom(f.code || f.feature);
  return {
    nom: displayNom,
    code: f.code ?? f.feature,
    valeur_brute: f.raw_value ?? f.value ?? 0,
    valeur_normalisee: clamp01(f.normalized_value ?? 0),
    poids: f.weight ?? 0,
    contribution: clamp01(f.contribution ?? 0),
    contribution_percent: Math.round(
      Math.max(0, Math.min(100, f.contribution_percent ?? (f.contribution ?? 0) * 100)),
    ),
    explication: `${displayNom} (valeur ${formatRaw(f.raw_value ?? 0)}, normalisée ${clamp01(
      f.normalized_value ?? 0,
    ).toFixed(2)})`,
    categorie: isProba ? 'PROBABILITE_ML' : 'FACTEUR',
    scope: f.scope ?? '',
    scope_type: f.scope_type ?? '',
    scope_id: f.scope_id ?? null,
    scope_label: f.scope_label ?? null,
  };
}

function mapRiskProfile(raw: BackendRiskProfile): RiskScore {
  const facteurs: RiskFactor[] = (raw.factors ?? []).map(mapHeuristicFactor);

  const level = raw.level ?? raw.risk_level;
  const niveau = mapRiskLevel(level);
  const score01 = clamp01(raw.score ?? (raw.risk_score ?? 0) / 100);
  return {
    enseignant_id: raw.teacher_id,
    enseignant_nom: null,
    analysis_status: 'READY',
    data_source: 'heuristic',
    score: score01,
    score_percent: Math.round(raw.score_percent ?? raw.risk_score ?? score01 * 100),
    level_label: raw.level_label ?? riskLabel(niveau),
    niveau,
    model_mode: undefined, // sera positionne par getRisk depuis meta
    model_version: null,
    model_name: null,
    facteurs,
    tendance: 'STABLE',
    precedent_score: null,
    computed_at: raw.computed_at ?? new Date().toISOString(),
    warnings: [],
    is_capped: raw.is_capped ?? false,
    uncapped_score: raw.uncapped_score ?? undefined,
  };
}

function formatRaw(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function mapGap(raw: BackendGapDiagnostic): SkillGap {
  const gapScore = clamp01(raw.gap_score ?? 0);
  return {
    id: hashId(`${raw.competence_id}:${raw.competence_code}`),
    competence_id: raw.competence_id,
    competence_code: raw.competence_code || String(raw.competence_id),
    competence_nom: raw.competence_nom || String(raw.competence_id),
    domaine_nom: null,
    observed_result: raw.observed_result ?? 0,
    knowledge_difficulty_level: raw.knowledge_difficulty_level ?? 5,
    gap_score: gapScore,
    priorite_score: gapScore,
    niveau_urgence: mapUrgence(raw.severity),
    mois_stagnation: 0,
    en_regression: raw.trend === 'DECLINING',
    nb_besoins_exprimes: 0,
    justification: null,
    computed_at: raw.as_of ?? new Date().toISOString(),
  };
}

// ── Scope-Analysis (analyse contextuelle) ────────────────
interface BackendTeacherContext {
  teacher_id: string;
  nom_complet: string;
  mail: string;
  specialite: string | null;
  grade: string | null;
  up_id: string | null;
  up_libelle: string | null;
  dept_id: string | null;
  dept_libelle: string | null;
}

interface BackendTeacherScopeAnalysis {
  context: BackendTeacherContext;
  gaps: BackendGapDiagnostic[];
  recommendations: BackendRecommendation[];
  scoped_competencies_count: number;
  total_competencies_count: number;
  scope: {
    type: 'GLOBAL' | 'DEPARTMENT' | 'UP';
    is_global: boolean;
    label: string;
  };
  computed_at: string;
}

function mapRecommendation(raw: BackendRecommendation): Recommendation {
  return {
    id: hashId(`${raw.formation_id}`),
    formation_id: raw.formation_id,
    formation_titre: raw.titre,
    formation_type: null,
    competence_id: raw.competence_id ?? 0,
    competence_nom: raw.matched_savoirs?.[0] ?? null,
    score_global: raw.rank_score,
    score_pertinence: raw.rank_score,
    score_reussite: 0,
    score_disponibilite: 0,
    probabilite_reussite: raw.rank_score,
    rang_dans_parcours: 0,
    est_prerequis: false,
    prerequis_satisfaits: false,
    niveau_apres: null,
    niveau_actuel: null,
    justification: raw.reason || null,
    statut: 'PROPOSEE',
  };
}

function mapRiskRow(raw: unknown): AtRiskTeacher {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    enseignant_id: String(source.enseignant_id ?? source.teacher_id ?? ''),
    nom: String(source.nom ?? source.teacher_name ?? source.teacher_id ?? ''),
    departement: String(source.departement ?? source.department_code ?? '') || null,
    up: String(source.up ?? '') || null,
    score_risque: Number(source.score_risque ?? source.risk_score ?? 0),
    niveau_risque: mapRiskLevel(String(source.niveau_risque ?? source.risk_level ?? '')),
    nb_gaps_critiques: Number(source.nb_gaps_critiques ?? source.gap_count ?? 0),
    tendance: String(source.tendance ?? 'STABLE'),
  };
}

function mapHeatmapCell(raw: unknown): HeatmapCell {
  const source = (raw ?? {}) as Record<string, unknown>;
  const avgGap = Number(source.avg_gap ?? source.weighted_severity ?? 0);
  const count = Number(source.enseignants_count ?? source.gap_count ?? 0);
  return {
    departement: String(source.departement ?? source.department_code ?? ''),
    competence_id: Number(source.competence_id ?? hashId(String(source.domain_id ?? 'ALL'))),
    competence_nom: String(source.competence_nom ?? source.domain_id ?? ''),
    avg_gap: clamp01(avgGap),
    enseignants_count: count,
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function mapTopFormation(raw: unknown): TopFormation {
  const source = (raw ?? {}) as Record<string, unknown>;
  const impact = Number(source.impact_estime ?? source.avg_relevance ?? 0);
  const competencesCouvertes = asStringArray(source.competences_couvertes);
  return {
    formation_id: Number(source.formation_id ?? hashId(String(source.training_id ?? ''))),
    formation_titre: String(source.formation_titre ?? source.title ?? ''),
    nb_recommandations: Number(source.nb_recommandations ?? source.demand_count ?? 0),
    score_moyen: Number(source.score_moyen ?? source.avg_relevance ?? 0),
    proba_reussite_moy: Number(source.proba_reussite_moy ?? source.avg_relevance ?? 0),
    enseignants_cibles: Number(source.enseignants_cibles ?? source.demand_count ?? 0),
    departements: asStringArray(source.departements),
    competences_couvertes:
      competencesCouvertes.length > 0 ? competencesCouvertes : asStringArray(source.target_domains),
    impact_estime: clamp01(impact),
  };
}

/** Payload du endpoint réel /dashboard/global (lisible aussi sans enveloppe). */
interface BackendGlobalPayload {
  real_kpis?: Record<string, unknown>;
  enseignants_a_risque?: BackendRiskRow[];
  department_gap_heatmap?: BackendHeatmapCell[];
  top_formations_recommandees?: BackendTrainingDemandRow[];
  monthly_risk_evolution?: BackendRiskEvolutionRow[];
  competences_en_declin?: BackendHeatmapCell[];
  generated_at?: string;
  kpis?: Record<string, unknown>;
}

function mapGlobalKpis(
  payload: BackendGlobalPayload,
  atRisk: AtRiskTeacher[],
): DashboardResponse['kpis'] {
  const k = payload?.real_kpis ?? payload?.kpis ?? {};
  const kpis = (k ?? {}) as Record<string, unknown>;
  const nb = Number(kpis.nb_enseignants_suivis ?? atRisk.length ?? 0);
  const score = Number(kpis.score_risque_moyen ?? 0);
  return {
    nb_enseignants_suivis: Number.isFinite(nb) ? nb : 0,
    nb_profils_risque: Number(kpis.nb_profils_risque ?? nb ?? 0) || 0,
    score_risque_moyen: Number.isFinite(score) ? score : 0,
    nb_gaps_critiques: Number(kpis.nb_gaps_critiques ?? 0) || 0,
    nb_alertes_nouvelles: Number(kpis.nb_alertes_nouvelles ?? 0) || 0,
    taux_couverture_global: Number(kpis.taux_couverture_global ?? 0) || 0,
    nb_regression: Number(kpis.nb_regression ?? 0) || 0,
    nb_stagnation: Number(kpis.nb_stagnation ?? 0) || 0,
    besoins_critiques_non_satisfaits: Number(kpis.besoins_critiques_non_satisfaits ?? 0) || 0,
    alertes_critiques_ouvertes: Number(kpis.alertes_critiques_ouvertes ?? 0) || 0,
  };
}

/** Distribution du risque calculée depuis la liste des enseignants à risque. */
function computeDistribution(atRisk: AtRiskTeacher[]): DashboardResponse['distribution_risques'] {
  const dist: Record<string, number> = { FAIBLE: 0, MODERE: 0, ELEVE: 0, CRITIQUE: 0 };
  atRisk.forEach((t) => {
    dist[t.niveau_risque] = (dist[t.niveau_risque] ?? 0) + 1;
  });
  return Object.entries(dist).map(([niveau, count]) => ({ niveau: niveau as NiveauRisque, count }));
}

function mapModelStatus(raw: unknown): ModelStatus {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    version: (r.last_retrain_status as string) ?? 'n/a',
    entraîné_le: (r.last_retrained as string) ?? null,
    algorithme: 'GradientBoosting',
    features_count: 0,
    accuracy: (r.gap_model_accuracy as number) ?? null,
    f1_score: null,
    drift_detected: false,
    derniere_verification_integrite: null,
    integrite_ok: true,
    source: 'modele',
    disponible: r.gap_model_accuracy !== null && r.gap_model_accuracy !== undefined,
  };
}

function mapDrift(raw: unknown): DriftReport {
  const points = Array.isArray(raw) ? (raw as Array<{ critical?: number }>) : [];
  return {
    drift_detected: false,
    metric: 'risk_evolution',
    valeur_actuelle: points.length ? (points.at(-1)?.critical ?? 0) : 0,
    seuil: 0,
    jours_depuis_entrainement: 0,
    message: 'Évolution du risque (backend /dashboard/risk-evolution).',
    detected_at: new Date().toISOString(),
  };
}

// ── Alertes réelles (nouveau module DDD : enveloppe {data, meta, errors}) ──

interface BackendAlertRow {
  id: number | null;
  alert_type: string;
  target_type: string;
  teacher_id: string | null;
  department_id: string | null;
  competence_id: number | null;
  severity: string;
  title: string;
  message: string;
  details: Record<string, unknown>;
  status: string;
  created_at: string | null;
}

const ALERT_TYPE_MAP: Record<string, TypeAlerte> = {
  GAP_CRITIQUE: 'GAP_CRITIQUE',
  REGRESSION: 'REGRESSION',
  STAGNATION: 'STAGNATION',
  TENDANCE_DEPARTEMENT: 'TENDANCE_DEPARTEMENT',
  COMPLETION_FAIBLE: 'COMPLETION_FAIBLE',
  BESOIN_NON_COUVERT: 'BESOIN_NON_COUVERT',
};

function mapAlertType(raw: string | null | undefined): TypeAlerte {
  return ALERT_TYPE_MAP[(raw ?? '').toUpperCase()] ?? 'BESOIN_NON_COUVERT';
}

function mapAlertSeverity(raw: string | null | undefined): SeveriteAlerte {
  const sev = (raw ?? '').toUpperCase();
  if (sev === 'CRITIQUE' || sev === 'CRITICAL') return 'CRITICAL';
  if (sev === 'INFO') return 'INFO';
  return 'WARNING';
}

/** Cycle de vie DDD : NOUVELLE | ACK | RESOLUE | IGNOREE | ESCALADEE. */
function mapAlertStatus(raw: string | null | undefined): StatutAlerte {
  const s = (raw ?? '').toUpperCase();
  if (s === 'ACK') return 'LUE';
  if (s === 'RESOLUE') return 'TRAITEE';
  if (s === 'IGNOREE') return 'IGNOREE';
  if (s === 'ESCALADEE') return 'ESCALADEE';
  return 'NOUVELLE';
}

/** Statut UI → statut backend DDD (PATCH /alerts/{id}/status). */
function toBackendStatus(statut: StatutAlerte): string {
  if (statut === 'TRAITEE') return 'RESOLUE';
  if (statut === 'LUE') return 'ACK';
  return statut;
}

function mapCibleType(raw: string | null | undefined): 'INDIVIDUEL' | 'DEPARTEMENT' | 'GLOBAL' {
  if (raw === 'DEPARTEMENT') return 'DEPARTEMENT';
  if (raw === 'GLOBAL') return 'GLOBAL';
  return 'INDIVIDUEL';
}

function mapAlert(raw: BackendAlertRow): AlertEvent {
  return {
    id: raw.id ?? hashId(`${raw.alert_type}:${raw.teacher_id ?? ''}`),
    type_alerte: mapAlertType(raw.alert_type),
    cible_type: mapCibleType(raw.target_type),
    enseignant_id: raw.teacher_id ?? null,
    departement_id: raw.department_id ?? null,
    competence_id: raw.competence_id ?? null,
    severite: mapAlertSeverity(raw.severity),
    titre: raw.title || raw.alert_type,
    message: raw.message ?? '',
    statut: mapAlertStatus(raw.status),
    created_at: raw.created_at ?? new Date().toISOString(),
  };
}

// ── Évolution mensuelle du risque (endpoint réel /dashboard/risk-evolution) ──

interface BackendRiskEvolutionRow {
  month: string;
  critical: number;
  high: number;
  score_risque_moyen: number;
  total_enseignants: number;
}

function mapRiskEvolutionRow(raw: BackendRiskEvolutionRow): TrendPoint {
  return {
    month: raw.month,
    nb_gaps_critiques: raw.critical ?? 0,
    score_risque_moyen: raw.score_risque_moyen ?? 0,
    nb_alertes: raw.total_enseignants ?? 0,
  };
}

export const analyticsApi = {
  // ── Analyse individuelle ──────────────────────────────
  analyze(enseignantId: string): Promise<AnalyseResult> {
    return axios.post<AnalyseResult>(`${BASE}/analysis/${enseignantId}`).then((r) => r.data);
  },

  getGaps(
    enseignantId: string,
    opts: { urgence?: string; page?: number; size?: number } = {},
  ): Promise<GapsResponse> {
    return axios
      .get<ApiEnvelope<BackendGapDiagnostic[]>>(`${BASE}/teachers/${enseignantId}/gaps`, {
        params: { page: (opts.page ?? 0) + 1, size: opts.size ?? 20 },
      })
      .then((r) => {
        const list = unpack(r.data) ?? [];
        const mapped = list.map(mapGap);
        const unique = new Map<number, SkillGap>();
        for (const g of mapped) {
          const existing = unique.get(g.competence_id);
          if (!existing || g.gap_score > existing.gap_score) unique.set(g.competence_id, g);
        }
        const deduped = Array.from(unique.values());
        const filtered = opts.urgence
          ? mapped.filter((g) => g.niveau_urgence === opts.urgence)
          : mapped;
        const size = opts.size ?? filtered.length;
        const start = (opts.page ?? 0) * size;
        const meta = (r.data as ApiEnvelope<unknown> | undefined)?.meta ?? {};
        const m = meta as Record<string, unknown>;
        const provenance = (m.provenance ?? {}) as Record<string, unknown>;
        return {
          enseignant_id: enseignantId,
          total: filtered.length,
          page: opts.page ?? 0,
          size,
          gaps: filtered.slice(start, start + size),
          gaps_summary: {
            total: deduped.length,
            critical: deduped.filter((g) => g.niveau_urgence === 'CRITIQUE').length,
            high: deduped.filter((g) => g.niveau_urgence === 'HAUTE').length,
            stagnant: deduped.filter((g) => g.mois_stagnation > 0).length,
            declining: deduped.filter((g) => g.en_regression).length,
          },
          model: {
            model_mode: mapModelMode((m.model_mode as string) ?? undefined),
            model_version: (m.model_version as string) ?? undefined,
            fallback_reason: (m.fallback_reason as string) ?? undefined,
            dataset_version: (provenance.dataset_version as string) ?? undefined,
            prediction_horizon: (m.prediction_horizon as string) ?? undefined,
            synthetic_share_pct:
              typeof m.synthetic_share_pct === 'number' ? m.synthetic_share_pct : undefined,
            total_rows:
              typeof provenance.total_rows === 'number' ? provenance.total_rows : undefined,
            real_rows: typeof provenance.real_rows === 'number' ? provenance.real_rows : undefined,
            target_validity: (m.target_validity as string) ?? null,
            target_validity_label: (m.target_validity_label as string) ?? null,
            data_origin: (m.data_origin as string) ?? null,
            validation_scope: (m.validation_scope as string) ?? null,
            near_boundary_warning:
              (m.near_boundary_warning as {
                code: string;
                message: string;
                features: string[];
              } | null) ?? null,
          },
          target_validity: (m.target_validity as string) ?? null,
          validation_scope: (m.validation_scope as string) ?? null,
          data_origin: (m.data_origin as string) ?? null,
        };
      });
  },

  getRecommendations(
    enseignantId: string,
    opts: { competence_id?: number; page?: number; size?: number } = {},
  ): Promise<RecommendationsResponse> {
    return axios
      .get<
        ApiEnvelope<BackendRecommendation[]>
      >(`${BASE}/teachers/${enseignantId}/recommendations`, { params: { competence_id: opts.competence_id ?? undefined, limit: opts.size ?? 20 } })
      .then((r) => {
        const recs = (unpack(r.data) ?? []).map(mapRecommendation);
        const size = opts.size ?? recs.length;
        const start = (opts.page ?? 0) * size;
        return {
          enseignant_id: enseignantId,
          total: recs.length,
          page: opts.page ?? 0,
          size,
          recommendations: recs.slice(start, start + size),
        };
      });
  },

  getTrainingPath(enseignantId: string, competenceId: number): Promise<TrainingPath> {
    return axios
      .get<TrainingPath>(`${BASE}/training-path/${enseignantId}/${competenceId}`)
      .then((r) => r.data);
  },

  // Analyse contextuelle complete (specialite / UP / departement) — nouveau endpoint.
  getTeacherScopeAnalysis(enseignantId: string): Promise<TeacherScopeAnalysis> {
    return axios
      .get<
        ApiEnvelope<BackendTeacherScopeAnalysis>
      >(`${BASE}/teachers/${enseignantId}/scope-analysis`)
      .then((r) => {
        const raw: BackendTeacherScopeAnalysis = unpack<BackendTeacherScopeAnalysis>(r.data);
        if (!raw) throw new Error('Pas de donnees scope-analysis');
        return {
          context: {
            teacher_id: raw.context.teacher_id,
            nom_complet: raw.context.nom_complet,
            mail: raw.context.mail,
            specialite: raw.context.specialite,
            grade: raw.context.grade,
            up_id: raw.context.up_id,
            up_libelle: raw.context.up_libelle,
            dept_id: raw.context.dept_id,
            dept_libelle: raw.context.dept_libelle,
          },
          gaps: (raw.gaps ?? []).map(mapGap),
          recommendations: (raw.recommendations ?? []).map(mapRecommendation),
          scoped_competencies_count: raw.scoped_competencies_count,
          total_competencies_count: raw.total_competencies_count,
          scope: {
            type: raw.scope?.type ?? 'GLOBAL',
            is_global: raw.scope?.is_global ?? true,
            label: raw.scope?.label ?? 'Périmètre global',
          },
          computed_at: raw.computed_at,
        };
      });
  },

  // Dashboard impact reel (donnees base PostgreSQL, pas le CSV legacy).
  getRealDashboardImpact(): Promise<RealDashboardImpact> {
    return axios
      .get<ApiEnvelope<RealDashboardImpact>>(`${BASE}/dashboard/real/impact`)
      .then((r) => unpack(r.data));
  },

  getRisk(enseignantId: string): Promise<RiskScore> {
    return axios
      .get<ApiEnvelope<BackendRiskProfile>>(`${BASE}/teachers/${enseignantId}/risk`)
      .then((r) => {
        const mapped = mapRiskProfile(unpack(r.data));
        const meta = (r.data.meta ?? {}) as {
          model_mode?: string;
          model_version?: string | null;
          model_name?: string | null;
          model_algorithm?: string | null;
          target_validity?: string | null;
          validation_scope?: string | null;
          data_origin?: string | null;
        };
        const data = (r.data.data ?? {}) as {
          score_type?: string | null;
          calibration_status?: string | null;
          mode?: string | null;
          risk_class?: string | null;
          probability_calibrated?: number | null;
          probabilities?: Record<string, number> | null;
          contributions?:
            | { feature: string; value: number; impact: number; method: string }[]
            | null;
          explanation_method?: string | null;
          fallback_reason?: string | null;
          heuristic_reference?: {
            description?: string;
            weights?: Record<string, number>;
            factors?: BackendRiskProfile['factors'];
          } | null;
        };
        mapped.model_mode = mapModelMode(meta.model_mode);
        mapped.model_version = meta.model_version ?? null;
        mapped.model_name = meta.model_name ?? null;
        mapped.model_algorithm = (meta.model_algorithm ?? null) as string | null;
        mapped.target_validity = meta.target_validity ?? null;
        mapped.validation_scope = meta.validation_scope ?? null;
        mapped.data_origin = meta.data_origin ?? null;
        mapped.score_type = data.score_type ?? 'WEIGHTED_HEURISTIC_INDEX';
        mapped.calibration_status = data.calibration_status ?? 'NOT_CALIBRATED';
        // Mode reellement servi : ML (modele calibre) ou HEURISTIC (repli fail-closed).
        mapped.mode = data.mode === 'ML' ? 'ML' : 'HEURISTIC';
        mapped.data_source = mapped.mode === 'ML' ? 'ml_model' : 'heuristic';
        mapped.risk_class = data.risk_class ?? null;
        mapped.probability_calibrated = data.probability_calibrated ?? null;
        mapped.probabilities = data.probabilities ?? null;
        mapped.contributions = data.contributions ?? null;
        mapped.explanation_method = data.explanation_method ?? null;
        mapped.fallback_reason = data.fallback_reason ?? null;
        mapped.heuristic_reference = data.heuristic_reference
          ? {
              description: data.heuristic_reference.description,
              weights: data.heuristic_reference.weights,
              factors: (data.heuristic_reference.factors ?? []).map(mapHeuristicFactor),
            }
          : null;
        return mapped;
      });
  },

  /** Returns the raw backend payload (RiskProfile, format v2) for diagnostics. */
  getRiskEnvelope(enseignantId: string): Promise<BackendRiskProfile> {
    return axios
      .get<ApiEnvelope<BackendRiskProfile>>(`${BASE}/teachers/${enseignantId}/risk`)
      .then((r) => unpack(r.data));
  },

  // Endpoint backend réel : /enseignants/{id}/historique-risque (F3).
  getRiskHistory(enseignantId: string, mois = 12): Promise<RiskHistoryResponse> {
    return axios
      .get<RiskHistoryResponse>(`${BASE}/enseignants/${enseignantId}/historique-risque`, {
        params: { mois },
      })
      .then((r) => r.data);
  },

  // Endpoint backend réel : /pilotage (F9).
  getPilotage(horizonMois?: number): Promise<PilotageResponse> {
    return axios
      .get<PilotageResponse>(`${BASE}/pilotage`, {
        params: horizonMois ? { horizon_mois: horizonMois } : {},
      })
      .then((r) => r.data);
  },

  // ── Dashboard global ─────────────────────────────────
  // Endpoint backend réel : /dashboard/global — snapshot recalculé depuis la
  // base PostgreSQL (skill_gaps, teacher_risk_snapshots, alert_events…).
  getDashboard(_filters?: DashboardFilters): Promise<DashboardResponse> {
    return axios
      .get<ApiEnvelope<BackendGlobalPayload> | BackendGlobalPayload>(`${BASE}/dashboard/global`, {
        params: toParams(_filters),
      })
      .then((r) => {
        const raw = unpack(r.data) as BackendGlobalPayload | undefined;
        const atRisk = (raw?.enseignants_a_risque ?? []).map(mapRiskRow);
        const heatmap = (raw?.department_gap_heatmap ?? []).map(mapHeatmapCell);
        const top_formations = (raw?.top_formations_recommandees ?? []).map(mapTopFormation);
        const tendances = (raw?.monthly_risk_evolution ?? []).map(mapRiskEvolutionRow);
        return {
          generated_at: raw?.generated_at ?? new Date().toISOString(),
          filtres: {},
          kpis: mapGlobalKpis(raw ?? {}, atRisk),
          enseignants_a_risque: atRisk,
          competences_en_declin: (raw?.competences_en_declin ?? [])
            .map(mapHeatmapCell)
            .map((c) => ({
              competence_id: c.competence_id,
              competence_nom: c.competence_nom,
              domaine_nom: null,
              variation_moyenne: 0,
              pct_enseignants_en_declin: 0,
              nb_enseignants_concernes: c.enseignants_count,
            })),
          distribution_risques: computeDistribution(atRisk),
          tendances,
          alertes_recentes: [],
          heatmap,
          top_formations,
        };
      });
  },

  // Endpoint backend réel : /dashboard/gap-heatmap (département × domaine).
  getHeatmap(_filters?: DashboardFilters): Promise<HeatmapCell[]> {
    return axios
      .get<
        ApiEnvelope<{ cells: BackendHeatmapCell[]; count: number }> | BackendHeatmapCell[]
      >(`${BASE}/dashboard/gap-heatmap`)
      .then((r) => {
        const unwrapped = (r.data as { data?: unknown })?.data ?? r.data;
        const rows = Array.isArray(unwrapped)
          ? unwrapped
          : ((unwrapped as { cells?: BackendHeatmapCell[] }).cells ?? []);
        return rows.map(mapHeatmapCell);
      });
  },

  // Endpoint backend réel : /dashboard/teachers-at-risk (seuil 0.5 fixe).
  getAtRisk(_filters?: DashboardFilters & { seuil?: number }): Promise<AtRiskTeacher[]> {
    return axios
      .get<
        ApiEnvelope<{ rows: BackendRiskRow[]; count: number }> | BackendRiskRow[]
      >(`${BASE}/dashboard/teachers-at-risk`)
      .then((r) => {
        const unwrapped = (r.data as { data?: unknown })?.data ?? r.data;
        const rows = Array.isArray(unwrapped)
          ? unwrapped
          : ((unwrapped as { rows?: BackendRiskRow[] }).rows ?? []);
        return rows.map(mapRiskRow);
      });
  },

  // Endpoint backend réel : /dashboard/teachers-by-cell (drill-down heatmap).
  getTeachersByCell(
    departement: string,
    competenceId: number,
    limit = 50,
  ): Promise<Array<Record<string, unknown>>> {
    return axios
      .get<Array<Record<string, unknown>>>(`${BASE}/dashboard/teachers-by-cell`, {
        params: { departement, competence_id: competenceId, limit },
      })
      .then((r) => r.data);
  },

  // Endpoint backend réel : /dashboard/competences-declining.
  getDecliningSkills(filters?: DashboardFilters): Promise<DecliningSkill[]> {
    return axios
      .get<DecliningSkill[]>(`${BASE}/dashboard/competences-declining`, {
        params: toParams(filters),
      })
      .then((r) => r.data);
  },

  // Endpoint backend réel : /dashboard/risk-evolution (évolution mensuelle,
  // calculée depuis les snapshots teacher_risk_snapshots de la base réelle).
  getRiskEvolution(months = 6): Promise<TrendPoint[]> {
    return axios
      .get<BackendRiskEvolutionRow[]>(`${BASE}/dashboard/risk-evolution`, { params: { months } })
      .then((r) => {
        const rows = Array.isArray(r.data) ? r.data : [];
        return rows.map(mapRiskEvolutionRow);
      });
  },

  // ── Alertes (F5/F6) ────────────────────────────────
  // Endpoint backend réel : GET /alerts (nouveau module DDD, enveloppe {data, meta, errors}).
  getAlerts(
    filters: {
      type_alerte?: string;
      severite?: string;
      statut?: string;
      enseignant_id?: string;
      departement_id?: string;
      page?: number;
      size?: number;
    } = {},
  ): Promise<AlertListResponse> {
    return axios
      .get<ApiEnvelope<BackendAlertRow[]> | BackendAlertRow[]>(`${BASE}/alerts`, {
        params: {
          page: filters.page ?? 1,
          size: filters.size ?? 100,
          severity: filters.severite,
          status: filters.statut,
          target_type: filters.type_alerte,
          department_id: filters.departement_id,
        },
      })
      .then((r) => {
        const raw = unpack(r.data);
        const list = Array.isArray(raw) ? raw : [];
        const alerts = list.map(mapAlert);
        const meta = (r.data as ApiEnvelope<BackendAlertRow[]>)?.meta;
        const totalMatching = Number(meta?.total_matching);
        const sevOpen = meta?.severity_open as
          | { CRITICAL?: number; WARNING?: number; INFO?: number }
          | undefined;
        return {
          total:
            Number.isFinite(totalMatching) && totalMatching > 0 ? totalMatching : alerts.length,
          page: 0,
          size: alerts.length,
          alerts,
          severity_open: sevOpen
            ? {
                CRITICAL: Number(sevOpen.CRITICAL ?? 0),
                WARNING: Number(sevOpen.WARNING ?? 0),
                INFO: Number(sevOpen.INFO ?? 0),
              }
            : undefined,
        };
      });
  },

  // Endpoint backend réel : PATCH /alerts/{id}/status (cycle de vie).
  updateAlert(id: number, payload: AlertUpdatePayload): Promise<{ id: number; statut: string }> {
    return axios
      .patch<{ id: number; status: string }>(`${BASE}/alerts/${id}/status`, {
        status: toBackendStatus(payload.statut),
        comment: payload.commentaire ?? null,
      })
      .then((r) => ({ id: r.data.id ?? id, statut: mapAlertStatus(r.data.status) }));
  },

  // ── Impact des formations & simulation what-if (F8) ──
  // Endpoint backend réel : GET /dashboard/training-impact (agrégats historiques).
  getTrainingImpact(): Promise<TrainingImpactResponse> {
    return axios
      .get<TrainingImpactResponse>(`${BASE}/dashboard/training-impact`)
      .then((r) => r.data);
  },

  // Endpoint backend réel : GET /dashboard/training-impact/formations (top par impact).
  getTrainingImpactFormations(page = 0, size = 10): Promise<TrainingImpactTopFormationsResponse> {
    return axios
      .get<TrainingImpactTopFormationsResponse>(`${BASE}/dashboard/training-impact/formations`, {
        params: { page, size },
      })
      .then((r) => r.data);
  },

  // Endpoint backend réel : POST /simulate/what-if (projection "et si on formait X").
  simulateWhatIf(payload: WhatIfRequestPayload): Promise<WhatIfResponse> {
    return axios.post<WhatIfResponse>(`${BASE}/simulate/what-if`, payload).then((r) => r.data);
  },

  // ── Monitoring modèle ───────────────────────────────
  // Endpoint backend réel : /dashboard/model-performance.
  getModelStatus(): Promise<ModelStatus> {
    return axios
      .get<unknown>(`${BASE}/dashboard/model-performance`)
      .then((r) => mapModelStatus(r.data));
  },

  // Endpoint backend réel : /dashboard/risk-evolution (proxy drift/évolution).
  getDrift(): Promise<DriftReport> {
    return axios.get<unknown>(`${BASE}/dashboard/risk-evolution`).then((r) => mapDrift(r.data));
  },

  // Endpoint backend réel : /admin/retrain (rollback auto si régression).
  retrain(): Promise<RetrainResponse> {
    return axios.post<RetrainResponse>(`${BASE}/admin/retrain`).then((r) => r.data);
  },

  // Pas d'endpoint rollback dédié : le rollback est automatique dans /admin/retrain
  // si la chute d'accuracy dépasse RETRAIN_MAX_ACCURACY_DROP. On renvoie un
  // objet de compatibilité pour ne pas casser le hook useModelRollback.
  rollback(): Promise<RetrainResponse> {
    return axios
      .post<RetrainResponse>(`${BASE}/admin/retrain`, { rollback_only: true })
      .then((r) => r.data);
  },
};

export default analyticsApi;

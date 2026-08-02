/**
 * Service API centralisé du feature-module Analytics.
 *
 * Toutes les requêtes passent par le client HTTP global (cookie HttpOnly JWT,
 * intercepteurs 401/403) et par la gateway : /api/v1/analytics.
 * Aucun appel direct aux microservices internes n'est effectué côté frontend.
 *
 * Le backend réel est le nouveau module predictive-analytics (moteurs purs,
 * sans base de données). Chaque réponse est enveloppée dans
 *   { data: <payload>, meta: {...}, errors: [] }.
 * Le gateway route /api/analyse/** vers le service avec le rewrite
 * /api/analyse/(.*) -> /api/(.*), donc pour atteindre /api/v1/analytics/...
 * le frontend appelle /api/analyse/v1/analytics/... (config.ANALYSE_URL = "/api").
 *
 * Endpoints couverts (alignés sur le nouveau module) :
 *   - /teachers/{id}/risk, /teachers/{id}/gaps, /teachers/{id}/recommendations
 *   - /dashboard/global, /dashboard/teachers-at-risk, /dashboard/gap-heatmap,
 *     /dashboard/training-demand
 * Les réponses (enveloppe) sont mappées vers les types UI stricts définis
 * dans @/models/analyse/analyticsFeature pour que les composants restent
 * découplés du backend.
 */
import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
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
  SkillGap,
  TopFormation,
  TrainingImpactResponse,
  TrainingImpactTopFormationsResponse,
  TrainingPath,
  WhatIfRequestPayload,
  WhatIfResponse,
} from "@/models/analyse/analyticsFeature";

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

/** Extrait le payload de l'enveloppe {data, meta, errors}. */
function unpack<T>(envelope: ApiEnvelope<T>): T {
  return envelope?.data;
}

interface BackendRiskFactor {
  feature: string;
  value: number;
  contribution: number;
}

interface BackendRiskProfile {
  teacher_id: string;
  risk_score: number; // 0..100
  risk_level: string; // LOW/MEDIUM/HIGH/CRITICAL
  factors: BackendRiskFactor[];
  computed_at: string;
}

interface BackendGapDiagnostic {
  competence_id: number;
  competence_code: string;
  competence_nom: string;
  current_level: number;
  target_level: number;
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

interface BackendGlobalKpis {
  total_teachers: number;
  teachers_with_data: number;
  teachers_at_risk: number;
  avg_risk_score: number;
  total_open_gaps: number;
  critical_gaps: number;
  open_needs: number;
  enrollment_rate: number;
  completion_rate: number;
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
  LOW: "FAIBLE",
  MEDIUM: "MODERE",
  HIGH: "ELEVE",
  CRITICAL: "CRITIQUE",
};

const URGENCE_MAP: Record<string, NiveauUrgence> = {
  LOW: "FAIBLE",
  MEDIUM: "MODEREE",
  MOYENNE: "MODEREE",
  HIGH: "HAUTE",
  CRITICAL: "CRITIQUE",
  CRITIQUE: "CRITIQUE",
  FAIBLE: "FAIBLE",
  HAUTE: "HAUTE",
};

function mapRiskLevel(level: string | null | undefined): NiveauRisque {
  const mapped = RISK_LEVEL_MAP[(level ?? "").toUpperCase()];
  return mapped ?? "FAIBLE";
}

function mapUrgence(level: string | null | undefined): NiveauUrgence {
  const mapped = URGENCE_MAP[(level ?? "").toUpperCase()];
  return mapped ?? "FAIBLE";
}

/** Hash numérique stable (les IDs backend sont des chaînes de caractères). */
function hashId(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const FACTOR_LABELS: Record<string, string> = {
  stagnation: "Stagnation",
  decline: "Régression",
  attendance: "Taux de présence",
  low_eval: "Évaluations faibles",
  repeated_need: "Besoins répétés",
  low_engagement: "Faible engagement",
};

function mapRiskProfile(raw: BackendRiskProfile): RiskScore {
  const facteurs: RiskFactor[] = (raw.factors ?? []).map((f) => {
    const poids = f.value > 0 ? Number((f.contribution / f.value).toFixed(4)) : 0;
    return {
      nom: FACTOR_LABELS[f.feature] ?? f.feature,
      valeur_brute: f.value,
      poids,
      contribution: f.contribution,
      explication: `${FACTOR_LABELS[f.feature] ?? f.feature} (valeur ${(f.value * 100).toFixed(0)}%)`,
    };
  });
  return {
    enseignant_id: raw.teacher_id,
    enseignant_nom: null,
    analysis_status: "READY",
    data_source: "heuristic",
    score: clamp01(raw.risk_score / 100),
    niveau: mapRiskLevel(raw.risk_level),
    model_mode: undefined,  // sera positionne par getRisk depuis meta
    model_version: null,
    facteurs,
    tendance: "STABLE",
    precedent_score: null,
    computed_at: raw.computed_at ?? new Date().toISOString(),
    warnings: [],
  };
}

function mapGap(raw: BackendGapDiagnostic): SkillGap {
  const gapScore = clamp01(raw.gap_score ?? 0);
  return {
    id: hashId(`${raw.competence_id}:${raw.competence_code}`),
    competence_id: raw.competence_id,
    competence_code: raw.competence_code || String(raw.competence_id),
    competence_nom: raw.competence_nom || String(raw.competence_id),
    domaine_nom: null,
    niveau_actuel: raw.current_level ?? 0,
    niveau_requis: raw.target_level ?? 5,
    niveau_vise: raw.target_level ?? 5,
    gap_score: gapScore,
    priorite_score: gapScore,
    niveau_urgence: mapUrgence(raw.severity),
    mois_stagnation: 0,
    en_regression: raw.trend === "DECLINING",
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
  is_fallback_global: boolean;
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
    statut: "PROPOSEE",
  };
}

function mapKpis(raw: BackendGlobalKpis, atRisk: AtRiskTeacher[]): DashboardResponse["kpis"] {
  const total = raw?.total_teachers ?? 0;
  const suivis = raw?.teachers_with_data ?? atRisk.length;
  return {
    nb_enseignants_suivis: suivis,
    nb_profils_risque: total,
    score_risque_moyen: raw?.avg_risk_score ?? 0,
    nb_gaps_critiques: raw?.critical_gaps ?? 0,
    nb_alertes_nouvelles: raw?.open_needs ?? 0,
    taux_couverture_global: total > 0 ? Number((suivis / total).toFixed(4)) : 0,
    nb_regression: 0,
    nb_stagnation: raw?.teachers_at_risk ?? atRisk.length,
    besoins_critiques_non_satisfaits: raw?.open_needs ?? 0,
    alertes_critiques_ouvertes: 0,
  };
}

function mapRiskRow(raw: BackendRiskRow): AtRiskTeacher {
  return {
    enseignant_id: raw.teacher_id,
    nom: raw.teacher_id,
    departement: raw.department_code || null,
    up: null,
    score_risque: raw.risk_score,
    niveau_risque: mapRiskLevel(raw.risk_level),
    nb_gaps_critiques: raw.gap_count,
    tendance: "STABLE",
  };
}

function mapHeatmapCell(raw: BackendHeatmapCell): HeatmapCell {
  const avg = raw.gap_count > 0 ? raw.weighted_severity / raw.gap_count : 0;
  return {
    departement: raw.department_code,
    competence_id: hashId(raw.domain_id || "ALL"),
    competence_nom: raw.domain_id,
    avg_gap: clamp01(avg),
    enseignants_count: raw.gap_count,
  };
}

function mapTopFormation(raw: BackendTrainingDemandRow): TopFormation {
  return {
    formation_id: hashId(raw.training_id),
    formation_titre: raw.title,
    nb_recommandations: raw.demand_count,
    score_moyen: raw.avg_relevance,
    proba_reussite_moy: raw.avg_relevance,
    enseignants_cibles: raw.demand_count,
    departements: [],
    competences_couvertes: raw.target_domains,
    impact_estime: raw.avg_relevance,
  };
}

function mapModelStatus(raw: unknown): ModelStatus {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    version: (r.last_retrain_status as string) ?? "n/a",
    entraîné_le: (r.last_retrained as string) ?? null,
    algorithme: "GradientBoosting",
    features_count: 0,
    accuracy: (r.gap_model_accuracy as number) ?? null,
    f1_score: null,
    drift_detected: false,
    derniere_verification_integrite: null,
    integrite_ok: true,
    source: "modele",
    disponible: r.gap_model_accuracy !== null && r.gap_model_accuracy !== undefined,
  };
}

function mapDrift(raw: unknown): DriftReport {
  const points = Array.isArray(raw) ? (raw as Array<{ critical?: number }>) : [];
  return {
    drift_detected: false,
    metric: "risk_evolution",
    valeur_actuelle: points.length ? points.at(-1)?.critical ?? 0 : 0,
    seuil: 0,
    jours_depuis_entrainement: 0,
    message: "Évolution du risque (backend /dashboard/risk-evolution).",
    detected_at: new Date().toISOString(),
  };
}

export const analyticsApi = {
  // ── Analyse individuelle ──────────────────────────────
  analyze(enseignantId: string): Promise<AnalyseResult> {
    return axios
      .post<AnalyseResult>(`${BASE}/analysis/${enseignantId}`)
      .then((r) => r.data);
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
        const filtered = opts.urgence
          ? mapped.filter((g) => g.niveau_urgence === opts.urgence)
          : mapped;
        const size = opts.size ?? filtered.length;
        const start = (opts.page ?? 0) * size;
        return {
          enseignant_id: enseignantId,
          total: filtered.length,
          page: opts.page ?? 0,
          size,
          gaps: filtered.slice(start, start + size),
        };
      });
  },

  getRecommendations(
    enseignantId: string,
    opts: { competence_id?: number; page?: number; size?: number } = {},
  ): Promise<RecommendationsResponse> {
    return axios
      .get<ApiEnvelope<BackendRecommendation[]>>(
        `${BASE}/teachers/${enseignantId}/recommendations`,
        { params: { competence_id: opts.competence_id ?? undefined, limit: opts.size ?? 20 } },
      )
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
      .get<ApiEnvelope<BackendTeacherScopeAnalysis>>(`${BASE}/teachers/${enseignantId}/scope-analysis`)
      .then((r) => {
        const raw: BackendTeacherScopeAnalysis = unpack<BackendTeacherScopeAnalysis>(r.data);
        if (!raw) throw new Error("Pas de donnees scope-analysis");
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
          is_fallback_global: raw.is_fallback_global,
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
        const meta = (r.data.meta ?? {}) as { model_mode?: string; model_version?: string | null };
        mapped.model_mode = meta.model_mode === "ML" ? "ML" : "HEURISTIC_FALLBACK";
        mapped.model_version = meta.model_version ?? null;
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
      .get<PilotageResponse>(`${BASE}/pilotage`, { params: horizonMois ? { horizon_mois: horizonMois } : {} })
      .then((r) => r.data);
  },

  // ── Dashboard global ─────────────────────────────────
  // Le nouveau module n'a pas de snapshot unique : on agrège 4 endpoints
  // (KPIs globaux, enseignants à risque, heatmap, demande de formation).
  getDashboard(_filters?: DashboardFilters): Promise<DashboardResponse> {
    return Promise.all([
      axios.get<ApiEnvelope<BackendGlobalKpis>>(`${BASE}/dashboard/global`),
      axios.get<ApiEnvelope<{ rows: BackendRiskRow[]; count: number }>>(
        `${BASE}/dashboard/teachers-at-risk`,
      ),
      axios.get<ApiEnvelope<{ cells: BackendHeatmapCell[]; count: number }>>(
        `${BASE}/dashboard/gap-heatmap`,
      ),
      axios.get<ApiEnvelope<{ rows: BackendTrainingDemandRow[]; count: number }>>(
        `${BASE}/dashboard/training-demand`,
      ),
    ]).then(([kpisRes, atRiskRes, heatmapRes, demandRes]) => {
      const kpis = unpack(kpisRes.data);
      const atRisk = (unpack(atRiskRes.data).rows ?? []).map(mapRiskRow);
      const heatmap = (unpack(heatmapRes.data).cells ?? []).map(mapHeatmapCell);
      const top_formations = (unpack(demandRes.data).rows ?? []).map(mapTopFormation);

      const dist: Record<string, number> = { FAIBLE: 0, MODERE: 0, ELEVE: 0, CRITIQUE: 0 };
      atRisk.forEach((t) => {
        dist[t.niveau_risque] = (dist[t.niveau_risque] ?? 0) + 1;
      });
      const distribution = Object.entries(dist).map(([niveau, count]) => ({
        niveau: niveau as NiveauRisque,
        count,
      }));

      return {
        generated_at: new Date().toISOString(),
        filtres: {},
        kpis: mapKpis(kpis, atRisk),
        enseignants_a_risque: atRisk,
        competences_en_declin: [],
        distribution_risques: distribution,
        tendances: [],
        alertes_recentes: [],
        heatmap,
        top_formations,
      };
    });
  },

  // Endpoint backend réel : /dashboard/gap-heatmap (département × domaine).
  getHeatmap(_filters?: DashboardFilters): Promise<HeatmapCell[]> {
    return axios
      .get<ApiEnvelope<{ cells: BackendHeatmapCell[]; count: number }>>(
        `${BASE}/dashboard/gap-heatmap`,
      )
      .then((r) => (unpack(r.data).cells ?? []).map(mapHeatmapCell));
  },

  // Endpoint backend réel : /dashboard/teachers-at-risk (seuil 0.5 fixe).
  getAtRisk(_filters?: DashboardFilters & { seuil?: number }): Promise<AtRiskTeacher[]> {
    return axios
      .get<ApiEnvelope<{ rows: BackendRiskRow[]; count: number }>>(
        `${BASE}/dashboard/teachers-at-risk`,
      )
      .then((r) => (unpack(r.data).rows ?? []).map(mapRiskRow));
  },

  // Endpoint backend réel : /dashboard/teachers-by-cell (drill-down heatmap).
  getTeachersByCell(departement: string, competenceId: number, limit = 50): Promise<Array<Record<string, unknown>>> {
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

  // ── Alertes (F5/F6) ────────────────────────────────
  // Endpoint backend réel : GET /alerts (filtres + pagination).
  getAlerts(filters: {
    type_alerte?: string;
    severite?: string;
    statut?: string;
    enseignant_id?: string;
    departement_id?: string;
    page?: number;
    size?: number;
  } = {}): Promise<AlertListResponse> {
    return axios
      .get<AlertListResponse>(`${BASE}/alerts`, { params: filters })
      .then((r) => r.data);
  },

  // Endpoint backend réel : PATCH /alerts/{id} (cycle de vie).
  updateAlert(id: number, payload: AlertUpdatePayload): Promise<{ id: number; statut: string }> {
    return axios
      .patch<{ id: number; statut: string }>(`${BASE}/alerts/${id}`, null, { params: payload })
      .then((r) => r.data);
  },

  // ── Impact des formations & simulation what-if (F8) ──
  // Endpoint backend réel : GET /dashboard/training-impact (agrégats historiques).
  getTrainingImpact(): Promise<TrainingImpactResponse> {
    return axios.get<TrainingImpactResponse>(`${BASE}/dashboard/training-impact`).then((r) => r.data);
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
    return axios.get<unknown>(`${BASE}/dashboard/model-performance`).then((r) => mapModelStatus(r.data));
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

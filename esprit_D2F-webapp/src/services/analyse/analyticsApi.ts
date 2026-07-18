/**
 * Service API centralisé du feature-module Analytics.
 *
 * Toutes les requêtes passent par le client HTTP global (cookie HttpOnly JWT,
 * intercepteurs 401/403) et par la gateway : /api/v1/analytics.
 * Aucun appel direct aux microservices internes n'est effectué côté frontend.
 *
 * Les endpoints sont alignés sur le backend réel (esprit_D2F-predictive-analytics,
 * app/routers/analytics.py) :
 *   - /dashboard/global, /dashboard/gap-heatmap, /dashboard/teachers-at-risk,
 *     /dashboard/competences-declining, /dashboard/risk-evolution,
 *     /dashboard/model-performance, /admin/retrain
 * Les réponses backend (forme libre) sont mappées vers les types UI stricts
 * définis dans @/models/analyse/analyticsFeature pour que les composants restent découplés du backend.
 */
import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type {
  AnalyseResult,
  AlertEvent,
  AlertListResponse,
  AlertUpdatePayload,
  AtRiskTeacher,
  DashboardFilters,
  DashboardResponse,
  DecliningSkill,
  DriftReport,
  GapsResponse,
  HeatmapCell,
  ModelStatus,
  PilotageResponse,
  RecommendationsResponse,
  RetrainResponse,
  RiskHistoryResponse,
  RiskScore,
  TrainingImpactResponse,
  TrainingImpactTopFormationsResponse,
  WhatIfRequestPayload,
  WhatIfResponse,
  TrainingPath,
  RawDashboard,
  RawRiskTeacher,
  RawDecliningSkill,
  RawRiskTrendPoint,
  RawRiskDistribution,
  RawAlertEvent,
  RawHeatmapCell,
} from "@/models/analyse/analyticsFeature";

// Le gateway route /api/analyse/** vers le service predictive-analytics avec
// le rewrite /api/analyse/(.*) -> /api/(.*). Donc pour atteindre le backend
// /api/v1/analytics/..., le frontend doit appeler /api/analyse/v1/analytics/...
// (config.ANALYSE_URL vaut déjà "/api").
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

// ── Mappers backend → types UI ──────────────────────────────

function mapDashboard(raw: RawDashboard): DashboardResponse {
  const atRisk: AtRiskTeacher[] = (raw.enseignants_a_risque ?? []).map((t: RawRiskTeacher) => ({
    enseignant_id: t.enseignant_id ?? "",
    nom: t.teacher_name ?? t.enseignant_id ?? "",
    departement: t.departement ?? null,
    up: t.up ?? null,
    score_risque: t.score_risque ?? 0,
    niveau_risque: (t.niveau_risque ?? "FAIBLE") as AtRiskTeacher["niveau_risque"],
    nb_gaps_critiques: t.nb_gaps_critiques ?? 0,
    tendance: (t.tendance ?? "STABLE") as AtRiskTeacher["tendance"],
  }));

  const declining: DecliningSkill[] = (raw.competences_en_declin ?? []).map((c: RawDecliningSkill) => ({
    competence_id: Number(c.competence_id ?? 0),
    competence_nom: c.competence_nom ?? "",
    domaine_nom: c.domaine_nom ?? null,
    variation_moyenne: c.delta ?? 0,
    pct_enseignants_en_declin: 0,
    nb_enseignants_concernes: 0,
  }));

  const trends = (raw.monthly_risk_evolution ?? []).map((p: RawRiskTrendPoint) => ({
    month: p.month ?? "",
    nb_gaps_critiques: p.critical ?? 0,
    score_risque_moyen: 0,
    nb_alertes: (p.critical ?? 0) + (p.high ?? 0),
  }));

  // Répartition des risques : priorité à la distribution réelle agrégée
  // renvoyée par le backend (sur l'ensemble des profils de risque) — dérive
  // sinon de la liste enseignants_a_risque (au-dessus du seuil « à risque »).
  const dist: Record<string, number> = { FAIBLE: 0, MODERE: 0, ELEVE: 0, CRITIQUE: 0 };
  if (Array.isArray(raw.distribution_risques) && raw.distribution_risques.length) {
    (raw.distribution_risques as RawRiskDistribution[]).forEach((d) => {
      const n: string = (d.niveau ?? "").toUpperCase();
      if (n in dist) dist[n] += Number(d.count ?? 0);
    });
  } else {
    atRisk.forEach((t) => { dist[t.niveau_risque] = (dist[t.niveau_risque] ?? 0) + 1; });
  }
  const distribution = Object.entries(dist).map(([niveau, count]) => ({
    niveau: niveau as AtRiskTeacher["niveau_risque"],
    count,
  }));

  // KPIs réels calculés côté backend (real_kpis) à partir des gaps/alertes/
  // couverture disponibles — même si teacher_risk_profiles est vide.
  // Le backend renvoie ces champs à plat (niveau racine), pas sous une clé
  // "kpis" : on lit donc la racine quand la clé "kpis" est absente.
  const rawKpis = (raw.kpis && typeof raw.kpis === "object" && Object.keys(raw.kpis).length > 0)
    ? raw.kpis
    : raw;
  const num = (v: unknown, fallback: number): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const kpis = {
    nb_enseignants_suivis: num(rawKpis.nb_enseignants_suivis, atRisk.length),
    nb_profils_risque: num(rawKpis.nb_profils_risque, 0),
    score_risque_moyen:
      num(rawKpis.score_risque_moyen,
        atRisk.length ? atRisk.reduce((s, t) => s + t.score_risque, 0) / atRisk.length : 0),
    nb_gaps_critiques:
      num(rawKpis.nb_gaps_critiques, atRisk.reduce((s, t) => s + t.nb_gaps_critiques, 0)),
    nb_alertes_nouvelles:
      num(rawKpis.nb_alertes_nouvelles, (raw.alertes_recentes ?? []).length),
    taux_couverture_global: num(rawKpis.taux_couverture_global, 0),
    nb_regression: num(rawKpis.nb_regression, 0),
    nb_stagnation: num(rawKpis.nb_stagnation, 0),
    besoins_critiques_non_satisfaits: num(rawKpis.besoins_critiques_non_satisfaits, 0),
    alertes_critiques_ouvertes: num(rawKpis.alertes_critiques_ouvertes, 0),
  };

  // Données auxiliaires réellement disponibles côté backend (même sans
  // teacher_risk_profiles peuplés) : alertes récentes, heatmap, top formations.
  const alertes_recentes: AlertEvent[] = (raw.alertes_recentes ?? []).map((a: RawAlertEvent) => ({
    id: Number(a.id ?? 0),
    type_alerte: a.type_alerte ?? "",
    cible_type: "INDIVIDUEL",
    enseignant_id: a.enseignant_id ?? null,
    departement_id: a.departement_id ?? null,
    competence_id: a.competence_id ?? null,
    severite: a.severite ?? "INFO",
    titre: a.titre ?? "",
    message: a.message ?? "",
    statut: a.statut ?? "NOUVELLE",
    created_at: a.created_at ?? new Date().toISOString(),
  }));

  const heatmap: HeatmapCell[] = (raw.department_gap_heatmap ?? []).map((h: RawHeatmapCell) => ({
    departement: h.departement ?? "",
    competence_id: Number(h.competence_id ?? 0),
    competence_nom: h.competence_nom ?? "",
    avg_gap: h.avg_gap ?? 0,
    enseignants_count: h.enseignants_count ?? 0,
  }));

  const top_formations = raw.top_formations_recommandees ?? [];

  return {
    generated_at: raw.generated_at ?? new Date().toISOString(),
    filtres: {},
    kpis,
    enseignants_a_risque: atRisk,
    competences_en_declin: declining,
    distribution_risques: distribution,
    tendances: trends,
    alertes_recentes,
    heatmap,
    top_formations,
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
      .post<AnalyseResult>(`${BASE}/analyze/${enseignantId}`)
      .then((r) => r.data);
  },

  getGaps(
    enseignantId: string,
    opts: { urgence?: string; page?: number; size?: number } = {},
  ): Promise<GapsResponse> {
    return axios
      .get<GapsResponse>(`${BASE}/gaps/${enseignantId}`, {
        params: { urgence: opts.urgence, page: opts.page ?? 0, size: opts.size ?? 20 },
      })
      .then((r) => r.data);
  },

  getRecommendations(
    enseignantId: string,
    opts: { competence_id?: number; page?: number; size?: number } = {},
  ): Promise<RecommendationsResponse> {
    return axios
      .get<RecommendationsResponse>(`${BASE}/recommendations/${enseignantId}`, {
        params: {
          competence_id: opts.competence_id,
          page: opts.page ?? 0,
          size: opts.size ?? 20,
        },
      })
      .then((r) => r.data);
  },

  getTrainingPath(enseignantId: string, competenceId: number): Promise<TrainingPath> {
    return axios
      .get<TrainingPath>(`${BASE}/training-path/${enseignantId}/${competenceId}`)
      .then((r) => r.data);
  },

  getRisk(enseignantId: string): Promise<RiskScore> {
    return axios.get<RiskScore>(`${BASE}/risk/${enseignantId}`).then((r) => r.data);
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
  // Endpoint backend réel : /dashboard/global (snapshot cache ≤ 6h).
  getDashboard(filters?: DashboardFilters): Promise<DashboardResponse> {
    return axios
      .get<RawDashboard>(`${BASE}/dashboard/global`, { params: toParams(filters) })
      .then((r) => mapDashboard(r.data));
  },

  // Endpoint backend réel : /dashboard/gap-heatmap (département × compétence).
  getHeatmap(filters?: DashboardFilters): Promise<HeatmapCell[]> {
    return axios
      .get<HeatmapCell[]>(`${BASE}/dashboard/gap-heatmap`, { params: toParams(filters) })
      .then((r) => r.data);
  },

  // Endpoint backend réel : /dashboard/teachers-at-risk (seuil optionnel).
  getAtRisk(filters?: DashboardFilters & { seuil?: number }): Promise<AtRiskTeacher[]> {
    const p = toParams(filters);
    if (filters?.seuil !== undefined) p.seuil = filters.seuil;
    return axios
      .get<AtRiskTeacher[]>(`${BASE}/dashboard/teachers-at-risk`, { params: p })
      .then((r) => r.data);
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
      .patch<{ id: number; statut: string }>(`${BASE}/alerts/${id}`, payload)
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

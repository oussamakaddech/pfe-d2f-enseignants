import { describe, it, expect, vi, beforeEach } from "vitest";

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    patch: httpMocks.mockPatch,
  },
}));

vi.mock("@/config/env", () => ({
  config: { ANALYSE_URL: "/api" },
}));

import { analyticsApi } from "@/services/analyse/analyticsApi";

const BASE = "/api/analyse/v1/analytics";

beforeEach(() => {
  vi.clearAllMocks();
  httpMocks.mockGet.mockResolvedValue({ data: { data: {}, meta: {}, errors: [] } });
  httpMocks.mockPost.mockResolvedValue({ data: {} });
  httpMocks.mockPatch.mockResolvedValue({ data: {} });
});

describe("analyticsApi – indivuel", () => {
  it("analyze appelle POST sur /analysis/:id", async () => {
    await analyticsApi.analyze("T1");
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/analysis/T1`);
  });

  it("getGaps appelle GET /teachers/:id/gaps", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { data: [], meta: {}, errors: [] },
    });
    await analyticsApi.getGaps("T1");
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/gaps`, {
      params: { page: 1, size: 20 },
    });
  });

  it("getGaps filtre urgence et pagine côté client", async () => {
    const envelope = {
      data: {
        data: [
          { competence_id: 1, competence_code: "C1", competence_nom: "Compétence", current_level: 1, target_level: 5, gap_score: 0.8, severity: "CRITIQUE", trend: "STABLE", as_of: "2026-08-01" },
          { competence_id: 2, competence_code: "C2", competence_nom: "Compétence 2", current_level: 2, target_level: 5, gap_score: 0.6, severity: "HAUTE", trend: "DECLINING", as_of: "2026-08-01" },
        ],
        meta: {},
        errors: [],
      },
    };
    httpMocks.mockGet
      .mockResolvedValueOnce(envelope)
      .mockResolvedValueOnce(envelope)
      .mockResolvedValueOnce(envelope);
    expect(httpMocks.mockGet).not.toHaveBeenCalled();
    const resPage0 = await analyticsApi.getGaps("T1", { urgence: "CRITIQUE" });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/gaps`, {
      params: { page: 1, size: 20 },
    });
    expect(resPage0.total).toBe(1);
    expect(resPage0.page).toBe(0);
    expect(resPage0.size).toBe(1);
    expect(resPage0.gaps[0].niveau_urgence).toBe("CRITIQUE");
    const resPage2 = await analyticsApi.getGaps("T1", { urgence: "CRITIQUE", page: 2, size: 5 });
    expect(resPage2.total).toBe(1);
    expect(resPage2.page).toBe(2);
    expect(resPage2.size).toBe(5);
    expect(resPage2.gaps).toHaveLength(0);
  });

  it("getRecommendations appelle GET /teachers/:id/recommendations avec competence_id", async () => {
    await analyticsApi.getRecommendations("T1", { competence_id: 7, page: 1 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/recommendations`, {
      params: { competence_id: 7, limit: 20 },
    });
  });

  it("getTrainingPath appelle GET", async () => {
    await analyticsApi.getTrainingPath("T1", 3);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/training-path/T1/3`);
  });

  it("getRisk appelle GET /teachers/:id/risk", async () => {
    await analyticsApi.getRisk("T1");
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/risk`);
  });

  it("getRisk mappe l'enveloppe DDD vers RiskScore", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          teacher_id: "T1",
          risk_score: 85,
          risk_level: "CRITICAL",
          factors: [
            { feature: "stagnation", value: 0.8, contribution: 0.2 },
          ],
          computed_at: "2026-08-01T00:00:00Z",
        },
        meta: { teacher_id: "T1" },
        errors: [],
      },
    });
    const res = await analyticsApi.getRisk("T1");
    expect(res.score).toBe(0.85);
    expect(res.niveau).toBe("CRITIQUE");
    expect(res.facteurs[0].nom).toBe("Stagnation");
    expect(res.facteurs[0].valeur_brute).toBe(0.8);
  });

  it("getRiskHistory transmet mois", async () => {
    await analyticsApi.getRiskHistory("T1", 6);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/enseignants/T1/historique-risque`, {
      params: { mois: 6 },
    });
  });

  it("getPilotage transmet horizon_mois", async () => {
    await analyticsApi.getPilotage(9);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/pilotage`, {
      params: { horizon_mois: 9 },
    });
  });

  it("getPilotage sans horizon n'envoie pas de params", async () => {
    await analyticsApi.getPilotage();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/pilotage`, { params: {} });
  });
});

describe("analyticsApi – dashboard", () => {
  it("mappe le dashboard v2 vers le type UI", async () => {
    httpMocks.mockGet
      .mockResolvedValueOnce({
        data: {
          data: { total_teachers: 30, teachers_with_data: 30, teachers_at_risk: 25, avg_risk_score: 0.6, total_open_gaps: 120, critical_gaps: 40, open_needs: 15, enrollment_rate: 0.8, completion_rate: 0.6 },
          meta: {},
          errors: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: { rows: [{ teacher_id: "T1", department_code: "DEPT_INFO", risk_score: 0.8, risk_level: "CRITICAL", top_gap: "Python (CRITICAL)", gap_count: 2 }], count: 1 },
          meta: {},
          errors: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: { cells: [{ department_code: "DEPT_INFO", domain_id: "COMP-1", gap_count: 5, max_severity: "CRITICAL", weighted_severity: 2.5 }], count: 1 },
          meta: {},
          errors: [],
        },
      })
      .mockResolvedValueOnce({
        data: { data: { rows: [], count: 0 }, meta: {}, errors: [] },
      });
    const res = await analyticsApi.getDashboard();
    expect(res.enseignants_a_risque[0].nom).toBe("T1");
    expect(res.enseignants_a_risque[0].score_risque).toBe(0.8);
    expect(res.heatmap[0].avg_gap).toBe(0.5);
    expect(res.kpis.nb_enseignants_suivis).toBe(30);
    expect(res.kpis.nb_gaps_critiques).toBe(40);
  });

  it("dérive la distribution des risques de la liste à risque", async () => {
    httpMocks.mockGet
      .mockResolvedValueOnce({
        data: { data: { total_teachers: 3, teachers_with_data: 3, teachers_at_risk: 3 }, meta: {}, errors: [] },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            rows: [
              { teacher_id: "T1", department_code: "", risk_score: 0.8, risk_level: "CRITICAL", top_gap: "", gap_count: 1 },
              { teacher_id: "T2", department_code: "", risk_score: 0.75, risk_level: "CRITICAL", top_gap: "", gap_count: 1 },
              { teacher_id: "T3", department_code: "", risk_score: 0.55, risk_level: "HIGH", top_gap: "", gap_count: 1 },
            ],
            count: 3,
          },
          meta: {},
          errors: [],
        },
      })
      .mockResolvedValueOnce({
        data: { data: { cells: [], count: 0 }, meta: {}, errors: [] },
      })
      .mockResolvedValueOnce({
        data: { data: { rows: [], count: 0 }, meta: {}, errors: [] },
      });
    const res = await analyticsApi.getDashboard();
    const byLevel = Object.fromEntries(res.distribution_risques.map((d) => [d.niveau, d.count]));
    expect(byLevel.CRITIQUE).toBe(2);
    expect(byLevel.ELEVE).toBe(1);
  });

  it("getHeatmap appelle GET /dashboard/gap-heatmap", async () => {
    await analyticsApi.getHeatmap();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/gap-heatmap`);
  });

  it("getAtRisk appelle GET /dashboard/teachers-at-risk", async () => {
    await analyticsApi.getAtRisk({ departement_id: "D1", seuil: 0.5 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/teachers-at-risk`);
  });

  it("getTeachersByCell transmet limit", async () => {
    await analyticsApi.getTeachersByCell("D1", 5, 12);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/teachers-by-cell`, {
      params: { departement: "D1", competence_id: 5, limit: 12 },
    });
  });

  it("getDecliningSkills appelle GET", async () => {
    await analyticsApi.getDecliningSkills({ up_id: "UP1" });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/competences-declining`, {
      params: { up_id: "UP1" },
    });
  });
});

describe("analyticsApi – alertes & impact", () => {
  it("getAlerts transmet les filtres", async () => {
    await analyticsApi.getAlerts({ severite: "CRITICAL", page: 1 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/alerts`, {
      params: { severite: "CRITICAL", page: 1 },
    });
  });

  it("updateAlert fait PATCH", async () => {
    await analyticsApi.updateAlert(1, { statut: "TRAITEE" });
    expect(httpMocks.mockPatch).toHaveBeenCalledWith(`${BASE}/alerts/1`, null, {
      params: { statut: "TRAITEE" },
    });
  });

  it("getTrainingImpact appelle GET", async () => {
    await analyticsApi.getTrainingImpact();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/training-impact`);
  });

  it("getTrainingImpactFormations transmet page/size", async () => {
    await analyticsApi.getTrainingImpactFormations(2, 5);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/training-impact/formations`, {
      params: { page: 2, size: 5 },
    });
  });

  it("simulateWhatIf fait POST", async () => {
    await analyticsApi.simulateWhatIf({ enseignant_id: "T1", plan: [], horizon_mois: 6 });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/simulate/what-if`, {
      enseignant_id: "T1",
      plan: [],
      horizon_mois: 6,
    });
  });
});

describe("analyticsApi – monitoring", () => {
  it("getModelStatus mappe le statut", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { gap_model_accuracy: 0.9, last_retrain_status: "v2", last_retrained: "2024-01-01" } });
    const res = await analyticsApi.getModelStatus();
    expect(res.version).toBe("v2");
    expect(res.accuracy).toBe(0.9);
    expect(res.algorithme).toBe("GradientBoosting");
    expect(res.disponible).toBe(true);
  });

  it("getModelStatus marque indisponible si accuracy nulle", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { gap_model_accuracy: null } });
    const res = await analyticsApi.getModelStatus();
    expect(res.disponible).toBe(false);
  });

  it("getDrift mappe la dérive", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ critical: 3 }, { critical: 5 }] });
    const res = await analyticsApi.getDrift();
    expect(res.valeur_actuelle).toBe(5);
    expect(res.drift_detected).toBe(false);
  });

  it("retrain fait POST /admin/retrain", async () => {
    await analyticsApi.retrain();
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/admin/retrain`);
  });

  it("rollback fait POST with rollback_only", async () => {
    await analyticsApi.rollback();
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/admin/retrain`, { rollback_only: true });
  });
});

describe("analyticsApi – scope-analysis", () => {
  it("getTeacherScopeAnalysis appelle GET /teachers/:id/scope-analysis", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          context: {
            teacher_id: "T1", nom_complet: "Alice Dupont", mail: "a@esprit.tn",
            specialite: "Dev Backend", grade: "Assistant",
            up_id: "UP_GL", up_libelle: "Genie Logiciel",
            dept_id: "DEPT_GL", dept_libelle: "Genie Logiciel",
          },
          gaps: [
            { competence_id: 1, competence_code: "DEV.BACK", competence_nom: "Backend",
              current_level: 2, target_level: 5, gap_score: 0.75, severity: "CRITIQUE",
              trend: "STABLE", as_of: "2026-08-02" },
          ],
          recommendations: [
            { formation_id: 1, titre: "Spring Boot Avance", competence_id: 1,
              rank_score: 0.65, reason: "Couvre savoirs manquants", matched_savoirs: ["S1"] },
          ],
          scoped_competencies_count: 3,
          total_competencies_count: 12,
          is_fallback_global: false,
          computed_at: "2026-08-02T00:00:00Z",
        },
        meta: {}, errors: [],
      },
    });
    const out = await analyticsApi.getTeacherScopeAnalysis("T1");
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/scope-analysis`);
    expect(out.context.nom_complet).toBe("Alice Dupont");
    expect(out.context.specialite).toBe("Dev Backend");
    expect(out.gaps).toHaveLength(1);
    expect(out.gaps[0].niveau_urgence).toBe("CRITIQUE");
    expect(out.recommendations).toHaveLength(1);
    expect(out.recommendations[0].formation_titre).toBe("Spring Boot Avance");
    expect(out.scoped_competencies_count).toBe(3);
    expect(out.total_competencies_count).toBe(12);
    expect(out.is_fallback_global).toBe(false);
  });

  it("getRisk propage model_mode et model_version depuis la meta", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          teacher_id: "T1", risk_score: 75, risk_level: "HIGH",
          factors: [], computed_at: "2026-08-02T00:00:00Z",
        },
        meta: { model_mode: "ML", model_version: "2026-08-02T02:00:47" },
        errors: [],
      },
    });
    const score = await analyticsApi.getRisk("T1");
    expect(score.model_mode).toBe("ML");
    expect(score.model_version).toBe("2026-08-02T02:00:47");
  });
});

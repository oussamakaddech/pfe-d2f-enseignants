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
  httpMocks.mockGet.mockResolvedValue({ data: {} });
  httpMocks.mockPost.mockResolvedValue({ data: {} });
  httpMocks.mockPatch.mockResolvedValue({ data: {} });
});

describe("analyticsApi – indivuel", () => {
  it("analyze appelle POST sur /analyze/:id", async () => {
    await analyticsApi.analyze("T1");
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/analyze/T1`);
  });

  it("getGaps appelle GET avec pagination par défaut", async () => {
    await analyticsApi.getGaps("T1");
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/gaps/T1`, {
      params: { urgence: undefined, page: 0, size: 20 },
    });
  });

  it("getGaps transmet urgence et pagination", async () => {
    await analyticsApi.getGaps("T1", { urgence: "CRITIQUE", page: 2, size: 5 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/gaps/T1`, {
      params: { urgence: "CRITIQUE", page: 2, size: 5 },
    });
  });

  it("getRecommendations transmet competence_id", async () => {
    await analyticsApi.getRecommendations("T1", { competence_id: 7, page: 1 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/recommendations/T1`, {
      params: { competence_id: 7, page: 1, size: 20 },
    });
  });

  it("getTrainingPath appelle GET", async () => {
    await analyticsApi.getTrainingPath("T1", 3);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/training-path/T1/3`);
  });

  it("getRisk appelle GET /risk/:id", async () => {
    await analyticsApi.getRisk("T1");
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/risk/T1`);
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
  it("mappe le dashboard brut vers le type UI", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        enseignants_a_risque: [
          { enseignant_id: "T1", teacher_name: "Alice", score_risque: 0.8, niveau_risque: "CRITIQUE", nb_gaps_critiques: 2, tendance: "DEGRADATION" },
        ],
        department_gap_heatmap: [{ departement: "DEPT_INFO", competence_id: 1, competence_nom: "C", avg_gap: 0.6, enseignants_count: 5 }],
        alertes_recentes: [{ id: 1, type_alerte: "GAP_CRITIQUE", severite: "CRITICAL", titre: "Alerte", statut: "NOUVELLE" }],
        nb_enseignants_suivis: 10,
        nb_gaps_critiques: 3,
      },
    });
    const res = await analyticsApi.getDashboard();
    expect(res.enseignants_a_risque[0].nom).toBe("Alice");
    expect(res.enseignants_a_risque[0].score_risque).toBe(0.8);
    expect(res.heatmap[0].avg_gap).toBe(0.6);
    expect(res.alertes_recentes[0].type_alerte).toBe("GAP_CRITIQUE");
    expect(res.kpis.nb_enseignants_suivis).toBe(10);
    expect(res.kpis.nb_gaps_critiques).toBe(3);
  });

  it("dérive la distribution des risques de la liste à risque", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        enseignants_a_risque: [
          { enseignant_id: "T1", niveau_risque: "CRITIQUE" },
          { enseignant_id: "T2", niveau_risque: "CRITIQUE" },
          { enseignant_id: "T3", niveau_risque: "FAIBLE" },
        ],
      },
    });
    const res = await analyticsApi.getDashboard();
    const byLevel = Object.fromEntries(res.distribution_risques.map((d) => [d.niveau, d.count]));
    expect(byLevel.CRITIQUE).toBe(2);
    expect(byLevel.FAIBLE).toBe(1);
  });

  it("getHeatmap appelle GET /dashboard/gap-heatmap", async () => {
    await analyticsApi.getHeatmap();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/gap-heatmap`, { params: {} });
  });

  it("getAtRisk transmet le seuil", async () => {
    await analyticsApi.getAtRisk({ departement_id: "D1", seuil: 0.5 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/teachers-at-risk`, {
      params: { departement_id: "D1", seuil: 0.5 },
    });
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
    expect(httpMocks.mockPatch).toHaveBeenCalledWith(`${BASE}/alerts/1`, { statut: "TRAITEE" });
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

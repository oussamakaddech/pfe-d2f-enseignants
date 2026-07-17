import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import { useCupDashboard } from "@/hooks/dashboard/useCupDashboard";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import KPIService from "@/services/analyse/KPIService";
import BesoinFormationService from "@/services/besoin/BesoinFormationService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/AnalyticsService", () => ({
  default: {
    getFormationsParDepartement: vi.fn(), getFormationsParUp: vi.fn(),
    getFormationsParPeriode: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/analyse/KPIService", () => ({
  default: {
    getFormationsByEtat: vi.fn(), getFormationsByTypeFiltered: vi.fn(),
    getTotalHeures: vi.fn(), getUniqueParticipants: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/besoin/BesoinFormationService", () => ({
  default: { getAllBesoinFormations: vi.fn() },
  __esModule: true,
}));
vi.mock("@/services/analyse/AnalysePredictiveService", () => ({
  default: {
    getOverview: vi.fn(), getInDemandCompetencies: vi.fn(),
  },
  __esModule: true,
}));

describe("useCupDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("computes kpis from queries", async () => {
    (KPIService.getFormationsByEtat as ReturnType<typeof vi.fn>).mockResolvedValue({ total: 10, acheve: 6, enCours: 4 });
    (KPIService.getTotalHeures as ReturnType<typeof vi.fn>).mockResolvedValue(40);
    (KPIService.getUniqueParticipants as ReturnType<typeof vi.fn>).mockResolvedValue(8);
    (AnalyticsService.getFormationsParDepartement as ReturnType<typeof vi.fn>).mockResolvedValue({ departements: [] });
    (BesoinFormationService.getAllBesoinFormations as ReturnType<typeof vi.fn>).mockResolvedValue([
      { approuveAdmin: false, priorite: "CRITIQUE" }, { approuveAdmin: true, priorite: "BASSE" },
    ]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.kpis.totalFormations).toBe(10);
    expect(result.current.kpis.achevees).toBe(6);
    expect(result.current.kpis.participants).toBe(8);
    expect(result.current.kpis.pendingBesoins).toBe(1);
    expect(result.current.kpis.critiques).toBe(1);
  });

  it("besoinsParDept aggregates by department", async () => {
    (KPIService.getFormationsByEtat as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (BesoinFormationService.getAllBesoinFormations as ReturnType<typeof vi.fn>).mockResolvedValue([
      { departement: "INFO", approuveAdmin: false, priorite: "HAUTE" },
      { departement: "INFO", approuveAdmin: true, priorite: "BASSE" },
    ]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.besoinsParDept).toHaveLength(1);
    expect(result.current.besoinsParDept[0]).toMatchObject({ departement: "INFO", total: 2, hautes: 1 });
  });
});

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useGenerateFormationCertificates, useFormationsParRoleEtPeriode, useFormationReportFetch,
  useSendEmail, useInscriptionsByFormation, useAllInscriptions, useInscriptionsByEnseignant,
  useMyInscriptions, useDemanderInscription, useTraiterDemande, useTraiterDemandeBulk,
  useAnnulerInscription, useFormationsAccessibles, useExportFormations, useProfile,
} from "@/hooks/formation/useFormationExtras";
import FormationCustomService from "@/services/formation/FormationCustomService";
import FormationReportService from "@/services/formation/FormationReportService";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import MailService from "@/services/besoin/MailService";
import InscriptionService from "@/services/formation/InscriptionService";
import { getProfile } from "@/services/auth/AccountService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/formation/FormationCustomService", () => ({ default: { generateCertificates: vi.fn() }, __esModule: true }));
vi.mock("@/services/formation/FormationReportService", () => ({ default: { getFormationsParRoleEtPeriode: vi.fn() }, __esModule: true }));
vi.mock("@/services/formation/FormationWorkflowService", () => ({ default: { exportFormations: vi.fn() }, __esModule: true }));
vi.mock("@/services/besoin/MailService", () => ({ default: { sendEmail: vi.fn() }, __esModule: true }));
vi.mock("@/services/formation/InscriptionService", () => ({
  default: {
    getInscriptionsByFormation: vi.fn(), getAllInscriptions: vi.fn(),
    getInscriptionsByEnseignant: vi.fn(), getMyInscriptions: vi.fn(),
    demanderInscription: vi.fn(), traiterDemande: vi.fn(), traiterDemandeBulk: vi.fn(),
    annulerInscription: vi.fn(), getFormationsAccessibles: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/auth/AccountService", () => ({ getProfile: vi.fn(), __esModule: true }));

describe("useFormationExtras", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useGenerateFormationCertificates calls service", async () => {
    (FormationCustomService.generateCertificates as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useGenerateFormationCertificates(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ formationId: 1 } as never); });
    expect(FormationCustomService.generateCertificates).toHaveBeenCalledWith(1, "CERTIF");
  });

  it("useFormationsParRoleEtPeriode fetches", async () => {
    (FormationReportService.getFormationsParRoleEtPeriode as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsParRoleEtPeriode("admin", 3, "s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(FormationReportService.getFormationsParRoleEtPeriode).toHaveBeenCalled();
  });

  it("useFormationReportFetch calls service", async () => {
    (FormationReportService.getFormationsParRoleEtPeriode as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useFormationReportFetch(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ role: "a", enseignantId: 1, start: "s", end: "e" } as never); });
    expect(FormationReportService.getFormationsParRoleEtPeriode).toHaveBeenCalled();
  });

  it("useSendEmail calls service", async () => {
    (MailService.sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useSendEmail(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ to: "a@b.c", subject: "s", content: "c" } as never); });
    expect(MailService.sendEmail).toHaveBeenCalled();
  });

  it("useInscriptionsByFormation fetches", async () => {
    (InscriptionService.getInscriptionsByFormation as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useInscriptionsByFormation(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(InscriptionService.getInscriptionsByFormation).toHaveBeenCalledWith(3);
  });

  it("useAllInscriptions fetches", async () => {
    (InscriptionService.getAllInscriptions as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useAllInscriptions(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useInscriptionsByEnseignant fetches", async () => {
    (InscriptionService.getInscriptionsByEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useInscriptionsByEnseignant(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(InscriptionService.getInscriptionsByEnseignant).toHaveBeenCalledWith(3);
  });

  it("useMyInscriptions fetches", async () => {
    (InscriptionService.getMyInscriptions as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useMyInscriptions(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useDemanderInscription calls service", async () => {
    (InscriptionService.demanderInscription as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDemanderInscription(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ formationId: 1, enseignantId: 2 } as never); });
    expect(InscriptionService.demanderInscription).toHaveBeenCalledWith(1, 2);
  });

  it("useTraiterDemande calls service", async () => {
    (InscriptionService.traiterDemande as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useTraiterDemande(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, approuver: true } as never); });
    expect(InscriptionService.traiterDemande).toHaveBeenCalled();
  });

  it("useTraiterDemandeBulk calls service", async () => {
    (InscriptionService.traiterDemandeBulk as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useTraiterDemandeBulk(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ ids: [1], approuver: true } as never); });
    expect(InscriptionService.traiterDemandeBulk).toHaveBeenCalled();
  });

  it("useAnnulerInscription calls service", async () => {
    (InscriptionService.annulerInscription as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useAnnulerInscription(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, enseignantId: 2 } as never); });
    expect(InscriptionService.annulerInscription).toHaveBeenCalledWith(1, 2);
  });

  it("useFormationsAccessibles fetches", async () => {
    (InscriptionService.getFormationsAccessibles as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsAccessibles(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(InscriptionService.getFormationsAccessibles).toHaveBeenCalledWith(3);
  });

  it("useExportFormations calls service", async () => {
    (FormationWorkflowService.exportFormations as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useExportFormations(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ start: "s", end: "e" } as never); });
    expect(FormationWorkflowService.exportFormations).toHaveBeenCalled();
  });

  it("useProfile fetches with retry policy", async () => {
    (getProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ username: "u" });
    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(getProfile).toHaveBeenCalled();
  });
});

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useAllFormations, useFormationById, useFormationsVisibles, useFormationsAchevees,
  useFormationsWithDocuments, useFormationsParUp, useFormationsParDepartement,
  useFormationsForCalendar, useCreateFormation, useUpdateFormation, useDeleteFormation,
  useUpdateInscriptionsOuvertes, useDepartements, useUps, useAllAccounts,
} from "@/hooks/formation/useFormations";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import DeptService from "@/services/formation/DeptService";
import UpService from "@/services/api/UploadService";
import { getAllAccounts } from "@/services/auth/AccountService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/formation/FormationWorkflowService", () => ({
  default: {
    getAllFormationWorkflows: vi.fn(), getFormationWorkflowById: vi.fn(),
    getFormationsVisibles: vi.fn(), getFormationsAchevees: vi.fn(),
    getAllFormationWithDocuments: vi.fn(), getFormationsParUp: vi.fn(),
    getFormationsParDepartement: vi.fn(), getFormationsForCalendar: vi.fn(),
    createFormationWorkflow: vi.fn(), updateFormationWorkflow: vi.fn(),
    deleteFormationWorkflow: vi.fn(), updateInscriptionsOuvertes: vi.fn(),
    exportFormations: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/formation/DeptService", () => ({
  default: { getAllDepts: vi.fn() },
  __esModule: true,
}));
vi.mock("@/services/api/UploadService", () => ({
  default: { getAllUps: vi.fn() },
  __esModule: true,
}));
vi.mock("@/services/auth/AccountService", () => ({
  getAllAccounts: vi.fn(),
}));

describe("useFormations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useAllFormations fetches", async () => {
    (FormationWorkflowService.getAllFormationWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useAllFormations(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useFormationById fetches", async () => {
    (FormationWorkflowService.getFormationWorkflowById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 2 });
    const { result } = renderHook(() => useFormationById(2), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(FormationWorkflowService.getFormationWorkflowById).toHaveBeenCalledWith(2);
  });

  it("useFormationsVisibles fetches", async () => {
    (FormationWorkflowService.getFormationsVisibles as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsVisibles(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useFormationsAchevees fetches", async () => {
    (FormationWorkflowService.getFormationsAchevees as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsAchevees(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useFormationsWithDocuments fetches", async () => {
    (FormationWorkflowService.getAllFormationWithDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsWithDocuments(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useFormationsParUp fetches", async () => {
    (FormationWorkflowService.getFormationsParUp as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsParUp(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(FormationWorkflowService.getFormationsParUp).toHaveBeenCalledWith(3);
  });

  it("useFormationsParDepartement fetches", async () => {
    (FormationWorkflowService.getFormationsParDepartement as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsParDepartement(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(FormationWorkflowService.getFormationsParDepartement).toHaveBeenCalledWith(3);
  });

  it("useFormationsForCalendar fetches", async () => {
    (FormationWorkflowService.getFormationsForCalendar as ReturnType<typeof vi.fn>).mockResolvedValue({ asAnimateur: [], asParticipant: [] });
    const { result } = renderHook(() => useFormationsForCalendar(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(FormationWorkflowService.getFormationsForCalendar).toHaveBeenCalledWith(3);
  });

  it("useCreateFormation calls service", async () => {
    (FormationWorkflowService.createFormationWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateFormation(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({} as never); });
    expect(FormationWorkflowService.createFormationWorkflow).toHaveBeenCalled();
  });

  it("useUpdateFormation calls service", async () => {
    (FormationWorkflowService.updateFormationWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateFormation(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, data: {} } as never); });
    expect(FormationWorkflowService.updateFormationWorkflow).toHaveBeenCalledWith(1, {});
  });

  it("useDeleteFormation calls service", async () => {
    (FormationWorkflowService.deleteFormationWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteFormation(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(FormationWorkflowService.deleteFormationWorkflow).toHaveBeenCalledWith(1);
  });

  it("useUpdateInscriptionsOuvertes calls service", async () => {
    (FormationWorkflowService.updateInscriptionsOuvertes as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateInscriptionsOuvertes(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, ouvert: true } as never); });
    expect(FormationWorkflowService.updateInscriptionsOuvertes).toHaveBeenCalledWith(1, true);
  });

  it("useDepartements fetches", async () => {
    (DeptService.getAllDepts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useDepartements(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useUps fetches", async () => {
    (UpService.getAllUps as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useUps(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useAllAccounts fetches", async () => {
    (getAllAccounts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useAllAccounts(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(getAllAccounts).toHaveBeenCalledWith(false);
  });
});

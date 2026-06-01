import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import DeptService from "@/services/formation/DeptService";
import UpService from "@/services/api/UploadService";
import { getAllAccounts } from "@/services/auth/AccountService";
import type { Formation } from "@/models/formation";
import type { Id } from "@/models/common";
import type { AuthUser } from "@/models/auth";

const KEYS = {
  all: ["formations"] as const,
  one: (id: Id) => ["formations", id] as const,
  visibles: ["formations", "visibles"] as const,
  achevees: ["formations", "achevees"] as const,
  withDocs: ["formations", "with-documents"] as const,
  byUp: (upId: Id) => ["formations", "up", upId] as const,
  byDept: (deptId: Id) => ["formations", "dept", deptId] as const,
  calendar: (enseignantId: Id) => ["formations", "calendar", enseignantId] as const,
  depts: ["departements"] as const,
};

export function useAllFormations() {
  return useQuery<Formation[]>({
    queryKey: KEYS.all,
    queryFn: () => FormationWorkflowService.getAllFormationWorkflows(),
  });
}

export function useFormationById(id: Id | undefined) {
  return useQuery<Formation>({
    queryKey: KEYS.one(id!),
    queryFn: () => FormationWorkflowService.getFormationWorkflowById(id!),
    enabled: !!id,
  });
}

export function useFormationsVisibles() {
  return useQuery<Formation[]>({
    queryKey: KEYS.visibles,
    queryFn: () => FormationWorkflowService.getFormationsVisibles(),
  });
}

export function useFormationsAchevees() {
  return useQuery<Formation[]>({
    queryKey: KEYS.achevees,
    queryFn: () => FormationWorkflowService.getFormationsAchevees(),
  });
}

export function useFormationsWithDocuments() {
  return useQuery<Formation[]>({
    queryKey: KEYS.withDocs,
    queryFn: () => FormationWorkflowService.getAllFormationWithDocuments(),
  });
}

export function useFormationsParUp(upId: Id | undefined) {
  return useQuery<Formation[]>({
    queryKey: KEYS.byUp(upId!),
    queryFn: () => FormationWorkflowService.getFormationsParUp(upId!),
    enabled: !!upId,
  });
}

export function useFormationsParDepartement(deptId: Id | undefined) {
  return useQuery<Formation[]>({
    queryKey: KEYS.byDept(deptId!),
    queryFn: () => FormationWorkflowService.getFormationsParDepartement(deptId!),
    enabled: !!deptId,
  });
}

export function useFormationsForCalendar(enseignantId: Id | undefined) {
  return useQuery<Formation[]>({
    queryKey: KEYS.calendar(enseignantId!),
    queryFn: () => FormationWorkflowService.getFormationsForCalendar(enseignantId!),
    enabled: !!enseignantId,
  });
}

export function useCreateFormation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      FormationWorkflowService.createFormationWorkflow(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateFormation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: Id; data: Record<string, unknown> }) =>
      FormationWorkflowService.updateFormationWorkflow(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.one(id) });
    },
  });
}

export function useDeleteFormation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => FormationWorkflowService.deleteFormationWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateInscriptionsOuvertes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ouvert }: { id: Id; ouvert: boolean }) =>
      FormationWorkflowService.updateInscriptionsOuvertes(id, ouvert),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.visibles });
    },
  });
}

export function useDepartements() {
  return useQuery<unknown[]>({
    queryKey: KEYS.depts,
    queryFn: () => DeptService.getAllDepts(),
  });
}

export function useUps() {
  return useQuery<unknown[]>({
    queryKey: ["ups"],
    queryFn: () => UpService.getAllUps(),
  });
}

export function useAllAccounts() {
  return useQuery<AuthUser[]>({
    queryKey: ["accounts"],
    queryFn: () => getAllAccounts(),
  });
}

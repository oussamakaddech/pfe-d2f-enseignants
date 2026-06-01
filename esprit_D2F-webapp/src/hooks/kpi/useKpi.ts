import { useQuery, useMutation } from "@tanstack/react-query";
import KPIService from "@/services/analyse/KPIService";
import ParticipantKPIService from "@/services/analyse/ParticipantKPIService";

type KpiFilters = {
  domaine?: string | null;
  upId?: string | null;
  deptId?: string | null;
  ouverte?: boolean | null;
  start?: string | null;
  end?: string | null;
  etat?: string | null;
};

type IdOrNull = string | number | null;

export function useTotalFormations(start: string, end: string) {
  return useQuery<number>({
    queryKey: ["kpi", "total-formations", start, end],
    queryFn: () => KPIService.getTotalFormations(start, end),
    enabled: !!start && !!end,
  });
}

export function useTotalHeures(start: string, end: string) {
  return useQuery<number>({
    queryKey: ["kpi", "total-heures", start, end],
    queryFn: () => KPIService.getTotalHeures(start, end),
    enabled: !!start && !!end,
  });
}

export function useUniqueParticipants(start: string, end: string) {
  return useQuery<number>({
    queryKey: ["kpi", "unique-participants", start, end],
    queryFn: () => KPIService.getUniqueParticipants(start, end),
    enabled: !!start && !!end,
  });
}

export function useFormationsByEtat(start: string, end: string) {
  return useQuery<unknown>({
    queryKey: ["kpi", "formations-by-etat", start, end],
    queryFn: () => KPIService.getFormationsByEtat(start, end),
    enabled: !!start && !!end,
  });
}

export function useTopParticipants(
  start: string,
  end: string,
  upId?: IdOrNull,
  deptId?: IdOrNull,
) {
  const upIdStr = upId == null ? null : String(upId);
  const deptIdStr = deptId == null ? null : String(deptId);
  return useQuery<unknown[]>({
    queryKey: ["kpi", "top-participants", start, end, upId, deptId],
    queryFn: () => KPIService.getTopParticipants(start, end, upIdStr, deptIdStr),
    enabled: !!start && !!end,
  });
}

export function useTopAbsentees(
  start: string,
  end: string,
  upId?: IdOrNull,
  deptId?: IdOrNull,
) {
  const upIdStr = upId == null ? null : String(upId);
  const deptIdStr = deptId == null ? null : String(deptId);
  return useQuery<unknown[]>({
    queryKey: ["kpi", "top-absentees", start, end, upId, deptId],
    queryFn: () => KPIService.getTopAbsentees(start, end, upIdStr, deptIdStr),
    enabled: !!start && !!end,
  });
}

export function useEnseignantsNonAffectes(start: string, end: string) {
  return useQuery<unknown[]>({
    queryKey: ["kpi", "non-affectes", start, end],
    queryFn: () => KPIService.getEnseignantsNonAffectes(start, end),
    enabled: !!start && !!end,
  });
}

export function useKpiCountAndHeures(filters: KpiFilters) {
  return useQuery<unknown>({
    queryKey: ["kpi", "count-heures", filters],
    queryFn: () => KPIService.getCountAndHeures(filters),
  });
}

export function useKpiFormationsByTypeFiltered(filters: KpiFilters) {
  return useQuery<unknown>({
    queryKey: ["kpi", "formations-by-type-filtered", filters],
    queryFn: () => KPIService.getFormationsByTypeFiltered(filters),
  });
}

export function useKpiCountAndHeuresMutation() {
  return useMutation({
    mutationFn: (filters: KpiFilters) => KPIService.getCountAndHeures(filters),
  });
}

export function useKpiFormationsByTypeFilteredMutation() {
  return useMutation({
    mutationFn: (filters: KpiFilters) => KPIService.getFormationsByTypeFiltered(filters),
  });
}

export function useKpiCountByTrainerType(filters?: Record<string, unknown>) {
  return useQuery<unknown[]>({
    queryKey: ["kpi", "count-by-trainer-type", filters],
    queryFn: () => KPIService.getCountByTrainerTypeWithIds(filters),
  });
}

export function useKpiCountByTrainerTypeMutation() {
  return useMutation({
    mutationFn: (filters?: Record<string, unknown>) =>
      KPIService.getCountByTrainerTypeWithIds(filters),
  });
}

export function useFormationsParticipantKPIs(startDate: string, endDate: string) {
  return useQuery<unknown>({
    queryKey: ["kpi", "participant-formations", startDate, endDate],
    queryFn: () => ParticipantKPIService.getFormationsParticipantKPIs(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useGlobalParticipantKPI(startDate: string, endDate: string) {
  return useQuery<unknown>({
    queryKey: ["kpi", "participant-global", startDate, endDate],
    queryFn: () => ParticipantKPIService.getGlobalParticipantKPI(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

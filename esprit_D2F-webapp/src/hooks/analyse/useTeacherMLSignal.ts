/**
 * Hook useTeacherMLSignal — consomme l'API backend ml-signal REEL.
 *
 * AUCUN calcul local : le hook ne derive JAMAIS un "signal ML" depuis
 * n_critical_gaps / avg_gap / n_active_alerts. Ces facteurs alimentent
 * la formule deterministe du dashboard (risk_engine.py), pas le ML.
 *
 * Si l'endpoint est indisponible (modele non entraine, skew, etc.),
 * `available=false` et `reason` documente pourquoi.
 */

import { useQuery } from "@tanstack/react-query";
import D2FService from "@/services/analyse/D2FService";
import type { TeacherMLSignal } from "@/services/analyse/D2FService";

export function useTeacherMLSignal(teacherId: string | undefined) {
  return useQuery<TeacherMLSignal>({
    queryKey: ["d2f", "ml-signal", teacherId],
    queryFn: () => D2FService.getTeacherMLSignal(teacherId!),
    enabled: !!teacherId,
    staleTime: 60_000,
  });
}

export default useTeacherMLSignal;

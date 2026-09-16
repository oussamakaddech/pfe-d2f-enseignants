import { useQuery } from "@tanstack/react-query";
import KPIService from "@/services/analyse/KPIService";
import ParticipantKPIService from "@/services/analyse/ParticipantKPIService";
import dayjs from "dayjs";

const START = "2020-01-01";
const END = dayjs().format("YYYY-MM-DD");
const STALE = 5 * 60 * 1000;

/** Agrège les statistiques transverses de toute la plateforme (module Formation). */
export function usePlatformKPIs() {
  const formationsByEtat = useQuery({
    queryKey: ["kpi", "formations-by-etat"],
    queryFn: () => KPIService.getFormationsByEtat(START, END),
    staleTime: STALE,
  });
  const formationsByType = useQuery({
    queryKey: ["kpi", "formations-by-type"],
    queryFn: () => KPIService.getFormationsByTypeFiltered({ start: START, end: END }),
    staleTime: STALE,
  });
  const heures = useQuery({
    queryKey: ["kpi", "heures"],
    queryFn: () => KPIService.getTotalHeures(START, END),
    staleTime: STALE,
  });
  const participants = useQuery({
    queryKey: ["kpi", "participants"],
    queryFn: () => KPIService.getUniqueParticipants(START, END),
    staleTime: STALE,
  });
  const globalParticipant = useQuery({
    queryKey: ["kpi", "global-participant"],
    queryFn: () => ParticipantKPIService.getGlobalParticipantKPI(START, END),
    staleTime: STALE,
  });
  const topParticipants = useQuery({
    queryKey: ["kpi", "top-participants"],
    queryFn: () => KPIService.getTopParticipants(START, END),
    staleTime: STALE,
  });

  return { formationsByEtat, formationsByType, heures, participants, globalParticipant, topParticipants };
}

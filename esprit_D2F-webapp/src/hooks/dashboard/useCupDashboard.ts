import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import KPIService from "@/services/analyse/KPIService";
import BesoinFormationService from "@/services/besoin/BesoinFormationService";
import dayjs from "dayjs";
import type { Priorite } from "@/models/besoin";
import type { DashboardScope } from "@/models/dashboard";

const START = dayjs().subtract(12, "month").startOf("month").format("YYYY-MM-DD");
const END = dayjs().format("YYYY-MM-DD");
const STALE = 5 * 60 * 1000;

export interface CompetenceDemandee {
  name: string;
  count: number;
}

export interface BesoinParDept {
  departement: string;
  total: number;
  approuves: number;
  enAttente: number;
  critiques: number;
  hautes: number;
}

export interface BesoinPriorise {
  id: string | number;
  label: string;
  urgency: number;
  impact: number;
  count: number;
  priorite: Priorite | "NON_DEFINIE";
  departement?: string;
  up?: string;
}

export interface TauxReussiteDomaine {
  domaine: string;
  reussite: number;
  enCours: number;
  echec: number;
}

function urgencyFromPriorite(p?: Priorite): number {
  switch (p) {
    case "CRITIQUE": return 5;
    case "HAUTE": return 4;
    case "MOYENNE": return 3;
    case "BASSE": return 2;
    default: return 2;
  }
}

function impactFromStrategique(s?: string): number {
  if (!s) return 2;
  const lower = s.toLowerCase();
  if (lower.includes("stratégique") || lower.includes("critique") || lower.includes("haute")) return 5;
  if (lower.includes("important") || lower.includes("élevé")) return 4;
  if (lower.includes("moyen") || lower.includes("modéré")) return 3;
  if (lower.includes("faible") || lower.includes("bas")) return 2;
  return 3;
}

export function useCupDashboard() {
  const { data: formationsByEtat, isLoading: etatLoading } = useQuery({
    queryKey: ["kpi", "formations-by-etat", START, END],
    queryFn: () => KPIService.getFormationsByEtat(START, END),
    staleTime: STALE,
  });

  const { data: formationsByType, isLoading: typeLoading } = useQuery({
    queryKey: ["kpi", "formations-by-type", START, END],
    queryFn: () => KPIService.getFormationsByTypeFiltered({ start: START, end: END }),
    staleTime: STALE,
  });

  const { data: heures } = useQuery({
    queryKey: ["kpi", "heures", START, END],
    queryFn: () => KPIService.getTotalHeures(START, END),
    staleTime: STALE,
  });

  const { data: participants } = useQuery({
    queryKey: ["kpi", "participants", START, END],
    queryFn: () => KPIService.getUniqueParticipants(START, END),
    staleTime: STALE,
  });

  const { data: deptAnalytics, isLoading: deptLoading } = useQuery({
    queryKey: ["cup", "dept-analytics"],
    queryFn: () => AnalyticsService.getFormationsParDepartement({}),
    staleTime: STALE,
  });

  const { data: upData } = useQuery({
    queryKey: ["cup", "up-analytics"],
    queryFn: () => AnalyticsService.getFormationsParUp({}),
    staleTime: STALE,
  });

  const { data: besoins = [], isLoading: besoinsLoading } = useQuery({
    queryKey: ["besoins"],
    queryFn: () => BesoinFormationService.getAllBesoinFormations(),
    staleTime: STALE,
  });

  const { data: overview } = useQuery({
    queryKey: ["analyse", "overview"],
    queryFn: () => import("@/services/analyse/AnalysePredictiveService").then((m) => m.default.getOverview()),
    staleTime: STALE,
  });

  const { data: inDemandCompetencies = [] } = useQuery({
    queryKey: ["analyse", "in-demand"],
    queryFn: () => import("@/services/analyse/AnalysePredictiveService").then((m) => m.default.getInDemandCompetencies()),
    staleTime: STALE,
  });

  const timelineScope: DashboardScope = {
    role: "cup",
    isAdmin: false,
    isCup: true,
    isEnseignant: false,
    isAnimateur: false,
    start: dayjs().subtract(11, "month").startOf("month").format("YYYY-MM-DD"),
    end: dayjs().endOf("month").format("YYYY-MM-DD"),
    rangeKey: "12m",
  };

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["dashboard", "timeline", timelineScope.start, timelineScope.end],
    queryFn: () => AnalyticsService.getFormationsParPeriode({
      granularite: "MOIS",
      debut: timelineScope.start,
      fin: timelineScope.end,
    }),
    enabled: !!timelineScope.start && !!timelineScope.end,
    staleTime: STALE,
  });

  // Derived: competences les plus demandees
  const topCompetences = useMemo<CompetenceDemandee[]>(() => {
    const comptMap = new Map<string, number>();
    for (const b of besoins) {
      if (b.theme) {
        comptMap.set(b.theme, (comptMap.get(b.theme) ?? 0) + 1);
      }
      if (b.titre) {
        comptMap.set(b.titre, (comptMap.get(b.titre) ?? 0) + 1);
      }
    }
    // Also add from in-demand competencies
    for (const c of inDemandCompetencies) {
      if (c.competency_name) {
        comptMap.set(c.competency_name, (comptMap.get(c.competency_name) ?? 0) + (c.demand_12m ?? c.demand_3m ?? 1));
      }
    }
    return [...comptMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [besoins, inDemandCompetencies]);

  // Derived: besoins par departement
  const besoinsParDept = useMemo<BesoinParDept[]>(() => {
    const deptMap = new Map<string, { total: number; approuves: number; enAttente: number; critiques: number; hautes: number }>();
    for (const b of besoins) {
      const dept = b.departement ?? "Non assigné";
      const existing = deptMap.get(dept) ?? { total: 0, approuves: 0, enAttente: 0, critiques: 0, hautes: 0 };
      existing.total++;
      if (b.approuveAdmin) existing.approuves++;
      else existing.enAttente++;
      if (b.priorite === "CRITIQUE") existing.critiques++;
      if (b.priorite === "HAUTE") existing.hautes++;
      deptMap.set(dept, existing);
    }
    return [...deptMap.entries()]
      .map(([departement, data]) => ({ departement, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [besoins]);

  // Derived: besoins priorises pour matrice
  const besoinsPriorises = useMemo<BesoinPriorise[]>(() => {
    return besoins
      .filter((b) => !b.approuveAdmin)
      .map((b) => ({
        id: b.idBesoinFormation ?? crypto.randomUUID(),
        label: b.titre ?? b.theme ?? "Sans titre",
        urgency: urgencyFromPriorite(b.priorite),
        impact: impactFromStrategique(b.impactStrategique),
        count: 1,
        priorite: b.priorite ?? "NON_DEFINIE",
        departement: b.departement,
        up: b.up,
      }));
  }, [besoins]);

  // Derived: taux de reussite par domaine (from formations)
  const tauxReussite = useMemo<TauxReussiteDomaine[]>(() => {
    const deptMap = new Map<string, { reussite: number; enCours: number; echec: number }>();
    const depts = deptAnalytics?.departements ?? [];
    for (const d of depts) {
      const tauxPart = d.tauxParticipation ?? 0;
      const engagements = d.scoreEngagement ?? 50;
      deptMap.set(d.departementNom, {
        reussite: Math.round(tauxPart * 0.8 + engagements * 0.2),
        enCours: Math.round(Math.max(0, 100 - tauxPart)),
        echec: Math.round(Math.min(tauxPart * 0.1, 10)),
      });
    }
    return [...deptMap.entries()]
      .map(([domaine, data]) => ({ domaine, ...data }))
      .sort((a, b) => b.reussite - a.reussite)
      .slice(0, 8);
  }, [deptAnalytics]);

  // KPIs summary
  const kpis = useMemo(() => {
    const total = formationsByEtat?.total ?? 0;
    const acheve = formationsByEtat?.acheve ?? 0;
    const enCours = formationsByEtat?.enCours ?? 0;
    const tauxReussiteGlobal = total > 0 ? Math.round((acheve / total) * 100) : 0;
    const tauxParticipation = deptAnalytics?.departements?.length
      ? Math.round(deptAnalytics.departements.reduce((s, d) => s + (d.tauxParticipation ?? 0), 0) / deptAnalytics.departements.length)
      : 0;
    const pendingBesoins = besoins.filter((b) => !b.approuveAdmin).length;
    const critiques = besoins.filter((b) => b.priorite === "CRITIQUE" && !b.approuveAdmin).length;

    return {
      totalFormations: total,
      achevees: acheve,
      enCours,
      tauxReussiteGlobal,
      tauxParticipation,
      totalHeures: heures ?? 0,
      participants: participants ?? 0,
      pendingBesoins,
      critiques,
      totalBesoins: besoins.length,
      departements: deptAnalytics?.departements?.length ?? 0,
      nbEnseignantsSuivis: overview?.nb_enseignants_suivis ?? 0,
      couverture: overview?.taux_couverture_global != null ? Math.round(overview.taux_couverture_global * 100) : null,
    };
  }, [formationsByEtat, deptAnalytics, besoins, heures, participants, overview]);

  return {
    kpis,
    topCompetences,
    besoinsParDept,
    besoinsPriorises,
    tauxReussite,
    deptAnalytics,
    upData,
    besoins,
    formationsByType,
    formationsByTypeLoading: typeLoading,
    timeline,
    timelineLoading,
    loading: etatLoading || besoinsLoading,
    deptLoading,
  };
}

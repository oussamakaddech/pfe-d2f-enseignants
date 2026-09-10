import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AnalyticsService from '@/services/analyse/AnalyticsService';
import KPIService from '@/services/analyse/KPIService';
import BesoinFormationService from '@/services/besoin/BesoinFormationService';
import dayjs from 'dayjs';
import type { Priorite } from '@/models/besoin';
import type { DashboardScope } from '@/models/dashboard';

const START = dayjs().subtract(12, 'month').startOf('month').format('YYYY-MM-DD');
const END = dayjs().format('YYYY-MM-DD');
const STALE = 5 * 60 * 1000;

export interface CompetenceDemandee {
  name: string;
  count: number;
  /** Priorité réelle maximale des besoins contribuant à cette compétence. */
  priorite?: Priorite | 'NON_DEFINIE';
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
  priorite: Priorite | 'NON_DEFINIE';
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
    case 'CRITIQUE':
      return 5;
    case 'HAUTE':
      return 4;
    case 'MOYENNE':
      return 3;
    case 'BASSE':
      return 2;
    default:
      return 2;
  }
}

function impactFromStrategique(s?: string): number {
  if (!s) return 2;
  const lower = s.toLowerCase();
  if (lower.includes('stratégique') || lower.includes('critique') || lower.includes('haute'))
    return 5;
  if (lower.includes('important') || lower.includes('élevé')) return 4;
  if (lower.includes('moyen') || lower.includes('modéré')) return 3;
  if (lower.includes('faible') || lower.includes('bas')) return 2;
  return 3;
}

const PRIORITE_RANK: Record<Priorite | 'NON_DEFINIE', number> = {
  CRITIQUE: 5,
  HAUTE: 4,
  MOYENNE: 3,
  BASSE: 2,
  NON_DEFINIE: 1,
};

export interface CupDashboardAccess {
  /** KPI formations (DASHBOARD_ADMIN_LIMITED : ADMIN/CUP/CHEF_DEP/ANIMATEUR/ResponsableDossier). */
  readKpis?: boolean;
  /** Liste globale des besoins (BESOIN_FORMATION_READ_ALL : ADMIN/CUP/CHEF_DEP/ANIMATEUR/ResponsableDossier). */
  readBesoins?: boolean;
  /** Pilotage prédictif (overview — DASHBOARD_ADMIN_FULL : ADMIN/CUP). */
  readOverview?: boolean;
  /** Compétences en demande (endpoint legacy, ouvert ADMIN/CUP/CHEF_DEP). */
  readInDemand?: boolean;
}

// Rôles autorisés à lire les KPI / besoins globaux (parité DASHBOARD_ADMIN_LIMITED
// et BESOIN_FORMATION_READ_ALL). L'ENSEIGNANT en est exclu (403 backend).
const CAN_READ_KPIS = [
  'admin',
  'CUP',
  'CHEF_DEPARTEMENT',
  'Animateur',
  'ResponsableDossier',
] as const;

export function useCupDashboard(pilotage: boolean = true, access: CupDashboardAccess = {}) {
  // Sans garde, ces requêtes partaient en 403 pour l'enseignant (KPI + besoins)
  // et en 403 pour le chef (overview — ADMIN/CUP uniquement).
  const readKpis = access.readKpis ?? pilotage;
  const readBesoins = access.readBesoins ?? pilotage;
  const readOverview = access.readOverview ?? pilotage;
  const readInDemand = access.readInDemand ?? pilotage;

  const { data: formationsByEtat, isLoading: etatLoading } = useQuery({
    queryKey: ['kpi', 'formations-by-etat', START, END],
    queryFn: () => KPIService.getFormationsByEtat(START, END),
    staleTime: STALE,
    enabled: readKpis,
  });

  const { data: formationsByType, isLoading: typeLoading } = useQuery({
    queryKey: ['kpi', 'formations-by-type', START, END],
    queryFn: () => KPIService.getFormationsByTypeFiltered({ start: START, end: END }),
    staleTime: STALE,
    enabled: readKpis,
  });

  const { data: formationsByDomaineRaw = [], isLoading: domaineLoading } = useQuery({
    queryKey: ['kpi', 'formations-by-domaine', START, END],
    queryFn: () => KPIService.getFormationsByDomaine(START, END),
    staleTime: STALE,
    enabled: readKpis,
  });
  const formationsByDomaine = formationsByDomaineRaw.filter(
    (d) =>
      d.label &&
      d.label.trim().toLowerCase() !== 'non défini' &&
      d.label.trim().toLowerCase() !== 'non defini',
  );

  const { data: formationsByCompetenceRaw = [], isLoading: competenceLoading } = useQuery({
    queryKey: ['kpi', 'formations-by-competence', START, END],
    queryFn: () => KPIService.getFormationsByCompetence(START, END),
    staleTime: STALE,
    enabled: readKpis,
  });
  const formationsByCompetence = formationsByCompetenceRaw.filter(
    (c) =>
      c.label &&
      c.label.trim().toLowerCase() !== 'non défini' &&
      c.label.trim().toLowerCase() !== 'non defini',
  );

  const { data: heures } = useQuery({
    queryKey: ['kpi', 'heures', START, END],
    queryFn: () => KPIService.getTotalHeures(START, END),
    staleTime: STALE,
    enabled: readKpis,
  });

  const { data: participants } = useQuery({
    queryKey: ['kpi', 'participants', START, END],
    queryFn: () => KPIService.getUniqueParticipants(START, END),
    staleTime: STALE,
    enabled: readKpis,
  });

  const { data: deptAnalytics, isLoading: deptLoading } = useQuery({
    queryKey: ['cup', 'dept-analytics'],
    queryFn: () => AnalyticsService.getFormationsParDepartement({}),
    staleTime: STALE,
    enabled: false, // Endpoint 404 Pending — désactivé pour éviter les erreurs en console.
  });

  const { data: upData } = useQuery({
    queryKey: ['cup', 'up-analytics'],
    queryFn: () => AnalyticsService.getFormationsParUp({}),
    staleTime: STALE,
    enabled: false, // Endpoint 404 Pending — désactivé pour éviter les erreurs en console.
  });

  const { data: besoins = [], isLoading: besoinsLoading } = useQuery({
    queryKey: ['besoins'],
    queryFn: () => BesoinFormationService.getAllBesoinFormations(),
    staleTime: STALE,
    // READ_ALL : l'enseignant n'y a pas accès (il consulte /mine).
    enabled: readBesoins,
  });

  const { data: overview } = useQuery({
    queryKey: ['analyse', 'overview'],
    queryFn: () =>
      import('@/services/analyse/AnalysePredictiveService').then((m) => m.default.getOverview()),
    staleTime: STALE,
    // Réserve le pilotage prédictif (overview) au périmètre ADMIN/CUP :
    // le chef de département et RESPONSABLE_DOSSIER reçoivent 403 côté backend.
    enabled: readOverview,
  });

  const { data: inDemandCompetencies = [] } = useQuery({
    queryKey: ['analyse', 'in-demand'],
    queryFn: () =>
      import('@/services/analyse/AnalysePredictiveService').then((m) =>
        m.default.getInDemandCompetencies(),
      ),
    staleTime: STALE,
    enabled: readInDemand,
  });

  const timelineScope: DashboardScope = {
    role: 'cup',
    isAdmin: false,
    isCup: true,
    isEnseignant: false,
    isAnimateur: false,
    start: dayjs().subtract(11, 'month').startOf('month').format('YYYY-MM-DD'),
    end: dayjs().endOf('month').format('YYYY-MM-DD'),
    rangeKey: '12m',
  };

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['dashboard', 'timeline', timelineScope.start, timelineScope.end],
    queryFn: () =>
      AnalyticsService.getFormationsParPeriode({
        granularite: 'MOIS',
        debut: timelineScope.start,
        fin: timelineScope.end,
      }),
    enabled: !!timelineScope.start && !!timelineScope.end,
    staleTime: STALE,
  });

  // Derived: competences les plus demandees (avec priorite reelle max)
  const topCompetences = useMemo<CompetenceDemandee[]>(() => {
    const comptMap = new Map<string, { count: number; priorite?: Priorite | 'NON_DEFINIE' }>();
    const add = (
      name: string | null | undefined,
      n: number,
      priorite?: Priorite | 'NON_DEFINIE',
    ) => {
      if (!name) return;
      const cur = comptMap.get(name) ?? { count: 0, priorite: undefined };
      cur.count += n;
      if (priorite && PRIORITE_RANK[priorite] > PRIORITE_RANK[cur.priorite ?? 'NON_DEFINIE']) {
        cur.priorite = priorite;
      }
      comptMap.set(name, cur);
    };
    for (const b of besoins) {
      add(b.theme, 1, b.priorite ?? 'NON_DEFINIE');
      add(b.titre, 1, b.priorite ?? 'NON_DEFINIE');
    }
    // Also add from in-demand competencies
    for (const c of inDemandCompetencies) {
      add(c.competency_name, c.demand_12m ?? c.demand_3m ?? 1);
    }
    return [...comptMap.entries()]
      .map(([name, v]) => ({ name, count: v.count, priorite: v.priorite }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [besoins, inDemandCompetencies]);

  // Derived: besoins par departement
  const besoinsParDept = useMemo<BesoinParDept[]>(() => {
    const deptMap = new Map<
      string,
      { total: number; approuves: number; enAttente: number; critiques: number; hautes: number }
    >();
    for (const b of besoins) {
      const dept = b.departement ?? 'Non assigné';
      const existing = deptMap.get(dept) ?? {
        total: 0,
        approuves: 0,
        enAttente: 0,
        critiques: 0,
        hautes: 0,
      };
      existing.total++;
      if (b.approuveAdmin) existing.approuves++;
      else existing.enAttente++;
      if (b.priorite === 'CRITIQUE') existing.critiques++;
      if (b.priorite === 'HAUTE') existing.hautes++;
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
        label: b.titre ?? b.theme ?? 'Sans titre',
        urgency: urgencyFromPriorite(b.priorite),
        impact: impactFromStrategique(b.impactStrategique),
        count: 1,
        priorite: b.priorite ?? 'NON_DEFINIE',
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
      ? Math.round(
          deptAnalytics.departements.reduce((s, d) => s + (d.tauxParticipation ?? 0), 0) /
            deptAnalytics.departements.length,
        )
      : 0;
    const pendingBesoins = besoins.filter((b) => !b.approuveAdmin).length;
    const critiques = besoins.filter((b) => b.priorite === 'CRITIQUE' && !b.approuveAdmin).length;

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
      // Le backend renvoie déjà un pourcentage (0-100) : pas de *100 ici.
      couverture:
        overview?.taux_couverture_global != null
          ? Math.round(overview.taux_couverture_global)
          : null,
      // Variation réelle vs snapshot précédent (points de pourcentage), null si indisponible.
      couvertureDelta:
        overview?.deltas?.taux_couverture_global != null
          ? Math.round((overview.deltas.taux_couverture_global as number) * 10) / 10
          : null,
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
    formationsByDomaine,
    formationsByDomaineLoading: domaineLoading,
    formationsByCompetence,
    formationsByCompetenceLoading: competenceLoading,
    timeline,
    timelineLoading,
    loading: etatLoading || besoinsLoading,
    deptLoading,
  };
}

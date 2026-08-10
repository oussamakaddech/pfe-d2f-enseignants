/**
 * Wrapper de compatibilite : traduit les anciens hooks useDashboard/useAtRisk/useAlerts
 * vers les nouveaux endpoints D2F master.
 *
 * But : permettre a AnalyticsDashboardPage (legacy) d'afficher les chiffres
 * du dataset maitre D2F (source unique de verite) sans reimplementation complete.
 *
 * Usage : remplacer l'import dans AnalyticsDashboardPage.tsx :
 *   AVANT: from "@/hooks/analytics/useAnalyticsQueries"
 *   APRES: from "@/hooks/analytics/useAnalyticsD2FAdapter"
 *
 * Chaque hook retourne la MEME forme de donnees que les hooks legacy,
 * mais les valeurs viennent de /api/v1/d2f/* (maitre).
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import D2FService from '@/services/analyse/D2FService';
import type { TypeAlerte, SeveriteAlerte, StatutAlerte } from '@/models/analyse/analyticsFeature';

// Forme legacy compatible (sous-ensemble minimal)
// La page AnalyticsDashboardPage consomme des champs comme data.kpis.*, data.heatmap, etc.

type NiveauRisque = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE';

export interface LegacyAtRiskTeacher {
  enseignant_id: string;
  nom: string;
  departement: string;
  up: string;
  score_risque: number;
  niveau_risque: NiveauRisque;
  nb_gaps_critiques: number;
  tendance: string;
  disengagement_signals?: string[];
  recommendation: string;
}

export interface LegacyKpis {
  nb_enseignants_suivis: number;
  score_risque_moyen: number;
  nb_gaps_critiques: number;
  nb_alertes_nouvelles: number;
  taux_couverture_global: number;
  nb_regression: number;
  nb_stagnation: number;
  besoins_critiques_non_satisfaits: number;
  alertes_critiques_ouvertes: number;
  nb_profils_risque: number;
}

export interface LegacyDashboardData {
  generated_at: string;
  kpis: LegacyKpis;
  enseignants_a_risque: LegacyAtRiskTeacher[];
  heatmap: Array<{
    departement: string;
    competence_id: number;
    competence_nom: string;
    avg_gap: number;
    enseignants_count: number;
  }>;
  alertes_recentes: Array<{
    id: number;
    type_alerte: TypeAlerte;
    cible_type: 'INDIVIDUEL' | 'DEPARTEMENT' | 'GLOBAL';
    enseignant_id: string | null;
    departement_id: string | null;
    competence_id: number | null;
    severite: SeveriteAlerte;
    titre: string;
    message: string;
    statut: StatutAlerte;
    created_at: string;
  }>;
  top_formations: Array<{
    formation_id: number;
    formation_titre: string;
    nb_recommandations: number;
    enseignants_cibles: number;
    departements: string[];
    competences_couvertes: string[];
    impact_estime: number;
    score_moyen: number;
    proba_reussite_moy: number;
  }>;
  tendances: Array<{
    month: string;
    critical: number;
    high: number;
    score_risque_moyen: number;
    nb_alertes: number;
    nb_gaps_critiques: number;
  }>;
}

/**
 * useDashboard — KPI + heatmap + alertes (calcule depuis D2F master).
 */
export function useDashboard(_opts: unknown = {}) {
  const kpisQ = useQuery({
    queryKey: ['d2f', 'kpis'],
    queryFn: () => D2FService.getKPIs(),
    staleTime: 60_000,
  });
  const atRiskQ = useQuery({
    queryKey: ['d2f', 'at-risk'],
    queryFn: () => D2FService.getAtRiskTeachers(),
    staleTime: 60_000,
  });
  const heatmapQ = useQuery({
    queryKey: ['d2f', 'heatmap'],
    queryFn: () => D2FService.getHeatmap(),
    staleTime: 60_000,
  });
  const statsQ = useQuery({
    queryKey: ['d2f', 'stats'],
    queryFn: () => D2FService.getStats(),
    staleTime: 60_000,
  });
  // Liste complète des enseignants pour récupérer up_code / department_code
  // (getAtRiskTeachers ne renvoie que department_nom).
  const teachersListQ = useQuery({
    queryKey: ['d2f', 'teachers', 'all-ish'],
    queryFn: () => D2FService.listTeachers({ limit: 500 }),
    staleTime: 120_000,
  });
  // Tendances calculées côté frontend depuis les alertes CSV
  // (évite la dépendance au endpoint DB risk-evolution qui peut être vide)
  const alertsListQ = useQuery({
    queryKey: ['d2f', 'alerts'],
    queryFn: () => D2FService.listAlerts(),
    staleTime: 60_000,
  });
  // Top formations enrichies (agrégées depuis le CSV master dataset) —
  // corrige les recommandations vides (0 enseignants, "À évaluer", 0% risque).
  // On agrège les recommandations par training_code pour produire le format
  // TopFormation attendu par TopFormationsTable.
  const topFormationsCsvQ = useQuery({
    queryKey: ['d2f', 'top-formations-csv'],
    queryFn: () => D2FService.getTopFormations(50),
    staleTime: 120_000,
  });
  // Plan d'action prioritaire (pour besoins_critiques_non_satisfaits)
  const planActionsQ = useQuery({
    queryKey: ['d2f', 'plan-actions'],
    queryFn: () => D2FService.getPlanActions(),
    staleTime: 60_000,
  });

  const k = kpisQ.data;
  const s = statsQ.data;

  // Tendances calculées depuis les alertes CSV (agrégées par mois)
  const computedTrends = useMemo(() => {
    const alerts = alertsListQ.data?.alerts ?? [];
    if (alerts.length === 0) return [];

    const SEVERITY_WEIGHT: Record<string, number> = {
      CRITICAL: 1.0,
      CRITIQUE: 1.0,
      WARNING: 0.6,
      HAUTE: 0.6,
      MOYENNE: 0.3,
      INFO: 0.1,
    };

    // Grouper par mois ( YYYY-MM )
    const byMonth = new Map<
      string,
      { critical: number; high: number; total: number; weights: number[] }
    >();
    for (const a of alerts) {
      const raw = a.created_at ?? '';
      const match = /^(\d{4}-\d{2})/.exec(raw);
      if (!match) continue;
      const mois = match[1];
      const entry = byMonth.get(mois) ?? { critical: 0, high: 0, total: 0, weights: [] };
      const sev = (a.severity ?? '').toUpperCase();
      const w = SEVERITY_WEIGHT[sev] ?? 0.3;
      entry.weights.push(w);
      entry.total += 1;
      if (sev === 'CRITICAL' || sev === 'CRITIQUE') entry.critical += 1;
      else if (sev === 'WARNING' || sev === 'HAUTE' || sev === 'MOYENNE') entry.high += 1;
      byMonth.set(mois, entry);
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, e]) => ({
        month,
        critical: e.critical,
        high: e.high,
        nb_gaps_critiques: e.critical,
        score_risque_moyen:
          e.weights.length > 0
            ? Math.round((e.weights.reduce((a, b) => a + b, 0) / e.weights.length) * 100) / 100
            : 0,
        nb_alertes: e.total,
      }));
  }, [alertsListQ.data]);

  // Index teacher_id → { up_code, department_nom } pour enrichir at-risk.
  const teacherIdx = useMemo(() => {
    const map = new Map<string, { up: string; deptNom: string }>();
    for (const t of teachersListQ.data?.teachers ?? []) {
      map.set(t.teacher_id, {
        up: t.up_code ?? '',
        deptNom: t.department_nom ?? '',
      });
    }
    return map;
  }, [teachersListQ.data]);

  // Agrégation des formations CSV par training_code → format TopFormation.
  const aggregatedFormations: LegacyDashboardData['top_formations'] = useMemo(() => {
    const formations = topFormationsCsvQ.data?.formations ?? [];
    const agg = new Map<
      string,
      {
        formation_titre: string;
        ens: Set<string>;
        comps: Set<string>;
        relevanceScores: number[];
        riskReductions: number[];
      }
    >();
    for (const f of formations) {
      // Ignorer les entrées sans teacher_id ou training_code valide
      if (!f.teacher_id || !f.training_code) continue;
      const key = f.training_code;
      const entry = agg.get(key) ?? {
        formation_titre: f.training_title,
        ens: new Set<string>(),
        comps: new Set<string>(),
        relevanceScores: [] as number[],
        riskReductions: [] as number[],
      };
      entry.ens.add(f.teacher_id);
      if (f.target_competency_code) {
        entry.comps.add(f.target_competency_code);
      }
      const relScore = Number(f.relevance_score);
      if (Number.isFinite(relScore)) {
        entry.relevanceScores.push(relScore);
      }
      const riskRed = Number(f.expected_risk_reduction);
      if (Number.isFinite(riskRed)) {
        entry.riskReductions.push(riskRed);
      }
      agg.set(key, entry);
    }
    return Array.from(agg.entries()).map(([code, e], i) => {
      const ensList = Array.from(e.ens);
      const depts = Array.from(
        new Set(
          ensList.map((tid) => teacherIdx.get(tid)?.deptNom).filter((d): d is string => Boolean(d)),
        ),
      );
      const avgRelevance =
        e.relevanceScores.length > 0
          ? e.relevanceScores.reduce((a, b) => a + b, 0) / e.relevanceScores.length
          : 0;
      const avgRiskReduction =
        e.riskReductions.length > 0
          ? e.riskReductions.reduce((a, b) => a + b, 0) / e.riskReductions.length
          : 0;
      return {
        formation_id: i + 1,
        formation_titre: e.formation_titre,
        nb_recommandations: e.ens.size,
        enseignants_cibles: e.ens.size,
        departements: depts,
        competences_couvertes: Array.from(e.comps),
        impact_estime: Math.round(avgRiskReduction * 1000) / 1000,
        score_moyen: Math.round(avgRelevance * 1000) / 1000,
        proba_reussite_moy: Math.round(avgRelevance * 1000) / 1000,
      };
    });
  }, [topFormationsCsvQ.data, teacherIdx]);

  // Construire l'objet data legacy-compatible
  const data: LegacyDashboardData | undefined = k
    ? {
        generated_at: k.generated_at,
        kpis: {
          nb_enseignants_suivis: k.total_teachers,
          score_risque_moyen: k.score_risque_moyen,
          nb_gaps_critiques: k.nb_gaps_critiques,
          nb_alertes_nouvelles: k.nb_alertes_nouvelles,
          taux_couverture_global: k.taux_couverture_global,
          nb_regression: s?.en_regression ?? 0,
          nb_stagnation: s?.en_stagnation ?? 0,
          besoins_critiques_non_satisfaits: planActionsQ.data?.couvrir_besoins_critiques ?? 0,
          alertes_critiques_ouvertes: s?.alertes_critiques_ouvertes ?? 0,
          nb_profils_risque: k.total_teachers,
        },
        enseignants_a_risque: (atRiskQ.data?.teachers ?? []).map((t) => {
          const extra = teacherIdx.get(t.teacher_id);
          return {
            enseignant_id: t.teacher_id,
            nom: t.teacher_name,
            departement: t.department ?? extra?.deptNom ?? '',
            up: t.up_code ?? extra?.up ?? '',
            score_risque: t.risk_score,
            niveau_risque: t.risk_level as NiveauRisque,
            nb_gaps_critiques: t.n_critical_gaps,
            tendance: 'STABLE',
            recommendation: 'Planifier formation ciblee',
          };
        }),
        heatmap: (heatmapQ.data?.cells ?? []).map((c) => ({
          departement: c.departement_nom || c.departement,
          competence_id: 0,
          competence_nom: c.competence_nom,
          avg_gap: c.avg_gap,
          enseignants_count: c.enseignants_count,
        })),
        alertes_recentes: [],
        top_formations: aggregatedFormations,
        tendances: computedTrends,
      }
    : undefined;

  return {
    data,
    isLoading: kpisQ.isLoading || atRiskQ.isLoading || planActionsQ.isLoading,
    isFetching: kpisQ.isFetching,
    isError: kpisQ.isError,
    refetch: () => {
      kpisQ.refetch();
      atRiskQ.refetch();
      heatmapQ.refetch();
      statsQ.refetch();
      teachersListQ.refetch();
      alertsListQ.refetch();
      topFormationsCsvQ.refetch();
      planActionsQ.refetch();
    },
  };
}

/**
 * useAtRisk — liste des enseignants a risque (depuis D2F).
 */
export function useAtRisk(_opts: unknown = {}) {
  const q = useQuery({
    queryKey: ['d2f', 'at-risk'],
    queryFn: () => D2FService.getAtRiskTeachers(),
    staleTime: 60_000,
  });
  const teachersListQ = useQuery({
    queryKey: ['d2f', 'teachers', 'all-ish'],
    queryFn: () => D2FService.listTeachers({ limit: 500 }),
    staleTime: 120_000,
  });
  const teacherIdx = useMemo(() => {
    const map = new Map<string, { up: string; deptNom: string }>();
    for (const t of teachersListQ.data?.teachers ?? []) {
      map.set(t.teacher_id, {
        up: t.up_code ?? '',
        deptNom: t.department_nom ?? '',
      });
    }
    return map;
  }, [teachersListQ.data]);
  const data: LegacyAtRiskTeacher[] = (q.data?.teachers ?? []).map((t) => {
    const extra = teacherIdx.get(t.teacher_id);
    return {
      enseignant_id: t.teacher_id,
      nom: t.teacher_name,
      departement: t.department ?? extra?.deptNom ?? '',
      up: t.up_code ?? extra?.up ?? '',
      score_risque: t.risk_score,
      niveau_risque: t.risk_level as NiveauRisque,
      nb_gaps_critiques: t.n_critical_gaps,
      tendance: 'STABLE',
      recommendation: 'Planifier formation ciblee',
    };
  });
  return {
    data,
    isLoading: q.isLoading || teachersListQ.isLoading,
    isFetching: q.isFetching,
    refetch: q.refetch,
  };
}

// ── Mappers pour les alertes D2F (CSV) → AlertEvent (AlertCenter) ────────
// Le CSV alerts a: type (lowercase: gap_critique, stagnation, ...),
// severity (CRITIQUE/HAUTE/MOYENNE), status (NOUVELLE/LUE/...).
// AlertCenter attend type_alerte (GAP_CRITIQUE), severite (CRITICAL/WARNING/INFO),
// statut (NOUVELLE/LUE/TRAITEE/IGNOREE/ESCALADEE).
const TYPE_ALERTE_MAP: Record<string, TypeAlerte> = {
  gap_critique: 'GAP_CRITIQUE',
  stagnation: 'STAGNATION',
  regression: 'REGRESSION',
  tendance_departement: 'TENDANCE_DEPARTEMENT',
  completion_faible: 'COMPLETION_FAIBLE',
  besoin_non_couvert: 'BESOIN_NON_COUVERT',
};
const SEVERITE_MAP: Record<string, SeveriteAlerte> = {
  CRITIQUE: 'CRITICAL',
  HAUTE: 'WARNING',
  MOYENNE: 'WARNING',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  INFO: 'INFO',
};
const STATUT_MAP: Record<string, StatutAlerte> = {
  NOUVELLE: 'NOUVELLE',
  LUE: 'LUE',
  EN_COURS: 'LUE',
  RESOLUE: 'TRAITEE',
  TRAITEE: 'TRAITEE',
  IGNOREE: 'IGNOREE',
  ESCALADEE: 'ESCALADEE',
};
function mapTypeAlerte(raw: string): TypeAlerte {
  return TYPE_ALERTE_MAP[(raw ?? '').toLowerCase()] ?? 'BESOIN_NON_COUVERT';
}
function mapSeverite(raw: string): SeveriteAlerte {
  return SEVERITE_MAP[(raw ?? '').toUpperCase()] ?? 'INFO';
}
function mapStatut(raw: string): StatutAlerte {
  return STATUT_MAP[(raw ?? '').toUpperCase()] ?? 'NOUVELLE';
}
function parseAlertId(raw: string | number | undefined, fallback: number): number {
  const s = String(raw ?? '');
  const digits = /\d+/.exec(s);
  if (digits) return Number(digits[0]);
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}
function sanitizeDateFormat(dateStr: string | undefined): string {
  if (!dateStr || dateStr === 'Invalid Date' || dateStr.trim() === '') {
    return new Date().toISOString();
  }
  // Normaliser les dates YYYY-MM-DD (date-only) → ISO complet
  const isoMatch = /^(\d{4}-\d{2}-\d{2})([T\s].*)?$/.exec(dateStr);
  if (isoMatch) {
    return `${isoMatch[1]}T00:00:00Z`;
  }
  // Essayer de parser la date et vérifier qu'elle est valide
  const parsed = new Date(dateStr);
  if (Number.isFinite(parsed.getTime())) {
    return parsed.toISOString();
  }
  // Fallback : retourner la date actuelle si le format est invalide
  return new Date().toISOString();
}
function deriveTitre(type: TypeAlerte, message: string): string {
  const head = message?.split(/[.:]/)[0] ?? type;
  return head.length > 0 ? head : (TITRE_BY_TYPE[type] ?? type);
}
const TITRE_BY_TYPE: Record<TypeAlerte, string> = {
  GAP_CRITIQUE: 'Gap critique détecté',
  STAGNATION: 'Stagnation prolongée',
  REGRESSION: 'Régression observée',
  TENDANCE_DEPARTEMENT: 'Tendance départementale',
  COMPLETION_FAIBLE: 'Complétion faible',
  BESOIN_NON_COUVERT: 'Besoin non couvert',
};

/**
 * useAlerts — liste des alertes (depuis D2F).
 */
export function useAlerts(_opts: unknown = {}) {
  const q = useQuery({
    queryKey: ['d2f', 'alerts'],
    queryFn: () => D2FService.listAlerts(),
    staleTime: 30_000,
  });
  const alerts = (q.data?.alerts ?? []).map((a, i) => {
    const typeAlerte = mapTypeAlerte(a.type);
    const message = a.message ?? '';
    return {
      id: parseAlertId(a.alert_id, i + 1),
      type_alerte: typeAlerte,
      cible_type: 'INDIVIDUEL' as const,
      enseignant_id: a.teacher_id ?? null,
      departement_id: null,
      competence_id: null,
      severite: mapSeverite(a.severity),
      titre: deriveTitre(typeAlerte, message),
      message,
      statut: mapStatut(a.status),
      created_at: sanitizeDateFormat(a.created_at),
    };
  });
  return {
    data: { alerts },
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}

/**
 * useUpdateAlert — mutation (legacy, delegue a updateRecoStatus pour la demo).
 * Note : le master dataset CSV n'est pas modifiable, donc on simule.
 */
export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id: _id, payload: _payload }: { id: number | string; payload: unknown }) =>
      Promise.resolve({ success: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['d2f', 'alerts'] }),
  });
}

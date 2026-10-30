import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCupDashboard, customRangeLabel } from '@/hooks/dashboard/useCupDashboard';
import AnalyticsService from '@/services/analyse/AnalyticsService';
import KPIService from '@/services/analyse/KPIService';
import BesoinFormationService from '@/services/besoin/BesoinFormationService';
import AnalysePredictiveService from '@/services/analyse/AnalysePredictiveService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/analyse/AnalyticsService', () => ({
  default: {
    getFormationsParDepartement: vi.fn(),
    getFormationsParUp: vi.fn(),
    getFormationsParPeriode: vi.fn(),
  },
  __esModule: true,
}));
vi.mock('@/services/analyse/KPIService', () => ({
  default: {
    getFormationsByEtat: vi.fn(),
    getFormationsByTypeFiltered: vi.fn(),
    getFormationsByDomaine: vi.fn(),
    getFormationsByCompetence: vi.fn(),
    getTotalHeures: vi.fn(),
    getUniqueParticipants: vi.fn(),
    getFormateurs: vi.fn(),
  },
  __esModule: true,
}));
vi.mock('@/services/besoin/BesoinFormationService', () => ({
  default: { getAllBesoinFormations: vi.fn() },
  __esModule: true,
}));
vi.mock('@/services/analyse/AnalysePredictiveService', () => ({
  default: {
    getOverview: vi.fn(),
    getInDemandCompetencies: vi.fn(),
  },
  __esModule: true,
}));

const A = AnalyticsService as unknown as { [k: string]: ReturnType<typeof vi.fn> };
const K = KPIService as unknown as { [k: string]: ReturnType<typeof vi.fn> };
const B = BesoinFormationService as unknown as { [k: string]: ReturnType<typeof vi.fn> };
const P = AnalysePredictiveService as unknown as { [k: string]: ReturnType<typeof vi.fn> };

const settled = async (result: { current: { besoins: unknown[] } }) => {
  await waitFor(() => expect(result.current.besoins).toBeDefined());
};

describe('useCupDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    K.getFormationsByEtat.mockResolvedValue({ total: 0, acheve: 0, enCours: 0 });
    K.getFormationsByTypeFiltered.mockResolvedValue([]);
    K.getFormationsByDomaine.mockResolvedValue([]);
    K.getFormationsByCompetence.mockResolvedValue([]);
    K.getTotalHeures.mockResolvedValue(0);
    K.getUniqueParticipants.mockResolvedValue(0);
    K.getFormateurs.mockResolvedValue({ total: 0, internes: 0, externes: 0 });
    A.getFormationsParDepartement.mockResolvedValue({ departements: [] });
    A.getFormationsParUp.mockResolvedValue([]);
    A.getFormationsParPeriode.mockResolvedValue([]);
    B.getAllBesoinFormations.mockResolvedValue([]);
    P.getOverview.mockResolvedValue({ nb_enseignants_suivis: 0, taux_couverture_global: 0 });
    P.getInDemandCompetencies.mockResolvedValue([]);
  });

  it('computes kpis from queries', async () => {
    K.getFormationsByEtat.mockResolvedValue({ total: 10, acheve: 6, enCours: 4 });
    K.getTotalHeures.mockResolvedValue(40);
    K.getUniqueParticipants.mockResolvedValue(8);
    A.getFormationsParDepartement.mockResolvedValue({ departements: [] });
    B.getAllBesoinFormations.mockResolvedValue([
      { approuveAdmin: false, priorite: 'CRITIQUE' },
      { approuveAdmin: true, priorite: 'BASSE' },
    ]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kpis.totalFormations).toBe(10));
    expect(result.current.kpis.achevees).toBe(6);
    expect(result.current.kpis.participants).toBe(8);
    expect(result.current.kpis.pendingBesoins).toBe(1);
    expect(result.current.kpis.critiques).toBe(1);
  });

  it('besoinsParDept aggregates by department', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    B.getAllBesoinFormations.mockResolvedValue([
      { departement: 'INFO', approuveAdmin: false, priorite: 'HAUTE' },
      { departement: 'INFO', approuveAdmin: true, priorite: 'BASSE' },
      { departement: 'TI', approuveAdmin: false, priorite: 'CRITIQUE' },
    ]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.besoinsParDept).toHaveLength(2));
    const info = result.current.besoinsParDept.find((d) => d.departement === 'INFO');
    expect(info).toMatchObject({ total: 2, approuves: 1, enAttente: 1, hautes: 1, critiques: 0 });
    expect(result.current.besoinsParDept[0].total).toBeGreaterThanOrEqual(
      result.current.besoinsParDept[1].total,
    );
  });

  it('besoinsParDept uses default dept and handles unresolved values', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    B.getAllBesoinFormations.mockResolvedValue([
      { approuveAdmin: undefined },
      { priorite: undefined },
    ]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.besoinsParDept).toHaveLength(1));
    expect(result.current.besoinsParDept[0]).toMatchObject({
      departement: 'Non assigné',
      total: 2,
      approuves: 0,
      enAttente: 2,
      critiques: 0,
      hautes: 0,
    });
  });

  it('topCompetences derives from besoins and in-demand', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    B.getAllBesoinFormations.mockResolvedValue([
      { theme: 'React', titre: 'React avancé' },
      { theme: 'React' },
    ]);
    const seeded = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    seeded.setQueryData(['analyse', 'in-demand'], [{ competency_name: 'Python', demand_12m: 5 }]);
    const seededWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: seeded }, children);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: seededWrapper });
    await waitFor(
      () => {
        const names = result.current.topCompetences.map((c) => c.name);
        expect(names).toContain('React');
        expect(names).toContain('Python');
      },
      { timeout: 5000 },
    );
    const names = result.current.topCompetences.map((c) => c.name);
    expect(names).toContain('React');
    expect(names).toContain('React avancé');
    expect(names).toContain('Python');
    expect(result.current.topCompetences.length).toBeLessThanOrEqual(10);
  });

  it('topCompetences empty when no data', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    B.getAllBesoinFormations.mockResolvedValue([]);
    P.getInDemandCompetencies.mockResolvedValue([{ competency_name: '' }]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.topCompetences).toHaveLength(0));
  });

  it('besoinsPriorises maps only non-approved besoins', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    B.getAllBesoinFormations.mockResolvedValue([
      {
        idBesoinFormation: 1,
        titre: 'T1',
        priorite: 'CRITIQUE',
        impactStrategique: 'Très stratégique',
        approuveAdmin: false,
        departement: 'INFO',
        up: 'UP1',
      },
      {
        idBesoinFormation: 2,
        theme: 'Th2',
        priorite: 'HAUTE',
        impactStrategique: 'faible',
        approuveAdmin: true,
      },
    ]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.besoinsPriorises).toHaveLength(1));
    expect(result.current.besoinsPriorises[0]).toMatchObject({
      id: 1,
      label: 'T1',
      urgency: 5,
      impact: 5,
      priorite: 'CRITIQUE',
      departement: 'INFO',
      up: 'UP1',
    });
  });

  it('besoinsPriorises defaults when missing fields', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    B.getAllBesoinFormations.mockResolvedValue([{ approuveAdmin: false }]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.besoinsPriorises).toHaveLength(1));
    expect(result.current.besoinsPriorises[0]).toMatchObject({
      label: 'Sans titre',
      urgency: 2,
      impact: 2,
      count: 1,
      priorite: 'NON_DEFINIE',
    });
  });

  it('tauxReussite derives from dept analytics', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    // La query dept-analytics est désactivée : on sème la donnée dans le cache.
    const seeded = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    seeded.setQueryData(['cup', 'dept-analytics'], {
      departements: [
        { departementNom: 'INFO', tauxParticipation: 80, scoreEngagement: 60 },
        { departementNom: 'TI', tauxParticipation: 50, scoreEngagement: 50 },
      ],
    });
    const seededWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: seeded }, children);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: seededWrapper });
    await waitFor(() => expect(result.current.tauxReussite).toHaveLength(2));
    const info = result.current.tauxReussite.find((d) => d.domaine === 'INFO');
    expect(info?.reussite).toBe(Math.round(80 * 0.8 + 60 * 0.2));
    expect(result.current.tauxReussite[0].reussite).toBeGreaterThanOrEqual(
      result.current.tauxReussite[1].reussite,
    );
    expect(result.current.tauxReussite.length).toBeLessThanOrEqual(8);
  });

  it('tauxReussite empty when no dept analytics', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    A.getFormationsParDepartement.mockResolvedValue({});
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tauxReussite).toEqual([]);
  });

  it('kpis with zero totals and null overview', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    K.getTotalHeures.mockResolvedValue(undefined);
    K.getUniqueParticipants.mockResolvedValue(undefined);
    A.getFormationsParDepartement.mockResolvedValue({ departements: [] });
    B.getAllBesoinFormations.mockResolvedValue([]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kpis.tauxReussiteGlobal).toBe(0));
    expect(result.current.kpis.totalHeures).toBe(0);
    expect(result.current.kpis.participants).toBe(0);
    expect(result.current.kpis.tauxParticipation).toBe(0);
    expect(result.current.kpis.nbEnseignantsSuivis).toBe(0);
    expect(result.current.kpis.couverture).toBeNull();
  });

  it('kpis with overview values', async () => {
    K.getFormationsByEtat.mockResolvedValue({});
    A.getFormationsParDepartement.mockResolvedValue({ departements: [{ tauxParticipation: 100 }] });
    B.getAllBesoinFormations.mockResolvedValue([]);
    // Le backend renvoie déjà un pourcentage (0-100) et un delta en points.
    P.getOverview.mockResolvedValue({
      nb_enseignants_suivis: 12,
      taux_couverture_global: 75,
      deltas: { taux_couverture_global: 2.5 },
    });
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kpis.nbEnseignantsSuivis).toBe(12));
    expect(result.current.kpis.couverture).toBe(75);
    expect(result.current.kpis.couvertureDelta).toBe(2.5);
  });

  it('exposes raw data and loading flags', async () => {
    K.getFormationsByEtat.mockResolvedValue({ total: 1 });
    K.getFormationsByTypeFiltered.mockResolvedValue([{ type: 'A' }]);
    A.getFormationsParDepartement.mockResolvedValue({ departements: [] });
    A.getFormationsParUp.mockResolvedValue([{ up: 'UP1' }]);
    B.getAllBesoinFormations.mockResolvedValue([]);
    A.getFormationsParPeriode.mockResolvedValue([{ x: 1 }]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.timeline).toEqual([{ x: 1 }]));
    expect(result.current.formationsByType).toEqual([{ type: 'A' }]);
    // La query up-analytics est volontairement désactivée (endpoint 404) : pas de données.
    expect(result.current.upData).toBeUndefined();
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.formationsByTypeLoading).toBe('boolean');
    expect(typeof result.current.timelineLoading).toBe('boolean');
  });

  // ── Indicateurs de période : heures, formateurs, participants, compétences ──

  it('exposes period KPIs (heures, formateurs, participants, compétences)', async () => {
    K.getTotalHeures.mockResolvedValue(320);
    K.getUniqueParticipants.mockResolvedValue(57);
    K.getFormateurs.mockResolvedValue({ total: 12, internes: 9, externes: 3 });
    K.getFormationsByCompetence.mockResolvedValue([
      { label: 'BIM', count: 4 },
      { label: 'Géotechnique', count: 2 },
    ]);
    const { result } = renderHook(() => useCupDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.kpis.formateurs.total).toBe(12));
    expect(result.current.kpis.totalHeures).toBe(320);
    expect(result.current.kpis.participants).toBe(57);
    expect(result.current.kpis.formateurs).toEqual({ total: 12, internes: 9, externes: 3 });
    // 2 compétences couvertes, 6 rattachements formation ↔ compétence.
    expect(result.current.kpis.competencesCouvertes).toBe(2);
    expect(result.current.kpis.liensCompetences).toBe(6);
  });

  it('queries the rolling window of the selected period', async () => {
    type P = '30j' | 'trimestre' | 'semestre' | 'annee';
    const { result, rerender } = renderHook(
      ({ period }: { period: P }) => useCupDashboard(true, {}, period),
      { wrapper: createWrapper(), initialProps: { period: '30j' as P } },
    );

    await waitFor(() => expect(K.getTotalHeures).toHaveBeenCalled());
    const [start30, end30] = K.getTotalHeures.mock.calls[0] as [string, string];
    // Fenêtre de 30 jours (et non 12 mois) : au moins 29 jours d'écart.
    const spanDays = (new Date(end30).getTime() - new Date(start30).getTime()) / 86_400_000;
    expect(Math.round(spanDays)).toBe(30);

    rerender({ period: 'annee' });
    await waitFor(() => expect(K.getTotalHeures).toHaveBeenCalledTimes(2));
    const [startYear, endYear] = K.getTotalHeures.mock.calls[1] as [string, string];
    const spanYear = (new Date(endYear).getTime() - new Date(startYear).getTime()) / 86_400_000;
    expect(Math.round(spanYear)).toBeGreaterThanOrEqual(364);
    expect(result.current.kpis).toBeDefined();
  });

  it('uses an explicit custom range and returns to the preset when cleared', async () => {
    type Range = { start: string; end: string } | null;
    const { rerender } = renderHook(
      ({ range }: { range: Range }) => useCupDashboard(true, {}, 'annee', range),
      {
        wrapper: createWrapper(),
        initialProps: { range: { start: '2026-01-05', end: '2026-02-20' } as Range },
      },
    );

    await waitFor(() => expect(K.getTotalHeures).toHaveBeenCalled());
    expect(K.getTotalHeures).toHaveBeenLastCalledWith('2026-01-05', '2026-02-20');
    // Les KPI « de période » suivent la plage, pas la fenêtre glissante.
    expect(K.getUniqueParticipants).toHaveBeenLastCalledWith('2026-01-05', '2026-02-20');

    rerender({ range: null });
    await waitFor(() => expect(K.getTotalHeures).toHaveBeenCalledTimes(2));
    const [start, end] = K.getTotalHeures.mock.calls.at(-1) as [string, string];
    // Plage effacée : retour à la fenêtre glissante de 12 mois.
    const spanDays = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
    expect(Math.round(spanDays)).toBeGreaterThanOrEqual(364);
  });

  it('formats a custom range label in French day/month/year', () => {
    expect(customRangeLabel({ start: '2026-01-05', end: '2026-02-20' })).toBe(
      'du 05/01/2026 au 20/02/2026',
    );
  });
});

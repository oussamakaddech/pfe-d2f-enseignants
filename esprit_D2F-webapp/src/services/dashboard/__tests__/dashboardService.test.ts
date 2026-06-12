import { describe, expect, it } from 'vitest';
import { computeHealthScore, composeAlerts, isPendingBesoin } from '../dashboardService';

describe('dashboardService.computeHealthScore', () => {
  it('returns a critical zero score when no factor is provided', () => {
    const r = computeHealthScore({});
    expect(r).toEqual({ score: 0, level: 'critical', factors: [] });
  });

  it('builds only the factors that are provided', () => {
    const r = computeHealthScore({ presence: 80 });
    expect(r.factors).toHaveLength(1);
    expect(r.factors[0].key).toBe('presence');
    expect(r.score).toBe(80);
    expect(r.level).toBe('healthy');
  });

  it('clamps out-of-range scores and weights factors', () => {
    const r = computeHealthScore({ presence: 150, coverage: -20 });
    expect(r.factors).toHaveLength(2);
    // presence clamped to 100, coverage clamped to 0, equal weights -> 50
    expect(r.score).toBe(50);
    expect(r.level).toBe('attention');
  });

  it('derives the pending-needs and at-risk factors', () => {
    const full = computeHealthScore({
      presence: 90, coverage: 90, participation: 90,
      pendingNeeds: 0, atRisk: 0, totalTeachers: 100,
    });
    expect(full.factors.map((f) => f.key)).toEqual([
      'presence', 'coverage', 'participation', 'pending', 'atrisk',
    ]);
    expect(full.score).toBeGreaterThan(75);
    expect(full.level).toBe('healthy');
  });

  it('penalises a high number of pending needs and at-risk teachers', () => {
    const r = computeHealthScore({ pendingNeeds: 100, atRisk: 100, totalTeachers: 100 });
    expect(r.score).toBe(0);
    expect(r.level).toBe('critical');
  });

  it('falls back to the at-risk cap when total teachers is missing', () => {
    const r = computeHealthScore({ atRisk: 5 });
    // atRiskRatio = 5/10 = 0.5 -> score clamp(100 - 50) = 50
    expect(r.score).toBe(50);
  });
});

describe('dashboardService.composeAlerts', () => {
  it('returns no alerts when nothing is actionable', () => {
    expect(composeAlerts({})).toEqual([]);
  });

  it('emits an inactifs warning with the configured threshold', () => {
    const [alert] = composeAlerts({ inactifsTotal: 3, seuilInactifsMois: 9 });
    expect(alert.id).toBe('inactifs');
    expect(alert.severity).toBe('WARNING');
    expect(alert.message).toContain('9 mois');
  });

  it('escalates pending-needs severity at the threshold of 5', () => {
    expect(composeAlerts({ pendingNeeds: 4 })[0].severity).toBe('INFO');
    expect(composeAlerts({ pendingNeeds: 5 })[0].severity).toBe('WARNING');
  });

  it('flags departments with low coverage and orders critical first', () => {
    const alerts = composeAlerts({
      pendingNeeds: 1,
      global: {
        taux_couverture_departements: [
          { departement: 'GL', taux_couverture: 30, nb_evalues: 4 },
          { departement: 'TWIN', taux_couverture: 80, nb_evalues: 4 },
          { departement: 'EMPTY', taux_couverture: 10, nb_evalues: 0 },
        ],
        alertes_recentes: [
          { id: 7, titre: 'Risque élevé', severite: 'critical', enseignant_id: 42 },
          { id: 8, titre: 'Info', severite: 'info' },
        ],
      } as never,
    });
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain('cov-GL');
    expect(ids).not.toContain('cov-TWIN');
    expect(ids).not.toContain('cov-EMPTY');
    expect(ids).toContain('alert-7');
    expect(ids).not.toContain('alert-8'); // INFO recent alerts are dropped
    // critical alerts sort ahead of warnings
    expect(alerts[0].severity).toBe('CRITICAL');
  });
});

describe('dashboardService.isPendingBesoin', () => {
  it('is pending until admin approval', () => {
    expect(isPendingBesoin({})).toBe(true);
    expect(isPendingBesoin({ approuveCUP: true })).toBe(true);
    expect(isPendingBesoin({ approuveAdmin: true })).toBe(false);
  });
});

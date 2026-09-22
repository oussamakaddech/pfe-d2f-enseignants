import { describe, expect, it } from 'vitest';
import { buildCompetenceLinks } from '../hooks/useFormationWorkflow';

describe('buildCompetenceLinks (non-regression S1854)', () => {
  it('associe savoirs aux competences sans sous-competences', () => {
    const ctx = {
      compCompetences: [{ id: 1, nom: 'C1', domaineId: 10 }],
      savoirsByCompetence: { 1: [{ id: 100, nom: 'S1' }] },
      sousCompetencesByCompetence: {},
      savoirsBySousCompetence: {},
    };
    const row = {
      _id: 'r1',
      domaineId: 10,
      competenceIds: [1],
      sousCompetenceIds: [],
      savoirIds: [100],
    };
    const links = buildCompetenceLinks(row, ctx);
    expect(links).toHaveLength(1);
    expect(links[0].competenceId).toBe(1);
    expect(links[0].savoirId).toBe(100);
  });

  it('emet la competence seule sans savoir coche', () => {
    const ctx = {
      compCompetences: [{ id: 1, nom: 'C1', domaineId: 10 }],
      savoirsByCompetence: {},
      sousCompetencesByCompetence: {},
      savoirsBySousCompetence: {},
    };
    const row = {
      _id: 'r1',
      domaineId: 10,
      competenceIds: [1],
      sousCompetenceIds: [],
      savoirIds: [],
    };
    const links = buildCompetenceLinks(row, ctx);
    expect(links).toHaveLength(1);
    expect(links[0].savoirId).toBeNull();
  });
});

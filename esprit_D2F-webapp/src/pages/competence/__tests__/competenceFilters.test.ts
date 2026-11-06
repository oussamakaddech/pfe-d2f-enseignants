import { describe, expect, it } from 'vitest';
import { effectiveScopeIds, filterCompetences, hasActiveFilters } from '../competenceFilters';
import type { Competence, Domaine } from '@/models/competence';

const domaines: Domaine[] = [
  { id: 1, code: 'MT-34', nom: 'Web Sémantique', upId: 'UP_GC', departementId: 'DEPT_GC' },
  { id: 2, code: 'MT-35', nom: 'Machine Learning', upId: 'UP_RT', departementId: 'DEPT_RT' },
];

const competences: Competence[] = [
  { id: 10, nom: 'RDF', domaineId: 1 },
  { id: 11, nom: 'RDFS', domaineId: 1, upIds: ['UP_RT'] },
  { id: 12, nom: 'Deep Learning', domaineId: 2, departementIds: ['DEPT_SI'] },
  { id: 13, nom: 'Sans domaine' },
];

describe('competenceFilters', () => {
  it('ne filtre rien sans critère', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(filterCompetences(competences, domaines, {})).toBe(competences);
  });

  it('détecte un critère renseigné', () => {
    expect(hasActiveFilters({ domaineId: 1 })).toBe(true);
    expect(hasActiveFilters({ upId: '' })).toBe(false);
  });

  it('hérite du rattachement du domaine quand la compétence n’en a pas', () => {
    expect(effectiveScopeIds(competences[0], domaines[0], 'up')).toEqual(['UP_GC']);
    expect(effectiveScopeIds(competences[1], domaines[0], 'up')).toEqual(['UP_RT']);
  });

  it('filtre par domaine', () => {
    expect(filterCompetences(competences, domaines, { domaineId: '1' }).map((c) => c.id)).toEqual([
      10, 11,
    ]);
  });

  it('filtre par UP en respectant le rattachement explicite', () => {
    expect(filterCompetences(competences, domaines, { upId: 'UP_RT' }).map((c) => c.id)).toEqual([
      11, 12,
    ]);
  });

  it('filtre par département explicite puis hérité', () => {
    expect(
      filterCompetences(competences, domaines, { departementId: 'DEPT_SI' }).map((c) => c.id),
    ).toEqual([12]);
    // 11 ne fixe que ses UP : son département vient donc de son domaine.
    expect(
      filterCompetences(competences, domaines, { departementId: 'DEPT_GC' }).map((c) => c.id),
    ).toEqual([10, 11]);
  });

  it('combine domaine et département', () => {
    expect(
      filterCompetences(competences, domaines, { domaineId: 2, departementId: 'DEPT_SI' }).map(
        (c) => c.id,
      ),
    ).toEqual([12]);
  });

  it('exclut les compétences sans domaine ni rattachement', () => {
    expect(filterCompetences([competences[3]], domaines, { upId: 'UP_GC' })).toEqual([]);
  });
});

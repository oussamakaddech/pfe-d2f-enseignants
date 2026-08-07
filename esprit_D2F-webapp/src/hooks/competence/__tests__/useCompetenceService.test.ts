import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/competence/CompetenceService', () => {
  const svc: Record<string, unknown> = {};
  [
    'domaine',
    'competence',
    'sousCompetence',
    'savoir',
    'enseignantCompetence',
    'niveauDefinition',
    'structure',
    'prerequisite',
  ].forEach((k) => {
    svc[k] = new Proxy({}, { get: () => vi.fn() });
  });
  return { default: svc, __esModule: true };
});

import {
  useCompetenceDomaineApi,
  useCompetenceApi,
  useSousCompetenceApi,
  useSavoirApi,
  useEnseignantCompetenceApi,
  useNiveauDefinitionApi,
  useStructureApi,
  usePrerequisiteApi,
} from '@/hooks/competence/useCompetenceService';
import CompetenceService from '@/services/competence/CompetenceService';

describe('useCompetenceService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useCompetenceDomaineApi returns domaine api', () => {
    expect(useCompetenceDomaineApi()).toBe(CompetenceService.domaine);
  });
  it('useCompetenceApi returns competence api', () => {
    expect(useCompetenceApi()).toBe(CompetenceService.competence);
  });
  it('useSousCompetenceApi returns sousCompetence api', () => {
    expect(useSousCompetenceApi()).toBe(CompetenceService.sousCompetence);
  });
  it('useSavoirApi returns savoir api', () => {
    expect(useSavoirApi()).toBe(CompetenceService.savoir);
  });
  it('useEnseignantCompetenceApi returns enseignantCompetence api', () => {
    expect(useEnseignantCompetenceApi()).toBe(CompetenceService.enseignantCompetence);
  });
  it('useNiveauDefinitionApi returns niveauDefinition api', () => {
    expect(useNiveauDefinitionApi()).toBe(CompetenceService.niveauDefinition);
  });
  it('useStructureApi returns structure api', () => {
    expect(useStructureApi()).toBe(CompetenceService.structure);
  });
  it('usePrerequisiteApi returns prerequisite api', () => {
    expect(usePrerequisiteApi()).toBe(CompetenceService.prerequisite);
  });
});

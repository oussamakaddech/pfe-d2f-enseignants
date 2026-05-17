import { describe, it, expect, beforeEach, vi } from 'vitest';
import CompetenceService from './CompetenceService';

// Mock the httpClient
vi.mock('../utils/httpClient', () => ({
  defaultApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('CompetenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined and have expected API sections', () => {
    expect(CompetenceService).toBeDefined();
    expect(CompetenceService.competence).toBeDefined();
    expect(CompetenceService.domaine).toBeDefined();
    expect(CompetenceService.sousCompetence).toBeDefined();
    expect(CompetenceService.savoir).toBeDefined();
  });

  it('should have methods in competence section', () => {
    expect(typeof CompetenceService.competence.getAll).toBe('function');
    expect(typeof CompetenceService.competence.getById).toBe('function');
    expect(typeof CompetenceService.competence.create).toBe('function');
    expect(typeof CompetenceService.competence.update).toBe('function');
    expect(typeof CompetenceService.competence.delete).toBe('function');
  });

  it('should have methods in domaine section', () => {
    expect(typeof CompetenceService.domaine.getAll).toBe('function');
    expect(typeof CompetenceService.domaine.getActifs).toBe('function');
    expect(typeof CompetenceService.domaine.getById).toBe('function');
    expect(typeof CompetenceService.domaine.create).toBe('function');
  });

  it('should have methods in savoir section', () => {
    expect(typeof CompetenceService.savoir.getAll).toBe('function');
    if (CompetenceService.savoir.search) {
      expect(typeof CompetenceService.savoir.search).toBe('function');
    }
    expect(typeof CompetenceService.savoir.getByCompetence).toBe('function');
  });

  it('should have methods in sousCompetence section', () => {
    expect(typeof CompetenceService.sousCompetence.getAll).toBe('function');
    expect(typeof CompetenceService.sousCompetence.getByCompetence).toBe('function');
    expect(typeof CompetenceService.sousCompetence.create).toBe('function');
  });
});

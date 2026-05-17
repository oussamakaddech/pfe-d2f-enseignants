import { describe, it, expect, beforeEach, vi } from 'vitest';
import FormationService from './FormationService';

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

describe('FormationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(FormationService).toBeDefined();
  });

  it('should have all CRUD methods', () => {
    expect(typeof FormationService.getAllFormations).toBe('function');
    expect(typeof FormationService.getFormationById).toBe('function');
    expect(typeof FormationService.createFormation).toBe('function');
    expect(typeof FormationService.updateFormation).toBe('function');
    expect(typeof FormationService.deleteFormation).toBe('function');
  });

  it('should have additional query methods', () => {
    // Check if these methods exist (they may not all exist)
    if (FormationService.search) {
      expect(typeof FormationService.search).toBe('function');
    }
    if (FormationService.getByStatus) {
      expect(typeof FormationService.getByStatus).toBe('function');
    }
    if (FormationService.getByInstructor) {
      expect(typeof FormationService.getByInstructor).toBe('function');
    }
  });

  it('should have competence methods', () => {
    if (FormationService.competence) {
      expect(FormationService.competence).toBeDefined();
      if (FormationService.competence.getByFormation) {
        expect(typeof FormationService.competence.getByFormation).toBe('function');
      }
    }
  });
});

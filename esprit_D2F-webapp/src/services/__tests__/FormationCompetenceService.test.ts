import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../../utils/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
  },
}));

vi.mock('../../config/env', () => ({
  config: {
    FORMATION_URL: 'http://localhost:8080/api',
  },
}));

import FormationCompetenceService from '../FormationCompetenceService';

describe('FormationCompetenceService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets by formation', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await FormationCompetenceService.getByFormation(1);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('adds a formation competence', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1 } });
    const result = await FormationCompetenceService.addFormationCompetence(1, { competenceId: 10 });
    expect(result).toEqual({ id: 1 });
  });

  it('updates a formation competence', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, competenceId: 20 } });
    const result = await FormationCompetenceService.updateFormationCompetence(1, { competenceId: 20 });
    expect(result).toEqual({ id: 1, competenceId: 20 });
  });

  it('deletes a formation competence', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await FormationCompetenceService.deleteFormationCompetence(1);
    expect(httpMocks.mockDelete).toHaveBeenCalledOnce();
  });

  it('replaces all for formation', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: [{ id: 2 }] });
    const result = await FormationCompetenceService.replaceAllForFormation(1, [{ competenceId: 30 }]);
    expect(result).toEqual([{ id: 2 }]);
  });

  it('gets by competence', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 3 }] });
    const result = await FormationCompetenceService.getByCompetence(10);
    expect(result).toEqual([{ id: 3 }]);
  });

  it('gets by domaine', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 4 }] });
    const result = await FormationCompetenceService.getByDomaine(5);
    expect(result).toEqual([{ id: 4 }]);
  });
});

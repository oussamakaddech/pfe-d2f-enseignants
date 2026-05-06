import { beforeEach, describe, expect, it, vi } from 'vitest';
import FormationWorkflowService from '../FormationWorkflowService';

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

describe('FormationWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('covers CRUD and generic listing endpoints', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(FormationWorkflowService.createFormationWorkflow({ titre: 'A' })).resolves.toEqual({ id: 1 });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, titre: 'B' } });
    await expect(FormationWorkflowService.updateFormationWorkflow(1, { titre: 'B' })).resolves.toEqual({ id: 1, titre: 'B' });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(FormationWorkflowService.deleteFormationWorkflow(1)).resolves.toEqual({ deleted: true });

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(FormationWorkflowService.getFormationWorkflowById(1)).resolves.toEqual({ id: 1 });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(FormationWorkflowService.getAllFormationWorkflows()).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 2 }] });
    await expect(FormationWorkflowService.getFormationsAchevees()).resolves.toEqual([{ id: 2 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 3 }] });
    await expect(FormationWorkflowService.getAllFormationWithDocuments()).resolves.toEqual([{ id: 3 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 4 }] });
    await expect(FormationWorkflowService.getAllFormationsWithDocuments()).resolves.toEqual([{ id: 4 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 5 }] });
    await expect(FormationWorkflowService.getFormationsVisibles()).resolves.toEqual([{ id: 5 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 6 }] });
    await expect(FormationWorkflowService.getFormationsParUp(11)).resolves.toEqual([{ id: 6 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 7 }] });
    await expect(FormationWorkflowService.getFormationsParDepartement(21)).resolves.toEqual([{ id: 7 }]);
  });

  it('covers presence and inscription update endpoints', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { seanceId: 1, present: true } });
    await expect(FormationWorkflowService.updatePresence(1, true, 'ok')).resolves.toEqual({ seanceId: 1, present: true });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1, present: true }] });
    await expect(FormationWorkflowService.getPresencesBySeance(10)).resolves.toEqual([{ id: 1, present: true }]);

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 7, inscriptionsOuvertes: false } });
    await expect(FormationWorkflowService.updateInscriptionsOuvertes(7, false)).resolves.toEqual({ id: 7, inscriptionsOuvertes: false });
  });

  it('requires token for protected endpoints', async () => {
    await expect(FormationWorkflowService.getFormationsByAnimateur()).rejects.toThrow('Authentication token is missing.');
    await expect(FormationWorkflowService.getFormationsForCalendar(4)).rejects.toThrow('Authentication token is missing.');

    localStorage.setItem('authToken', 'abc');

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 8 }] });
    await expect(FormationWorkflowService.getFormationsByAnimateur()).resolves.toEqual([{ id: 8 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 9 }] });
    await expect(FormationWorkflowService.getFormationsForCalendar(4)).resolves.toEqual([{ id: 9 }]);
  });

  it('exports formations', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: new Blob(['x']) });
    const response = await FormationWorkflowService.exportFormations('2026-01-01', '2026-12-31');
    expect(response).toMatchObject({ data: expect.any(Blob) });
  });
});

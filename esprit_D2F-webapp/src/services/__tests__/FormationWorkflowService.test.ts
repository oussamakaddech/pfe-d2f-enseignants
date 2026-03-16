import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import FormationWorkflowService from '../FormationWorkflowService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FormationWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('covers CRUD and generic listing endpoints', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(FormationWorkflowService.createFormationWorkflow({ titre: 'A' })).resolves.toEqual({ id: 1 });

    axios.put.mockResolvedValueOnce({ data: { id: 1, titre: 'B' } });
    await expect(FormationWorkflowService.updateFormationWorkflow(1, { titre: 'B' })).resolves.toEqual({ id: 1, titre: 'B' });

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(FormationWorkflowService.deleteFormationWorkflow(1)).resolves.toEqual({ deleted: true });

    axios.get.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(FormationWorkflowService.getFormationWorkflowById(1)).resolves.toEqual({ id: 1 });

    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(FormationWorkflowService.getAllFormationWorkflows()).resolves.toEqual([{ id: 1 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 2 }] });
    await expect(FormationWorkflowService.getFormationsAchevees()).resolves.toEqual([{ id: 2 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 3 }] });
    await expect(FormationWorkflowService.getAllFormationWithDocuments()).resolves.toEqual([{ id: 3 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 4 }] });
    await expect(FormationWorkflowService.getAllFormationsWithDocuments()).resolves.toEqual([{ id: 4 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 5 }] });
    await expect(FormationWorkflowService.getFormationsVisibles()).resolves.toEqual([{ id: 5 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 6 }] });
    await expect(FormationWorkflowService.getFormationsParUp(11)).resolves.toEqual([{ id: 6 }]);
  });

  it('covers presence and inscription update endpoints', async () => {
    axios.put.mockResolvedValueOnce({ data: { seanceId: 1, present: true } });
    await expect(FormationWorkflowService.updatePresence(1, true, 'ok')).resolves.toEqual({ seanceId: 1, present: true });

    axios.get.mockResolvedValueOnce({ data: [{ id: 1, present: true }] });
    await expect(FormationWorkflowService.getPresencesBySeance(10)).resolves.toEqual([{ id: 1, present: true }]);

    axios.put.mockResolvedValueOnce({ data: { id: 7, inscriptionsOuvertes: false } });
    await expect(FormationWorkflowService.updateInscriptionsOuvertes(7, false)).resolves.toEqual({ id: 7, inscriptionsOuvertes: false });
  });

  it('requires token for protected endpoints', async () => {
    await expect(FormationWorkflowService.getFormationsByAnimateur()).rejects.toThrow('Authentication token is missing.');
    await expect(FormationWorkflowService.getFormationsForCalendar(4)).rejects.toThrow('Authentication token is missing.');

    localStorage.setItem('authToken', 'abc');

    axios.get.mockResolvedValueOnce({ data: [{ id: 8 }] });
    await expect(FormationWorkflowService.getFormationsByAnimateur()).resolves.toEqual([{ id: 8 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 9 }] });
    await expect(FormationWorkflowService.getFormationsForCalendar(4)).resolves.toEqual([{ id: 9 }]);
  });

  it('exports formations', async () => {
    axios.get.mockResolvedValueOnce({ data: new Blob(['x']) });
    const response = await FormationWorkflowService.exportFormations('2026-01-01', '2026-12-31');
    expect(response).toMatchObject({ data: expect.any(Blob) });
  });
});

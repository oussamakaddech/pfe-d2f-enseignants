import { beforeEach, describe, expect, it, vi } from 'vitest';
import BesoinFormationService from '../BesoinFormationService';

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

describe('BesoinFormationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves all and one besoin formation', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(BesoinFormationService.getAllBesoinFormations()).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 2 } });
    await expect(BesoinFormationService.getBesoinFormation(2)).resolves.toEqual({ id: 2 });
  });

  it('adds, modifies and removes besoin formation', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 3 } });
    await expect(BesoinFormationService.addBesoinFormation({ intitule: 'IA' } as never)).resolves.toEqual({ id: 3 });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 3, commentaire: 'ok' } });
    await expect(BesoinFormationService.modifyBesoinFormation({ id: 3 } as never, 'ok')).resolves.toEqual({ id: 3, commentaire: 'ok' });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(BesoinFormationService.removeBesoinFormation(3)).resolves.toEqual({ deleted: true });
  });

  it('approves and retrieves notifications', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 4 }] });
    await expect(BesoinFormationService.getApprovedBesoinFormations()).resolves.toEqual([{ id: 4 }]);

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 4, statut: 'APPROUVE' } });
    await expect(BesoinFormationService.approveBesoin(4)).resolves.toEqual({ id: 4, statut: 'APPROUVE' });

    httpMocks.mockGet.mockResolvedValueOnce({ data: ['notif-1'] });
    await expect(BesoinFormationService.getUserNotifications('john')).resolves.toEqual(['notif-1']);
  });

  it('supports consultation and prioritization endpoints', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 5 }] });
    await expect(BesoinFormationService.getBesoinsByUp('UP-1')).resolves.toEqual([{ id: 5 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 6 }] });
    await expect(BesoinFormationService.getBesoinsByDepartement('DEP-1')).resolves.toEqual([{ id: 6 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 7 }] });
    await expect(BesoinFormationService.getBesoinsByPriorite()).resolves.toEqual([{ id: 7 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 8 }] });
    await expect(BesoinFormationService.getBesoinsByPrioriteLevel('HAUTE')).resolves.toEqual([{ id: 8 }]);
  });
});

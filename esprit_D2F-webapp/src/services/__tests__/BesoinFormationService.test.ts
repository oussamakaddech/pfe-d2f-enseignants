import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import BesoinFormationService from '../BesoinFormationService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('BesoinFormationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves all and one besoin formation', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(BesoinFormationService.getAllBesoinFormations()).resolves.toEqual([{ id: 1 }]);

    axios.get.mockResolvedValueOnce({ data: { id: 2 } });
    await expect(BesoinFormationService.getBesoinFormation(2)).resolves.toEqual({ id: 2 });
  });

  it('adds, modifies and removes besoin formation', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 3 } });
    await expect(BesoinFormationService.addBesoinFormation({ intitule: 'IA' } as never)).resolves.toEqual({ id: 3 });

    axios.put.mockResolvedValueOnce({ data: { id: 3, commentaire: 'ok' } });
    await expect(BesoinFormationService.modifyBesoinFormation({ id: 3 } as never, 'ok')).resolves.toEqual({ id: 3, commentaire: 'ok' });

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(BesoinFormationService.removeBesoinFormation(3)).resolves.toEqual({ deleted: true });
  });

  it('approves and retrieves notifications', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 4 }] });
    await expect(BesoinFormationService.getApprovedBesoinFormations()).resolves.toEqual([{ id: 4 }]);

    axios.put.mockResolvedValueOnce({ data: { id: 4, statut: 'APPROUVE' } });
    await expect(BesoinFormationService.approveBesoin(4)).resolves.toEqual({ id: 4, statut: 'APPROUVE' });

    axios.get.mockResolvedValueOnce({ data: ['notif-1'] });
    await expect(BesoinFormationService.getUserNotifications('john')).resolves.toEqual(['notif-1']);
  });
});

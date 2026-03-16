import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import InscriptionService from '../InscriptionService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../authHeaders', () => ({
  optionalAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

describe('InscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets accessible formations', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(InscriptionService.getFormationsAccessibles(5)).resolves.toEqual([{ id: 1 }]);
  });

  it('submits and processes requests', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 77, statut: 'EN_ATTENTE' } });
    await expect(InscriptionService.demanderInscription(10, 5)).resolves.toEqual({ id: 77, statut: 'EN_ATTENTE' });

    axios.put.mockResolvedValueOnce({ data: { id: 77, statut: 'APPROUVEE' } });
    await expect(InscriptionService.traiterDemande(77, true)).resolves.toEqual({ id: 77, statut: 'APPROUVEE' });
  });

  it('gets inscriptions by formation', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
    await expect(InscriptionService.getInscriptionsByFormation(10)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
  });
});

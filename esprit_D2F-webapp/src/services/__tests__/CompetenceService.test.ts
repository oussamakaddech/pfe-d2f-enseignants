import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import CompetenceService from '../CompetenceService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CompetenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('authToken', 'abc');
  });

  it('covers domaine API list/create/update/delete/toggle', async () => {
    axios.get.mockResolvedValueOnce({ data: { content: [{ id: 1 }] } });
    await expect(CompetenceService.domaine.getAll()).resolves.toEqual([{ id: 1 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 2 }] });
    await expect(CompetenceService.domaine.getActifs()).resolves.toEqual([{ id: 2 }]);

    axios.get.mockResolvedValueOnce({ data: { id: 3 } });
    await expect(CompetenceService.domaine.getById(3)).resolves.toEqual({ id: 3 });

    axios.post.mockResolvedValueOnce({ data: { id: 4 } });
    await expect(CompetenceService.domaine.create({ nomDomaine: 'D' })).resolves.toEqual({ id: 4 });

    axios.put.mockResolvedValueOnce({ data: { id: 4, nomDomaine: 'D2' } });
    await expect(CompetenceService.domaine.update(4, { nomDomaine: 'D2' })).resolves.toEqual({ id: 4, nomDomaine: 'D2' });

    axios.patch.mockResolvedValueOnce({ data: { id: 4, actif: false } });
    await expect(CompetenceService.domaine.toggleActif(4)).resolves.toEqual({ id: 4, actif: false });

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.domaine.delete(4)).resolves.toMatchObject({ data: { deleted: true } });
  });

  it('covers competence and sous-competence APIs', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 10 }] });
    await expect(CompetenceService.competence.getByDomaine(2)).resolves.toEqual([{ id: 10 }]);

    axios.post.mockResolvedValueOnce({ data: { id: 11 } });
    await expect(CompetenceService.competence.create(2, { nomCompetence: 'C' })).resolves.toEqual({ id: 11 });

    axios.put.mockResolvedValueOnce({ data: { id: 11, nomCompetence: 'C2' } });
    await expect(CompetenceService.competence.update(11, { nomCompetence: 'C2' })).resolves.toEqual({ id: 11, nomCompetence: 'C2' });

    axios.get.mockResolvedValueOnce({ data: [{ id: 20 }] });
    await expect(CompetenceService.sousCompetence.getByCompetence(11)).resolves.toEqual([{ id: 20 }]);

    axios.post.mockResolvedValueOnce({ data: { id: 21 } });
    await expect(CompetenceService.sousCompetence.create(11, { nomSousCompetence: 'SC' })).resolves.toEqual({ id: 21 });

    axios.post.mockResolvedValueOnce({ data: { id: 22 } });
    await expect(CompetenceService.sousCompetence.createEnfant(21, { nomSousCompetence: 'SC2' })).resolves.toEqual({ id: 22 });
  });

  it('covers savoir and structure APIs', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 30 }] });
    await expect(CompetenceService.savoir.getByCompetence(11)).resolves.toEqual([{ id: 30 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 31 }] });
    await expect(CompetenceService.savoir.search('algo')).resolves.toEqual([{ id: 31 }]);

    axios.post.mockResolvedValueOnce({ data: { id: 32 } });
    await expect(CompetenceService.savoir.createForCompetence(11, { nomSavoir: 'S' })).resolves.toEqual({ id: 32 });

    axios.get.mockResolvedValueOnce({ data: [{ id: 'node-1' }] });
    await expect(CompetenceService.structure.getArbreComplet()).resolves.toEqual([{ id: 'node-1' }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 'node-2' }] });
    await expect(CompetenceService.structure.rechercheGlobale('gc')).resolves.toEqual([{ id: 'node-2' }]);
  });

  it('covers enseignant competence and niveaux APIs', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 40 }] });
    await expect(CompetenceService.enseignantCompetence.getByEnseignant(8)).resolves.toEqual([{ id: 40 }]);

    axios.post.mockResolvedValueOnce({ data: { id: 41 } });
    await expect(CompetenceService.enseignantCompetence.assign({ enseignantId: 8, savoirId: 2 })).resolves.toEqual({ id: 41 });

    axios.patch.mockResolvedValueOnce({ data: { id: 41, niveau: 'N2' } });
    await expect(CompetenceService.enseignantCompetence.updateNiveau(41, 'N2')).resolves.toEqual({ id: 41, niveau: 'N2' });

    axios.get.mockResolvedValueOnce({ data: [{ id: 50 }] });
    await expect(CompetenceService.niveauDefinition.getAll()).resolves.toEqual([{ id: 50 }]);

    axios.post.mockResolvedValueOnce({ data: { id: 51 } });
    await expect(CompetenceService.niveauDefinition.add({ niveau: 'N1' })).resolves.toEqual({ id: 51 });
  });

  it('covers remaining competence and sous-competence methods', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 60 }] });
    await expect(CompetenceService.competence.getAll()).resolves.toEqual([{ id: 60 }]);

    axios.get.mockResolvedValueOnce({ data: { id: 61 } });
    await expect(CompetenceService.competence.getById(61)).resolves.toEqual({ id: 61 });

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.competence.delete(61)).resolves.toMatchObject({ data: { deleted: true } });

    axios.get.mockResolvedValueOnce({ data: [{ id: 70 }] });
    await expect(CompetenceService.sousCompetence.getAll()).resolves.toEqual([{ id: 70 }]);

    axios.get.mockResolvedValueOnce({ data: { id: 71 } });
    await expect(CompetenceService.sousCompetence.getById(71)).resolves.toEqual({ id: 71 });

    axios.put.mockResolvedValueOnce({ data: { id: 71, nomSousCompetence: 'X' } });
    await expect(CompetenceService.sousCompetence.update(71, { nomSousCompetence: 'X' })).resolves.toEqual({ id: 71, nomSousCompetence: 'X' });

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.sousCompetence.delete(71)).resolves.toMatchObject({ data: { deleted: true } });
  });

  it('covers remaining savoir and structure methods', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 80 }] });
    await expect(CompetenceService.savoir.getAll()).resolves.toEqual([{ id: 80 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 81 }] });
    await expect(CompetenceService.savoir.getBySousCompetence(71)).resolves.toEqual([{ id: 81 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 82 }] });
    await expect(CompetenceService.savoir.getByType('THEORIQUE')).resolves.toEqual([{ id: 82 }]);

    axios.get.mockResolvedValueOnce({ data: { id: 83 } });
    await expect(CompetenceService.savoir.getById(83)).resolves.toEqual({ id: 83 });

    axios.post.mockResolvedValueOnce({ data: { id: 84 } });
    await expect(CompetenceService.savoir.create(71, { nomSavoir: 'S1' })).resolves.toEqual({ id: 84 });

    axios.put.mockResolvedValueOnce({ data: { id: 84, nomSavoir: 'S2' } });
    await expect(CompetenceService.savoir.update(84, { nomSavoir: 'S2' })).resolves.toEqual({ id: 84, nomSavoir: 'S2' });

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.savoir.delete(84)).resolves.toMatchObject({ data: { deleted: true } });

    axios.get.mockResolvedValueOnce({ data: [{ id: 'node-3' }] });
    await expect(CompetenceService.structure.getArbreDomaine(4)).resolves.toEqual([{ id: 'node-3' }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 'node-4' }] });
    await expect(CompetenceService.structure.rechercheParDomaine(4, 'ia')).resolves.toEqual([{ id: 'node-4' }]);
  });

  it('covers remaining enseignant competence and niveau methods', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 90 }] });
    await expect(CompetenceService.enseignantCompetence.getAll()).resolves.toEqual([{ id: 90 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 91 }] });
    await expect(CompetenceService.enseignantCompetence.getByEnseignantAndDomaine(8, 2)).resolves.toEqual([{ id: 91 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 92 }] });
    await expect(CompetenceService.enseignantCompetence.getByEnseignantAndNiveau(8, 'N1')).resolves.toEqual([{ id: 92 }]);

    axios.get.mockResolvedValueOnce({ data: 4 });
    await expect(CompetenceService.enseignantCompetence.countByEnseignant(8)).resolves.toBe(4);

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.enseignantCompetence.remove(41)).resolves.toMatchObject({ data: { deleted: true } });

    axios.get.mockResolvedValueOnce({ data: [{ id: 100 }] });
    await expect(CompetenceService.niveauDefinition.getByCompetence(11)).resolves.toEqual([{ id: 100 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 101 }] });
    await expect(CompetenceService.niveauDefinition.getBySousCompetence(71)).resolves.toEqual([{ id: 101 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 102 }] });
    await expect(CompetenceService.niveauDefinition.getByCompetenceAndNiveau(11, 'N2')).resolves.toEqual([{ id: 102 }]);

    axios.get.mockResolvedValueOnce({ data: [{ id: 103 }] });
    await expect(CompetenceService.niveauDefinition.getBySousCompetenceAndNiveau(71, 'N2')).resolves.toEqual([{ id: 103 }]);

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.niveauDefinition.remove(103)).resolves.toMatchObject({ data: { deleted: true } });
  });
});

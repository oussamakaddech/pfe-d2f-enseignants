import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    patch: httpMocks.mockPatch,
    delete: httpMocks.mockDelete,
  },
}));

import CompetenceService from '../CompetenceService';

describe('CompetenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('authToken', 'abc');
  });

  it('covers domaine API list/create/update/delete/toggle', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ id: 1 }] } });
    await expect(CompetenceService.domaine.getAll()).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 2 }] });
    await expect(CompetenceService.domaine.getActifs()).resolves.toEqual([{ id: 2 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 3 } });
    await expect(CompetenceService.domaine.getById(3)).resolves.toEqual({ id: 3 });

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 4 } });
    await expect(CompetenceService.domaine.create({ code: 'DOM-01', nom: 'D', description: 'Desc', actif: true, upId: 1, departementId: 2 })).resolves.toEqual({ id: 4 });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 4, code: 'DOM-02', nom: 'D2' } });
    await expect(CompetenceService.domaine.update(4, { code: 'DOM-02', nom: 'D2' })).resolves.toEqual({ id: 4, code: 'DOM-02', nom: 'D2' });

    httpMocks.mockPatch.mockResolvedValueOnce({ data: { id: 4, actif: false } });
    await expect(CompetenceService.domaine.toggleActif(4)).resolves.toEqual({ id: 4, actif: false });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.domaine.delete(4)).resolves.toMatchObject({ data: { deleted: true } });
  });

  it('covers competence and sous-competence APIs', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 10 }] });
    await expect(CompetenceService.competence.getByDomaine(2)).resolves.toEqual([{ id: 10 }]);

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 11 } });
    await expect(CompetenceService.competence.create(2, { nomCompetence: 'C' })).resolves.toEqual({ id: 11 });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 11, nomCompetence: 'C2' } });
    await expect(CompetenceService.competence.update(11, { nomCompetence: 'C2' })).resolves.toEqual({ id: 11, nomCompetence: 'C2' });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 20 }] });
    await expect(CompetenceService.sousCompetence.getByCompetence(11)).resolves.toEqual([{ id: 20 }]);

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 21 } });
    await expect(CompetenceService.sousCompetence.create(11, { nomSousCompetence: 'SC' })).resolves.toEqual({ id: 21 });

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 22 } });
    await expect(CompetenceService.sousCompetence.createEnfant(21, { nomSousCompetence: 'SC2' })).resolves.toEqual({ id: 22 });
  });

  it('covers savoir and structure APIs', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 30 }] });
    await expect(CompetenceService.savoir.getByCompetence(11)).resolves.toEqual([{ id: 30 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 31 }] });
    await expect(CompetenceService.savoir.search('algo')).resolves.toEqual([{ id: 31 }]);

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 32 } });
    await expect(CompetenceService.savoir.createForCompetence(11, { nomSavoir: 'S' } as Record<string, unknown>)).resolves.toEqual({ id: 32 });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'node-1' }] });
    await expect(CompetenceService.structure.getArbreComplet()).resolves.toEqual([{ id: 'node-1' }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'node-2' }] });
    await expect(CompetenceService.structure.rechercheGlobale('gc')).resolves.toEqual([{ id: 'node-2' }]);
  });

  it('covers enseignant competence and niveaux APIs', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 40 }] });
    await expect(CompetenceService.enseignantCompetence.getByEnseignant(8)).resolves.toEqual([{ id: 40 }]);

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 41 } });
    await expect(CompetenceService.enseignantCompetence.assign({ enseignantId: 8, savoirId: 2 })).resolves.toEqual({ id: 41 });

    httpMocks.mockPatch.mockResolvedValueOnce({ data: { id: 41, niveau: 'N2' } });
    await expect(CompetenceService.enseignantCompetence.updateNiveau(41, 'N2')).resolves.toEqual({ id: 41, niveau: 'N2' });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 50 }] });
    await expect(CompetenceService.niveauDefinition.getAll()).resolves.toEqual([{ id: 50 }]);

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 51 } });
    await expect(CompetenceService.niveauDefinition.add({ niveau: 'N1' })).resolves.toEqual({ id: 51 });
  });

  it('covers remaining competence and sous-competence methods', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 60 }] });
    await expect(CompetenceService.competence.getAll()).resolves.toEqual([{ id: 60 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 61 } });
    await expect(CompetenceService.competence.getById(61)).resolves.toEqual({ id: 61 });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.competence.delete(61)).resolves.toMatchObject({ data: { deleted: true } });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 70 }] });
    await expect(CompetenceService.sousCompetence.getAll()).resolves.toEqual([{ id: 70 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 71 } });
    await expect(CompetenceService.sousCompetence.getById(71)).resolves.toEqual({ id: 71 });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 71, nomSousCompetence: 'X' } });
    await expect(CompetenceService.sousCompetence.update(71, { nomSousCompetence: 'X' })).resolves.toEqual({ id: 71, nomSousCompetence: 'X' });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.sousCompetence.delete(71)).resolves.toMatchObject({ data: { deleted: true } });
  });

  it('covers remaining savoir and structure methods', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 80 }] });
    await expect(CompetenceService.savoir.getAll()).resolves.toEqual([{ id: 80 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 81 }] });
    await expect(CompetenceService.savoir.getBySousCompetence(71)).resolves.toEqual([{ id: 81 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 82 }] });
    await expect(CompetenceService.savoir.getByType('THEORIQUE')).resolves.toEqual([{ id: 82 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 83 } });
    await expect(CompetenceService.savoir.getById(83)).resolves.toEqual({ id: 83 });

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 84 } });
    await expect(CompetenceService.savoir.create(71, { nomSavoir: 'S1' } as Record<string, unknown>)).resolves.toEqual({ id: 84 });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 84, nomSavoir: 'S2' } });
    await expect(CompetenceService.savoir.update(84, { nomSavoir: 'S2' } as Record<string, unknown>)).resolves.toEqual({ id: 84, nomSavoir: 'S2' });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.savoir.delete(84)).resolves.toMatchObject({ data: { deleted: true } });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'node-3' }] });
    await expect(CompetenceService.structure.getArbreDomaine(4)).resolves.toEqual([{ id: 'node-3' }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'node-4' }] });
    await expect(CompetenceService.structure.rechercheParDomaine(4, 'ia')).resolves.toEqual([{ id: 'node-4' }]);
  });

  it('covers remaining enseignant competence and niveau methods', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 90 }] });
    await expect(CompetenceService.enseignantCompetence.getAll()).resolves.toEqual([{ id: 90 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 91 }] });
    await expect(CompetenceService.enseignantCompetence.getByEnseignantAndDomaine(8, 2)).resolves.toEqual([{ id: 91 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 92 }] });
    await expect(CompetenceService.enseignantCompetence.getByEnseignantAndNiveau(8, 'N1')).resolves.toEqual([{ id: 92 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: 4 });
    await expect(CompetenceService.enseignantCompetence.countByEnseignant(8)).resolves.toBe(4);

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.enseignantCompetence.remove(41)).resolves.toMatchObject({ data: { deleted: true } });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 100 }] });
    await expect(CompetenceService.niveauDefinition.getByCompetence(11)).resolves.toEqual([{ id: 100 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 101 }] });
    await expect(CompetenceService.niveauDefinition.getBySousCompetence(71)).resolves.toEqual([{ id: 101 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 102 }] });
    await expect(CompetenceService.niveauDefinition.getByCompetenceAndNiveau(11, 'N2')).resolves.toEqual([{ id: 102 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 103 }] });
    await expect(CompetenceService.niveauDefinition.getBySousCompetenceAndNiveau(71, 'N2')).resolves.toEqual([{ id: 103 }]);

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.niveauDefinition.remove(103)).resolves.toMatchObject({ data: { deleted: true } });
  });

  it('covers prerequisite API', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 110 }] });
    await expect(CompetenceService.prerequisite.getByCompetence(1)).resolves.toEqual([{ id: 110 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { satisfied: true } });
    await expect(CompetenceService.prerequisite.check(1, 8)).resolves.toEqual({ satisfied: true });

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 111 } });
    await expect(CompetenceService.prerequisite.add(1, { prerequisiteId: 10, niveauMinimum: 'N2' })).resolves.toEqual({ id: 111 });

    httpMocks.mockPatch.mockResolvedValueOnce({ data: { id: 111, niveauMinimum: 'N3' } });
    await expect(CompetenceService.prerequisite.updateNiveau(1, 111, 'N3')).resolves.toEqual({ id: 111, niveauMinimum: 'N3' });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(CompetenceService.prerequisite.remove(1, 111)).resolves.toMatchObject({ data: { deleted: true } });
  });
});





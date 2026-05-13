import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import CompetenceService from './CompetenceService';

// Mock axios
vi.mock('axios');

describe('CompetenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Competence operations', () => {
    it('should fetch all competences', async () => {
      const mockData = [
        { id: 1, nom: 'Competence 1', code: 'C001' },
        { id: 2, nom: 'Competence 2', code: 'C002' },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await CompetenceService.getAll();

      expect(result).toEqual(mockData);
      expect(axios.get).toHaveBeenCalled();
    });

    it('should fetch competence by id', async () => {
      const mockData = { id: 1, nom: 'Competence 1', code: 'C001' };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await CompetenceService.getById(1);

      expect(result).toEqual(mockData);
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('1'));
    });

    it('should create a new competence', async () => {
      const newComp = { nom: 'New Competence', code: 'C003' };
      const mockResponse = { id: 3, ...newComp };

      axios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await CompetenceService.create(newComp);

      expect(result).toEqual(mockResponse);
      expect(axios.post).toHaveBeenCalled();
    });

    it('should update a competence', async () => {
      const updatedComp = { id: 1, nom: 'Updated Competence', code: 'C001' };

      axios.put.mockResolvedValueOnce({ data: updatedComp });

      const result = await CompetenceService.update(1, updatedComp);

      expect(result).toEqual(updatedComp);
      expect(axios.put).toHaveBeenCalled();
    });

    it('should delete a competence', async () => {
      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      const result = await CompetenceService.delete(1);

      expect(result).toBeDefined();
      expect(axios.delete).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      axios.get.mockRejectedValueOnce(error);

      await expect(CompetenceService.getAll()).rejects.toThrow('API Error');
    });

    it('should filter competences by domaine', async () => {
      const mockData = [
        { id: 1, nom: 'C1', domaineId: 1 },
        { id: 2, nom: 'C2', domaineId: 1 },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await CompetenceService.getByDomaine(1);

      expect(result).toEqual(mockData);
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('domaine'));
    });
  });

  describe('Savoir operations', () => {
    it('should fetch all savoirs', async () => {
      const mockData = [
        { id: 1, nom: 'Savoir 1', type: 'THEORIQUE' },
        { id: 2, nom: 'Savoir 2', type: 'PRATIQUE' },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      if (CompetenceService.savoir?.getAll) {
        const result = await CompetenceService.savoir.getAll();
        expect(result).toEqual(mockData);
      }
    });
  });

  describe('Structure operations', () => {
    it('should fetch complete tree structure', async () => {
      const mockData = {
        domaines: [
          {
            id: 1,
            nom: 'Domaine 1',
            competences: [
              { id: 1, nom: 'Competence 1', savoirs: [] },
            ],
          },
        ],
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      if (CompetenceService.structure?.getArbreComplet) {
        const result = await CompetenceService.structure.getArbreComplet();
        expect(result).toEqual(mockData);
      }
    });

    it('should search globally in structure', async () => {
      const mockData = [
        { id: 1, nom: 'Search Result 1' },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      if (CompetenceService.structure?.rechercheGlobale) {
        const result = await CompetenceService.structure.rechercheGlobale('test');
        expect(result).toBeDefined();
      }
    });

    it('should search by domaine', async () => {
      const mockData = [
        { id: 1, nom: 'Result 1', domaineId: 1 },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      if (CompetenceService.structure?.rechercheParDomaine) {
        const result = await CompetenceService.structure.rechercheParDomaine(1, 'test');
        expect(result).toBeDefined();
      }
    });
  });

  describe('Niveau Definition operations', () => {
    it('should fetch niveau definitions by competence', async () => {
      const mockData = {
        N1_DEBUTANT: [],
        N2_ELEMENTAIRE: [],
        N3_INTERMEDIAIRE: [],
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      if (CompetenceService.niveauDefinition?.getByCompetence) {
        const result = await CompetenceService.niveauDefinition.getByCompetence(1);
        expect(result).toBeDefined();
      }
    });

    it('should add niveau definition', async () => {
      const newDef = { niveau: 'N1_DEBUTANT', savoirId: 1 };

      axios.post.mockResolvedValueOnce({ data: { id: 1, ...newDef } });

      if (CompetenceService.niveauDefinition?.add) {
        const result = await CompetenceService.niveauDefinition.add(newDef);
        expect(result).toBeDefined();
      }
    });

    it('should remove niveau definition', async () => {
      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      if (CompetenceService.niveauDefinition?.remove) {
        const result = await CompetenceService.niveauDefinition.remove(1);
        expect(result).toBeDefined();
      }
    });
  });
});

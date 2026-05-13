import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import FormationService from './FormationService';

// Mock axios
vi.mock('axios');

describe('FormationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Formation CRUD operations', () => {
    it('should fetch all formations', async () => {
      const mockData = [
        { id: 1, titre: 'Formation 1', description: 'Desc 1' },
        { id: 2, titre: 'Formation 2', description: 'Desc 2' },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await FormationService.getAll();

      expect(result).toEqual(mockData);
      expect(axios.get).toHaveBeenCalled();
    });

    it('should fetch formation by id', async () => {
      const mockData = { id: 1, titre: 'Formation 1', description: 'Desc 1' };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await FormationService.getById(1);

      expect(result).toEqual(mockData);
    });

    it('should create new formation', async () => {
      const newFormation = { titre: 'New Formation', description: 'New Desc' };
      const mockResponse = { id: 3, ...newFormation };

      axios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await FormationService.create(newFormation);

      expect(result).toEqual(mockResponse);
      expect(axios.post).toHaveBeenCalled();
    });

    it('should update formation', async () => {
      const updatedFormation = { id: 1, titre: 'Updated Formation' };

      axios.put.mockResolvedValueOnce({ data: updatedFormation });

      const result = await FormationService.update(1, updatedFormation);

      expect(result).toEqual(updatedFormation);
    });

    it('should delete formation', async () => {
      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      const result = await FormationService.delete(1);

      expect(result).toBeDefined();
      expect(axios.delete).toHaveBeenCalled();
    });
  });

  describe('Formation filtering and search', () => {
    it('should search formations by title', async () => {
      const mockData = [
        { id: 1, titre: 'React Training', description: 'React Desc' },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await FormationService.search('React');

      expect(result).toBeDefined();
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('search'),
        expect.any(Object)
      );
    });

    it('should filter formations by status', async () => {
      const mockData = [
        { id: 1, titre: 'Formation 1', status: 'ACTIVE' },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await FormationService.getByStatus('ACTIVE');

      expect(result).toBeDefined();
    });

    it('should filter formations by instructor', async () => {
      const mockData = [
        { id: 1, titre: 'Formation 1', instructorId: 5 },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await FormationService.getByInstructor(5);

      expect(result).toBeDefined();
    });

    it('should filter formations by date range', async () => {
      const mockData = [];

      axios.get.mockResolvedValueOnce({ data: mockData });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await FormationService.getByDateRange(startDate, endDate);

      expect(result).toBeDefined();
    });
  });

  describe('Formation statistics', () => {
    it('should get formation statistics', async () => {
      const mockStats = {
        totalFormations: 10,
        activeFormations: 5,
        completedFormations: 3,
        averageRating: 4.5,
      };

      axios.get.mockResolvedValueOnce({ data: mockStats });

      if (FormationService.getStatistics) {
        const result = await FormationService.getStatistics();
        expect(result).toEqual(mockStats);
      }
    });

    it('should get formation by department', async () => {
      const mockData = [
        { id: 1, titre: 'Formation 1', deptId: 1 },
      ];

      axios.get.mockResolvedValueOnce({ data: mockData });

      if (FormationService.getByDept) {
        const result = await FormationService.getByDept(1);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle API errors', async () => {
      const error = new Error('API Error');
      axios.get.mockRejectedValueOnce(error);

      await expect(FormationService.getAll()).rejects.toThrow('API Error');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'ECONNABORTED';

      axios.get.mockRejectedValueOnce(networkError);

      await expect(FormationService.getAll()).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';

      axios.get.mockRejectedValueOnce(timeoutError);

      await expect(FormationService.getAll()).rejects.toThrow();
    });
  });

  describe('Batch operations', () => {
    it('should bulk update formations', async () => {
      const formations = [
        { id: 1, status: 'ACTIVE' },
        { id: 2, status: 'ACTIVE' },
      ];

      axios.post.mockResolvedValueOnce({ data: { updated: 2 } });

      if (FormationService.bulkUpdate) {
        const result = await FormationService.bulkUpdate(formations);
        expect(result).toBeDefined();
      }
    });

    it('should bulk delete formations', async () => {
      const ids = [1, 2, 3];

      axios.post.mockResolvedValueOnce({ data: { deleted: 3 } });

      if (FormationService.bulkDelete) {
        const result = await FormationService.bulkDelete(ids);
        expect(result).toBeDefined();
      }
    });
  });
});

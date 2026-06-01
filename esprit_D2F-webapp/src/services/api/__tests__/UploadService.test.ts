import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
  },
}));

import UpService from "@/services/api/UploadService";

describe('UpService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates an UP', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1, libelle: 'UP1' } });
    const result = await UpService.createUp({ libelle: 'UP1' });
    expect(result).toEqual({ id: 1, libelle: 'UP1' });
  });

  it('gets all UPs and handles 404', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(UpService.getAllUps()).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(UpService.getAllUps()).resolves.toEqual([]);
  });

  it('gets UP by id', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    const result = await UpService.getUpById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('updates an UP', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, libelle: 'Updated' } });
    const result = await UpService.updateUp(1, { libelle: 'Updated' });
    expect(result).toEqual({ id: 1, libelle: 'Updated' });
  });

  it('deletes an UP', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await UpService.deleteUp(1);
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(expect.stringContaining('/1'));
  });

  it('imports UPs via excel', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: 'Import success' });
    const file = new File([''], 'ups.xlsx');
    const result = await UpService.importUpsExcel(file);
    expect(result).toBe('Import success');
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/import-excel'),
      expect.any(FormData),
      expect.any(Object)
    );
  });
});





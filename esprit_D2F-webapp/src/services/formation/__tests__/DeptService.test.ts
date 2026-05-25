import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
    isAxiosError: vi.fn((e) => Boolean(e && e.isAxiosError)),
  },
}));

vi.mock("@/services/auth/authHeaders", () => ({
  optionalAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

import DeptService from '../DeptService';

describe('DeptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a department', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1, nom: 'GC' } });
    const data = await DeptService.createDept({ nom: 'GC' });
    expect(httpMocks.mockPost).toHaveBeenCalledOnce();
    expect(data).toEqual({ id: 1, nom: 'GC' });
  });

  it('gets all departments and normalizes non-array responses', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(DeptService.getAllDepts()).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(DeptService.getAllDepts()).resolves.toEqual([]);
  });

  it('returns [] on 404 for getAllDepts', async () => {
    httpMocks.mockGet.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await expect(DeptService.getAllDepts()).resolves.toEqual([]);
  });

  it('gets, updates, deletes and imports departments', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 2, nom: 'INFO' } });
    await expect(DeptService.getDeptById(2)).resolves.toEqual({ id: 2, nom: 'INFO' });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 2, nom: 'INFO2' } });
    await expect(DeptService.updateDept(2, { nom: 'INFO2' })).resolves.toEqual({ id: 2, nom: 'INFO2' });

    httpMocks.mockDelete.mockResolvedValueOnce({});
    await expect(DeptService.deleteDept(2)).resolves.toBeUndefined();

    httpMocks.mockPost.mockResolvedValueOnce({ data: { imported: 3 } });
    await expect(DeptService.importDeptsExcel(new File(['x'], 'dept.xlsx'))).resolves.toEqual({ imported: 3 });
  });

  it('throws on non-404 error for getAllDepts', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('Network error'));
    await expect(DeptService.getAllDepts()).rejects.toThrow('Network error');
  });

  it('propagates errors from createDept, getDeptById, updateDept, deleteDept, importDeptsExcel', async () => {
    const err = new Error('server error');

    httpMocks.mockPost.mockRejectedValueOnce(err);
    await expect(DeptService.createDept({ nom: 'X' })).rejects.toThrow('server error');

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(DeptService.getDeptById(99)).rejects.toThrow('server error');

    httpMocks.mockPut.mockRejectedValueOnce(err);
    await expect(DeptService.updateDept(99, { nom: 'Y' })).rejects.toThrow('server error');

    httpMocks.mockDelete.mockRejectedValueOnce(err);
    await expect(DeptService.deleteDept(99)).rejects.toThrow('server error');

    httpMocks.mockPost.mockRejectedValueOnce(err);
    await expect(DeptService.importDeptsExcel(new File([''], 'x.xlsx'))).rejects.toThrow('server error');
  });
});

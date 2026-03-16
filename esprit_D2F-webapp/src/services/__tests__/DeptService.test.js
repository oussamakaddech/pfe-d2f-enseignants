import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import DeptService from '../DeptService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn((error) => Boolean(error && error.isAxiosError)),
  },
}));

vi.mock('../authHeaders', () => ({
  optionalAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

function axios404() {
  return { isAxiosError: true, response: { status: 404 } };
}

describe('DeptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a department', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 1, nom: 'GC' } });
    const data = await DeptService.createDept({ nom: 'GC' });
    expect(axios.post).toHaveBeenCalledOnce();
    expect(data).toEqual({ id: 1, nom: 'GC' });
  });

  it('gets all departments and normalizes non-array responses', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(DeptService.getAllDepts()).resolves.toEqual([{ id: 1 }]);

    axios.get.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(DeptService.getAllDepts()).resolves.toEqual([]);
  });

  it('returns [] on 404 for getAllDepts', async () => {
    axios.get.mockRejectedValueOnce(axios404());
    await expect(DeptService.getAllDepts()).resolves.toEqual([]);
  });

  it('gets, updates, deletes and imports departments', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 2, nom: 'INFO' } });
    await expect(DeptService.getDeptById(2)).resolves.toEqual({ id: 2, nom: 'INFO' });

    axios.put.mockResolvedValueOnce({ data: { id: 2, nom: 'INFO2' } });
    await expect(DeptService.updateDept(2, { nom: 'INFO2' })).resolves.toEqual({ id: 2, nom: 'INFO2' });

    axios.delete.mockResolvedValueOnce({});
    await expect(DeptService.deleteDept(2)).resolves.toBeUndefined();

    axios.post.mockResolvedValueOnce({ data: { imported: 3 } });
    await expect(DeptService.importDeptsExcel(new File(['x'], 'dept.xlsx'))).resolves.toEqual({ imported: 3 });
  });
});

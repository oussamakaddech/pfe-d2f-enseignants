import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushQuery } from '@/hooks/testUtils';
import {
  useAllDepts,
  useDeptById,
  useCreateDept,
  useUpdateDept,
  useDeleteDept,
  useImportDeptsExcel,
} from '@/hooks/formation/useDeptCrud';
import {
  useAllUps,
  useUpById,
  useCreateUp,
  useUpdateUp,
  useDeleteUp,
  useImportUpsExcel,
} from '@/hooks/formation/useUpCrud';
import DeptService from '@/services/formation/DeptService';
import UpService from '@/services/api/UploadService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/formation/DeptService', () => ({
  default: {
    getAllDepts: vi.fn(),
    getDeptById: vi.fn(),
    createDept: vi.fn(),
    updateDept: vi.fn(),
    deleteDept: vi.fn(),
    importDeptsExcel: vi.fn(),
  },
  __esModule: true,
}));
vi.mock('@/services/api/UploadService', () => ({
  default: {
    getAllUps: vi.fn(),
    getUpById: vi.fn(),
    createUp: vi.fn(),
    updateUp: vi.fn(),
    deleteUp: vi.fn(),
    importUpsExcel: vi.fn(),
    getAllEnseignants: vi.fn(),
  },
  __esModule: true,
}));

describe('useDeptCrud', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useAllDepts fetches', async () => {
    (DeptService.getAllDepts as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useAllDepts(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it('useDeptById fetches', async () => {
    (DeptService.getDeptById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 2 });
    const { result } = renderHook(() => useDeptById(2), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(DeptService.getDeptById).toHaveBeenCalledWith(2);
  });

  it('useCreateDept calls service', async () => {
    (DeptService.createDept as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateDept(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ nom: 'd' } as never);
    });
    expect(DeptService.createDept).toHaveBeenCalled();
  });

  it('useUpdateDept calls service', async () => {
    (DeptService.updateDept as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateDept(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: {} } as never);
    });
    expect(DeptService.updateDept).toHaveBeenCalledWith(1, {});
  });

  it('useDeleteDept calls service', async () => {
    (DeptService.deleteDept as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteDept(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(DeptService.deleteDept).toHaveBeenCalledWith(1);
  });

  it('useImportDeptsExcel calls service', async () => {
    (DeptService.importDeptsExcel as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useImportDeptsExcel(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(new Blob() as never);
    });
    expect(DeptService.importDeptsExcel).toHaveBeenCalled();
  });
});

describe('useUpCrud', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useAllUps fetches', async () => {
    (UpService.getAllUps as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useAllUps(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it('useUpById fetches', async () => {
    (UpService.getUpById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 2 });
    const { result } = renderHook(() => useUpById(2), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(UpService.getUpById).toHaveBeenCalledWith(2);
  });

  it('useCreateUp calls service', async () => {
    (UpService.createUp as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateUp(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ nom: 'u' } as never);
    });
    expect(UpService.createUp).toHaveBeenCalled();
  });

  it('useUpdateUp calls service', async () => {
    (UpService.updateUp as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateUp(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: {} } as never);
    });
    expect(UpService.updateUp).toHaveBeenCalledWith(1, {});
  });

  it('useDeleteUp calls service', async () => {
    (UpService.deleteUp as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteUp(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(UpService.deleteUp).toHaveBeenCalledWith(1);
  });

  it('useImportUpsExcel calls service', async () => {
    (UpService.importUpsExcel as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useImportUpsExcel(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(new Blob() as never);
    });
    expect(UpService.importUpsExcel).toHaveBeenCalled();
  });
});

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushQuery } from '@/hooks/testUtils';
import {
  useAllDocuments,
  useDocumentById,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useDownloadDocument,
} from '@/hooks/document/useDocument';
import DocumentService from '@/services/formation/DocumentService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/formation/DocumentService', () => ({
  default: {
    getAllDocuments: vi.fn(),
    getDocumentById: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    downloadDocument: vi.fn(),
  },
  __esModule: true,
}));

describe('useDocument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useAllDocuments fetches', async () => {
    (DocumentService.getAllDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useAllDocuments(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it('useDocumentById disabled without id', async () => {
    const { result } = renderHook(() => useDocumentById(undefined), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it('useDocumentById fetches', async () => {
    (DocumentService.getDocumentById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 3 });
    const { result } = renderHook(() => useDocumentById(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(DocumentService.getDocumentById).toHaveBeenCalledWith(3);
  });

  it('useCreateDocument calls service', async () => {
    (DocumentService.createDocument as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateDocument(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        formationId: 1,
        pathType: 'a',
        nomDocument: 'n',
        obligation: 'o',
        file: new Blob(),
      } as never);
    });
    expect(DocumentService.createDocument).toHaveBeenCalled();
  });

  it('useUpdateDocument calls service', async () => {
    (DocumentService.updateDocument as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateDocument(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        id: 1,
        pathType: 'a',
        nomDocument: 'n',
        obligation: 'o',
      } as never);
    });
    expect(DocumentService.updateDocument).toHaveBeenCalledWith(1, expect.anything());
  });

  it('useDeleteDocument calls service', async () => {
    (DocumentService.deleteDocument as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteDocument(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(DocumentService.deleteDocument).toHaveBeenCalledWith(1);
  });

  it('useDownloadDocument calls service', async () => {
    (DocumentService.downloadDocument as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDownloadDocument(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(DocumentService.downloadDocument).toHaveBeenCalledWith(1);
  });
});

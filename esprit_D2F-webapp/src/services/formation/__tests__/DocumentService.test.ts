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
  },
}));

import DocumentService from '../DocumentService';

describe('DocumentService', () => {
  beforeEach(() => { 
    vi.clearAllMocks();
    // Mock URL and document.createElement for downloadDocument
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:url');
    globalThis.URL.revokeObjectURL = vi.fn();
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  it('creates a document', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1 } });
    const file = new File(['x'], 'doc.pdf');
    const result = await DocumentService.createDocument({ formationId: 1, pathType: 'SUPPORT', nomDocument: 'D', obligation: 'true', file });
    expect(httpMocks.mockPost).toHaveBeenCalledOnce();
    expect(result).toEqual({ id: 1 });
  });

  it('gets documents', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(DocumentService.getAllDocuments()).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 2 } });
    await expect(DocumentService.getDocumentById(2)).resolves.toEqual({ id: 2 });
  });

  it('updates a document', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 3 } });
    const result = await DocumentService.updateDocument(3, { pathType: 'x', nomDocument: 'y', obligation: 'false' });
    expect(httpMocks.mockPut).toHaveBeenCalledOnce();
    expect(result).toEqual({ id: 3 });
  });

  it('deletes a document', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await DocumentService.deleteDocument(1);
    expect(httpMocks.mockDelete).toHaveBeenCalledOnce();
  });

  it('downloads a document', async () => {
    const blob = new Blob(['data']);
    httpMocks.mockGet.mockResolvedValueOnce({ 
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="test.pdf"' }
    });
    
    // Mock click
    const linkMock = { click: vi.fn(), remove: vi.fn(), setAttribute: vi.fn(), href: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(linkMock as unknown as HTMLElement);

    await DocumentService.downloadDocument(1);
    
    expect(linkMock.setAttribute).toHaveBeenCalledWith('download', 'test.pdf');
    expect(linkMock.click).toHaveBeenCalled();
  });
});





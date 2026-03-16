import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import DocumentService from '../DocumentService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../authHeaders', () => ({
  optionalAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
}));

describe('DocumentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets all documents', async () => {
    const payload = [{ id: 1, nomDocument: 'doc.pdf' }];
    axios.get.mockResolvedValueOnce({ data: payload });

    const data = await DocumentService.getAllDocuments();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(data).toEqual(payload);
  });

  it('creates a document using multipart form data', async () => {
    const payload = { id: 5, nomDocument: 'new.pdf' };
    axios.post.mockResolvedValueOnce({ data: payload });

    const data = await DocumentService.createDocument({
      formationId: 7,
      pathType: 'A',
      nomDocument: 'new.pdf',
      obligation: true,
      file: new File(['x'], 'new.pdf', { type: 'application/pdf' }),
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(data).toEqual(payload);
  });

  it('updates a document', async () => {
    const payload = { id: 10, nomDocument: 'upd.pdf' };
    axios.put.mockResolvedValueOnce({ data: payload });

    const data = await DocumentService.updateDocument(10, {
      pathType: 'B',
      nomDocument: 'upd.pdf',
      obligation: false,
      file: null,
    });

    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(data).toEqual(payload);
  });

  it('deletes a document', async () => {
    axios.delete.mockResolvedValueOnce({});

    await DocumentService.deleteDocument(9);

    expect(axios.delete).toHaveBeenCalledTimes(1);
  });

  it('downloads a document and revokes object url', async () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const remove = vi.fn();
    const setAttribute = vi.fn();
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      click,
      remove,
      setAttribute,
    });

    const originalURL = globalThis.URL;
    globalThis.URL = {
      ...originalURL,
      createObjectURL,
      revokeObjectURL,
    };

    axios.get.mockResolvedValueOnce({
      data: new Blob(['x']),
      headers: { 'content-disposition': 'attachment; filename="report.pdf"' },
    });

    await DocumentService.downloadDocument(11);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(setAttribute).toHaveBeenCalledWith('download', 'report.pdf');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');

    createElement.mockRestore();
    appendChild.mockRestore();
    globalThis.URL = originalURL;
  });
});

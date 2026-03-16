import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import OneDriveService from '../OneDriveService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../authHeaders', () => ({
  optionalAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

describe('OneDriveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves drive hierarchy', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 'root' }] });
    await expect(OneDriveService.getDriveHierarchy()).resolves.toEqual([{ id: 'root' }]);
  });

  it('downloads and deletes files', async () => {
    axios.get.mockResolvedValueOnce({ data: new Blob(['x']) });
    await expect(OneDriveService.downloadFile('F1', 'D1', 'file.pdf')).resolves.toBeInstanceOf(Blob);

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } });
    await expect(OneDriveService.deleteFile('F1', 'D1', 'file.pdf')).resolves.toEqual({ deleted: true });
  });

  it('gets embed link and formation hierarchy', async () => {
    axios.get.mockResolvedValueOnce({ data: { url: 'https://example.com/embed' } });
    await expect(OneDriveService.getEmbedLink('F1', 'D1')).resolves.toEqual({ url: 'https://example.com/embed' });

    axios.get.mockResolvedValueOnce({ data: [{ id: 'a' }] });
    await expect(OneDriveService.getFormationHierarchy(42)).resolves.toEqual([{ id: 'a' }]);
  });
});

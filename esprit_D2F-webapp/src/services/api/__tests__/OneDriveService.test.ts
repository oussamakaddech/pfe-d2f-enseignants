import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    delete: httpMocks.mockDelete,
  },
}));

import OneDriveService from '../OneDriveService';

describe('OneDriveService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets drive hierarchy', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { nodes: [] } });
    const result = await OneDriveService.getDriveHierarchy();
    expect(result).toEqual({ nodes: [] });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/hierarchy'));
  });

  it('downloads a file', async () => {
    const blob = new Blob(['data']);
    httpMocks.mockGet.mockResolvedValueOnce({ data: blob });
    const result = await OneDriveService.downloadFile('f1', 'd1', 'file.pdf');
    expect(result).toEqual(blob);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/download'), expect.objectContaining({
      params: { nomFormation: 'f1', nomDocument: 'd1', originalFileName: 'file.pdf' }
    }));
  });

  it('deletes a file', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({ data: 'ok' });
    const result = await OneDriveService.deleteFile('f1', 'd1', 'file.pdf');
    expect(result).toBe('ok');
  });

  it('gets embed link', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: 'https://embed.url' });
    const result = await OneDriveService.getEmbedLink('f1', 'd1');
    expect(result).toBe('https://embed.url');
  });

  it('gets formation hierarchy', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ name: 'doc1' }] });
    const result = await OneDriveService.getFormationHierarchy(1);
    expect(result).toEqual([{ name: 'doc1' }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/formations/1/hierarchy'));
  });

  it('propagates errors from all methods', async () => {
    const err = new Error('OneDrive error');

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(OneDriveService.getDriveHierarchy()).rejects.toThrow('OneDrive error');

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(OneDriveService.downloadFile('f', 'd', 'n')).rejects.toThrow('OneDrive error');

    httpMocks.mockDelete.mockRejectedValueOnce(err);
    await expect(OneDriveService.deleteFile('f', 'd', 'n')).rejects.toThrow('OneDrive error');

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(OneDriveService.getEmbedLink('f', 'd')).rejects.toThrow('OneDrive error');

    httpMocks.mockGet.mockRejectedValueOnce(err);
    await expect(OneDriveService.getFormationHierarchy(1)).rejects.toThrow('OneDrive error');
  });
});





import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
  },
}));

import SkillPassportService from '../SkillPassportService';

describe('SkillPassportService', () => {
  let mockAnchor: {
    style: Record<string, string>;
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnchor = { style: {}, href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor as unknown as Node);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads my passport and triggers browser download', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    httpMocks.mockGet.mockResolvedValueOnce({ data: blob });

    await SkillPassportService.downloadMyPassport();

    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/me'), {
      responseType: 'blob',
    });
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toMatch(/skill-passport-me-\d{8}\.pdf/);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(mockAnchor.remove).toHaveBeenCalled();
  });

  it('downloads passport by username and triggers browser download', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    httpMocks.mockGet.mockResolvedValueOnce({ data: blob });

    await SkillPassportService.downloadPassportByUsername('jdoe');

    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/teacher/jdoe'), {
      responseType: 'blob',
    });
    expect(mockAnchor.download).toMatch(/skill-passport-jdoe-\d{8}\.pdf/);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('gets my passport data as JSON', async () => {
    const data = { enseignantId: 1, competences: [] };
    httpMocks.mockGet.mockResolvedValueOnce({ data });

    const result = await SkillPassportService.getMyPassportData();

    expect(result).toEqual(data);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/me/json'));
  });

  it('gets passport data by username as JSON', async () => {
    const data = { enseignantId: 2, competences: [{ id: 1 }] };
    httpMocks.mockGet.mockResolvedValueOnce({ data });

    const result = await SkillPassportService.getPassportDataByUsername('jdoe');

    expect(result).toEqual(data);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/teacher/jdoe/json'));
  });
});

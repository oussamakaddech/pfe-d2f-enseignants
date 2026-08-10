import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
  },
}));

import CalendarService from '../CalendarService';

describe('CalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom does not implement object URLs — stub them.
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('previews and imports a file via multipart form data', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { sessions: [] } });
    await expect(CalendarService.preview(new File(['x'], 'c.xlsx'))).resolves.toEqual({
      sessions: [],
    });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/import/preview'),
      expect.any(FormData),
    );

    httpMocks.mockPost.mockResolvedValueOnce({ data: { status: 'OK' } });
    await expect(CalendarService.importCalendar(new File(['x'], 'c.xlsx'))).resolves.toEqual({
      status: 'OK',
    });
  });

  it('lists formations with normalised filter params', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [], total: 0 } });
    await CalendarService.listFormations({ titre: 'java', page: 2 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/formations'), {
      params: { titre: 'java', etat: undefined, page: 2, size: 20 },
    });
  });

  it('gets a formation, its participants and conflicts', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(CalendarService.getFormation(1)).resolves.toEqual({ id: 1 });

    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ email: 'a@x' }] } });
    await CalendarService.getParticipants(1, 1, 10);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/formations/1/participants'),
      { params: { page: 1, size: 10 } },
    );

    httpMocks.mockGet.mockResolvedValueOnce({ data: { conflicts: [] } });
    await expect(CalendarService.getConflicts()).resolves.toEqual({ conflicts: [] });
  });

  it('downloads an ICS, using the filename from content-disposition', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    httpMocks.mockGet.mockResolvedValueOnce({
      data: 'BEGIN:VCALENDAR',
      headers: { 'content-disposition': 'attachment; filename="planning.ics"' },
    });
    await CalendarService.downloadIcsAll();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/export/ics/all'), {
      responseType: 'blob',
    });
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('falls back to a default filename when no disposition header is present', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    httpMocks.mockGet.mockResolvedValueOnce({ data: 'X', headers: {} });
    await CalendarService.downloadIcsFormation(7);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();

    httpMocks.mockGet.mockResolvedValueOnce({ data: 'X', headers: {} });
    await CalendarService.downloadIcsParticipant('a@b.tn');
    expect(httpMocks.mockGet).toHaveBeenLastCalledWith(
      expect.stringContaining('/export/ics/participant/a%40b.tn'),
      { responseType: 'blob' },
    );
  });

  it('sends invitations for one formation and for all', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { sent: 3, message: 'ok' } });
    await expect(CalendarService.sendInvitations(5)).resolves.toEqual({ sent: 3, message: 'ok' });

    httpMocks.mockPost.mockResolvedValueOnce({ data: { sent: 10, message: 'ok' } });
    await expect(CalendarService.sendAllInvitations()).resolves.toEqual({
      sent: 10,
      message: 'ok',
    });
  });
});

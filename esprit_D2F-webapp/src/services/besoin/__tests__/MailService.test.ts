import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  defaultApi: {
    post: httpMocks.mockPost,
  },
}));

vi.mock("@/services/auth/authHeaders", () => ({
  optionalAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

import MailService from '../MailService';

describe('MailService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sends an email', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: 'E-mail envoyé à test@test.com' });
    const result = await MailService.sendEmail('test@test.com', 'Subject', 'Body');
    expect(result).toBe('E-mail envoyé à test@test.com');
    expect(httpMocks.mockPost).toHaveBeenCalledOnce();
  });

  it('throws on send error', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('SMTP error'));
    await expect(MailService.sendEmail('a@b.com', 'S', 'C')).rejects.toThrow('SMTP error');
  });
});





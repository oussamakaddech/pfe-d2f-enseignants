import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnimatorProposalService from '../AnimatorProposalService';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
  },
}));

describe('AnimatorProposalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates self and manager proposals', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(
      AnimatorProposalService.createSelfProposal(10, { role: 'LEAD_TRAINER', motivation: 'x' }),
    ).resolves.toEqual({ id: 1 });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/formations/10/self-animator-proposals'),
      { role: 'LEAD_TRAINER', motivation: 'x' },
    );

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 2 } });
    await expect(
      AnimatorProposalService.createManagerProposal(10, {
        proposerId: 'u1',
        proposerType: 'TEACHER',
        role: 'CO_TRAINER',
      }),
    ).resolves.toEqual({ id: 2 });
  });

  it('lists proposals', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(AnimatorProposalService.getFormationProposals(10)).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 2 }] });
    await expect(AnimatorProposalService.getMyProposals()).resolves.toEqual([{ id: 2 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 3 }] });
    await expect(AnimatorProposalService.getPendingProposals()).resolves.toEqual([{ id: 3 }]);
  });

  it('accepts, rejects, withdraws and validates proposals', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, status: 'ACCEPTED' } });
    await expect(AnimatorProposalService.acceptProposal(1, 'ok')).resolves.toEqual({
      id: 1,
      status: 'ACCEPTED',
    });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 2, status: 'REJECTED' } });
    await expect(AnimatorProposalService.rejectProposal(2, 'no')).resolves.toEqual({
      id: 2,
      status: 'REJECTED',
    });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 3, status: 'WITHDRAWN' } });
    await expect(AnimatorProposalService.withdrawProposal(3)).resolves.toEqual({
      id: 3,
      status: 'WITHDRAWN',
    });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 4, status: 'APPROVED' } });
    await expect(AnimatorProposalService.approveProposal(4)).resolves.toEqual({
      id: 4,
      status: 'APPROVED',
    });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 5, status: 'MANAGER_REJECTED' } });
    await expect(AnimatorProposalService.managerRejectProposal(5, 'reason')).resolves.toEqual({
      id: 5,
      status: 'MANAGER_REJECTED',
    });
  });

  it('assigns animators and lists them', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 9 } });
    await expect(AnimatorProposalService.assignAnimator(10, 5)).resolves.toEqual({ id: 9 });

    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 9 }] });
    await expect(AnimatorProposalService.getFormationAnimators(10)).resolves.toEqual([{ id: 9 }]);
  });
});

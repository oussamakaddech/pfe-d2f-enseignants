import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
import type {
  AnimatorProposal,
  AnimatorRole,
  FormationAnimator,
  ProposerType,
} from '@/models/animatorProposal';

const API_URL = `${config.FORMATION_URL}/api/v1`;

export interface SelfProposalPayload {
  role: AnimatorRole;
  motivation: string;
}

export interface ManagerProposalPayload {
  proposerId: string;
  proposerType: ProposerType;
  role: AnimatorRole;
  motivation?: string;
}

/**
 * Workflow propositions d'animation des formations.
 * Une auto-proposition ne crée jamais d'affectation : la validation
 * par un responsable (CUP / CHEF_DEPARTEMENT / ADMIN) est obligatoire.
 */
const AnimatorProposalService = {
  /** Auto-proposition (ENSEIGNANT / ANIMATEUR). */
  async createSelfProposal(
    formationId: number,
    payload: SelfProposalPayload,
  ): Promise<AnimatorProposal> {
    const response = await axios.post(
      `${API_URL}/formations/${formationId}/self-animator-proposals`,
      payload,
    );
    return response.data;
  },

  /** Proposition par un responsable (CUP / ADMIN / CHEF_DEPARTEMENT). */
  async createManagerProposal(
    formationId: number,
    payload: ManagerProposalPayload,
  ): Promise<AnimatorProposal> {
    const response = await axios.post(
      `${API_URL}/formations/${formationId}/animator-proposals`,
      payload,
    );
    return response.data;
  },

  /** Propositions d'une formation. */
  async getFormationProposals(formationId: number): Promise<AnimatorProposal[]> {
    const response = await axios.get(`${API_URL}/formations/${formationId}/animator-proposals`);
    return response.data;
  },

  /** Mes propositions (reçues et émises). */
  async getMyProposals(): Promise<AnimatorProposal[]> {
    const response = await axios.get(`${API_URL}/animator-proposals/mine`);
    return response.data;
  },

  /** Propositions en attente (responsables). */
  async getPendingProposals(): Promise<AnimatorProposal[]> {
    const response = await axios.get(`${API_URL}/animator-proposals/pending`);
    return response.data;
  },

  /** Accepter une proposition reçue. */
  async acceptProposal(proposalId: number, comment?: string): Promise<AnimatorProposal> {
    const response = await axios.put(`${API_URL}/animator-proposals/${proposalId}/accept`, {
      comment,
    });
    return response.data;
  },

  /** Refuser une proposition reçue. */
  async rejectProposal(proposalId: number, comment?: string): Promise<AnimatorProposal> {
    const response = await axios.put(`${API_URL}/animator-proposals/${proposalId}/reject`, {
      comment,
    });
    return response.data;
  },

  /** Retirer son auto-proposition. */
  async withdrawProposal(proposalId: number): Promise<AnimatorProposal> {
    const response = await axios.put(`${API_URL}/animator-proposals/${proposalId}/withdraw`);
    return response.data;
  },

  /** Valider une proposition (responsable, jamais le créateur). */
  async approveProposal(proposalId: number): Promise<AnimatorProposal> {
    const response = await axios.put(`${API_URL}/animator-proposals/${proposalId}/approve`);
    return response.data;
  },

  /** Refuser une proposition (responsable). */
  async managerRejectProposal(proposalId: number, reason?: string): Promise<AnimatorProposal> {
    const response = await axios.put(`${API_URL}/animator-proposals/${proposalId}/manager-reject`, {
      comment: reason,
    });
    return response.data;
  },

  /** Affectation définitive depuis une proposition approuvée. */
  async assignAnimator(formationId: number, proposalId: number): Promise<FormationAnimator> {
    const response = await axios.post(
      `${API_URL}/formations/${formationId}/animators/${proposalId}/assign`,
    );
    return response.data;
  },

  /** Affectations d'une formation. */
  async getFormationAnimators(formationId: number): Promise<FormationAnimator[]> {
    const response = await axios.get(`${API_URL}/formations/${formationId}/animators`);
    return response.data;
  },
};

export default AnimatorProposalService;

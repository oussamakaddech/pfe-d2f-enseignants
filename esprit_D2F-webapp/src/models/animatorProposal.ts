/**
 * Types du workflow propositions d'animation — parité backend.
 */
export type ProposerType = 'TEACHER' | 'ANIMATEUR' | 'EXTERNAL_TRAINER';
export type ProposalType = 'MANAGER_PROPOSAL' | 'SELF_PROPOSAL';
export type AnimatorRole = 'LEAD_TRAINER' | 'CO_TRAINER' | 'FACILITATOR';
export type ProposalStatus =
  | 'PROPOSED'
  | 'PENDING_VALIDATION'
  | 'ACCEPTED_BY_TRAINER'
  | 'REJECTED_BY_TRAINER'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';
export type AssignmentStatus = 'ACTIVE' | 'REPLACED' | 'CANCELLED';

export interface AnimatorProposal {
  id: number;
  formationId: number;
  formationTitre?: string;
  proposerId: string;
  proposerNom?: string;
  proposerPrenom?: string;
  proposerEmail?: string;
  proposerType: ProposerType;
  proposalType: ProposalType;
  role: AnimatorRole;
  status: ProposalStatus;
  motivation?: string;
  proposedBy?: string;
  proposedAt?: string;
  respondedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  rejectionReason?: string;
  responseComment?: string;
  canRespond: boolean;
  canValidate: boolean;
  canWithdraw: boolean;
}

export interface FormationAnimator {
  id: number;
  formationId: number;
  formationTitre?: string;
  teacherId?: string;
  teacherNom?: string;
  teacherPrenom?: string;
  teacherEmail?: string;
  animateurId?: string;
  role: AnimatorRole;
  assignedBy?: string;
  assignedAt?: string;
  status: AssignmentStatus;
  proposalId?: number;
}

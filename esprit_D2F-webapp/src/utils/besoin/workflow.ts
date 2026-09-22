import { normalizeRole } from '@/utils/constants/roles';
import type { BesoinFormation } from '@/models/besoin';

export interface WorkflowUser {
  username?: string | null;
  userName?: string | null;
  userId?: string | number | null;
  role?: string | null;
}

export interface DecisionState {
  /** L'utilisateur est le créateur du besoin (ne peut ni approuver ni refuser). */
  isCreator: boolean;
  /** Étape effective (repli flags legacy si currentApprovalStep absent). */
  step: 'CUP' | 'CHEF_DEPARTEMENT' | 'ADMIN' | 'COMPLETED' | 'REJECTED' | '';
  /** Le besoin est dans un état terminal (aucune décision possible). */
  isTerminal: boolean;
  /** L'étape courante correspond au rôle (indépendamment du créateur). */
  isMyStep: boolean;
  /** Afficher Approuver (rôle + étape + non créateur + non terminal). */
  canApprove: boolean;
  /** Afficher Refuser (mêmes conditions qu'approuver). */
  canReject: boolean;
  /** Le créateur peut annuler (statut SUBMITTED uniquement). */
  canCancel: boolean;
}

const TERMINAL_STATUS = new Set(['REJECTED', 'CANCELLED', 'FORMATION_CREATED', 'ADMIN_APPROVED']);

function currentUsername(user: WorkflowUser | null | undefined): string {
  return String(user?.username ?? user?.userName ?? '');
}

export function effectiveStep(besoin: BesoinFormation): DecisionState['step'] {
  const raw = besoin.currentApprovalStep;
  if (raw === 'CUP' || raw === 'CHEF_DEPARTEMENT' || raw === 'ADMIN') return raw;
  if (raw === 'COMPLETED' || raw === 'REJECTED') return raw;
  // Repli legacy : flags approuve_*.
  if (besoin.status === 'REJECTED' || besoin.status === 'CANCELLED') return 'REJECTED';
  if (besoin.status === 'FORMATION_CREATED' || besoin.approuveAdmin) return 'COMPLETED';
  if (!besoin.approuveCUP) return 'CUP';
  if (!besoin.approuveChefDep) return 'CHEF_DEPARTEMENT';
  if (!besoin.approuveAdmin) return 'ADMIN';
  return 'COMPLETED';
}

/**
 * Calcule l'état de décision pour un besoin et un utilisateur.
 * Miroir frontend des règles backend (le backend refait TOUS les contrôles) :
 * étape ↔ rôle, statuts terminaux, créateur exclu.
 */
export function getDecisionState(
  besoin: BesoinFormation,
  user: WorkflowUser | null | undefined,
): DecisionState {
  const step = effectiveStep(besoin);
  const role = normalizeRole(user?.role);
  const username = currentUsername(user);
  const isCreator =
    (!!username && username === String(besoin.username ?? '')) ||
    (user?.userId != null && String(user.userId) === String(besoin.createdByUserId ?? '\0'));
  const isTerminal =
    TERMINAL_STATUS.has(String(besoin.status ?? '')) || step === 'COMPLETED' || step === 'REJECTED';

  const isCupStep = step === 'CUP' && (role === 'cup' || role === 'admin');
  const isChefStep =
    step === 'CHEF_DEPARTEMENT' && (role === 'chefdepartement' || role === 'admin');
  const isAdminStep = step === 'ADMIN' && role === 'admin';
  const isMyStep = !isTerminal && (isCupStep || isChefStep || isAdminStep);

  const canDecide = isMyStep && !isCreator;
  const canCancel =
    !isTerminal &&
    !!username &&
    (username === String(besoin.username ?? '') || role === 'admin') &&
    (besoin.status === 'SUBMITTED' || (!besoin.status && !besoin.approuveCUP));

  return {
    isCreator,
    step,
    isTerminal,
    isMyStep,
    canApprove: canDecide,
    canReject: canDecide,
    canCancel,
  };
}

const STEP_LABELS: Record<string, string> = {
  CUP: 'Validation CUP',
  CHEF_DEPARTEMENT: 'Validation chef de département',
  ADMIN: 'Validation finale (admin)',
  COMPLETED: 'Terminé',
  REJECTED: 'Refusé',
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Soumis',
  CUP_APPROVED: 'Validé CUP',
  DEPARTMENT_APPROVED: 'Validé département',
  ADMIN_APPROVED: 'Validé admin',
  FORMATION_CREATED: 'Formation créée',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};

export function stepLabel(step: string | undefined | null): string {
  return STEP_LABELS[String(step ?? '')] ?? String(step ?? '—');
}

export function statusLabel(status: string | undefined | null): string {
  return STATUS_LABELS[String(status ?? '')] ?? String(status ?? '—');
}

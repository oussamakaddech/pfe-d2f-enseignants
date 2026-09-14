import { describe, it, expect } from 'vitest';
import { getDecisionState, effectiveStep, stepLabel, statusLabel } from '../workflow';
import type { BesoinFormation } from '@/models/besoin';

const base: BesoinFormation = {
  idBesoinFormation: 1,
  username: 'enseignant1',
  typeBesoin: 'INDIVIDUEL',
  status: 'SUBMITTED',
  currentApprovalStep: 'CUP',
};

describe('workflow decision helpers', () => {
  it('CUP peut décider à son étape (non créateur)', () => {
    const d = getDecisionState(base, { username: 'cup1', role: 'CUP' });
    expect(d.canApprove).toBe(true);
    expect(d.canReject).toBe(true);
    expect(d.isCreator).toBe(false);
  });

  it('le créateur ne peut ni approuver ni refuser', () => {
    const d = getDecisionState(base, { username: 'enseignant1', role: 'Enseignant' });
    expect(d.isCreator).toBe(true);
    expect(d.canApprove).toBe(false);
    expect(d.canReject).toBe(false);
  });

  it('le chef ne décide pas au stade CUP', () => {
    const d = getDecisionState(base, { username: 'chef1', role: 'CHEF_DEPARTEMENT' });
    expect(d.canApprove).toBe(false);
    expect(d.isMyStep).toBe(false);
  });

  it('le chef décide à son étape (individuel validé CUP)', () => {
    const b: BesoinFormation = {
      ...base,
      status: 'CUP_APPROVED',
      currentApprovalStep: 'CHEF_DEPARTEMENT',
      approuveCUP: true,
    };
    const d = getDecisionState(b, { username: 'chef1', role: 'CHEF_DEPARTEMENT' });
    expect(d.canApprove).toBe(true);
    expect(d.canReject).toBe(true);
  });

  it("l'admin décide à l'étape finale", () => {
    const b: BesoinFormation = {
      ...base,
      status: 'DEPARTMENT_APPROVED',
      currentApprovalStep: 'ADMIN',
      approuveCUP: true,
      approuveChefDep: true,
    };
    const d = getDecisionState(b, { username: 'admin', role: 'admin' });
    expect(d.canApprove).toBe(true);
  });

  it('un besoin refusé est terminal', () => {
    const b: BesoinFormation = {
      ...base,
      status: 'REJECTED',
      currentApprovalStep: 'REJECTED',
    };
    const d = getDecisionState(b, { username: 'admin', role: 'admin' });
    expect(d.isTerminal).toBe(true);
    expect(d.canApprove).toBe(false);
    expect(d.canReject).toBe(false);
  });

  it('le créateur peut annuler un besoin soumis', () => {
    const d = getDecisionState(base, { username: 'enseignant1', role: 'Enseignant' });
    expect(d.canCancel).toBe(true);
  });

  it('effectiveStep replie sur les flags legacy', () => {
    expect(effectiveStep({} as BesoinFormation)).toBe('CUP');
    expect(effectiveStep({ approuveCUP: true } as BesoinFormation)).toBe('CHEF_DEPARTEMENT');
    expect(effectiveStep({ approuveCUP: true, approuveChefDep: true } as BesoinFormation)).toBe(
      'ADMIN',
    );
  });

  it('labels FR', () => {
    expect(stepLabel('CHEF_DEPARTEMENT')).toBe('Validation chef de département');
    expect(statusLabel('FORMATION_CREATED')).toBe('Formation créée');
  });
});

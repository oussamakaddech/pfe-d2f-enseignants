import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAnimatorPermissions } from '../hooks/useAnimatorPermissions';

describe('useAnimatorPermissions', () => {
  it('ENSEIGNANT peut se proposer mais pas valider', () => {
    const { result } = renderHook(() => useAnimatorPermissions('ROLE_ENSEIGNANT'));
    expect(result.current.canSelfPropose).toBe(true);
    expect(result.current.canValidate).toBe(false);
    expect(result.current.canManage).toBe(false);
  });

  it('ANIMATEUR peut se proposer mais pas valider', () => {
    const { result } = renderHook(() => useAnimatorPermissions('Animateur'));
    expect(result.current.canSelfPropose).toBe(true);
    expect(result.current.canValidate).toBe(false);
  });

  it('CUP valide et propose mais ne se propose pas', () => {
    const { result } = renderHook(() => useAnimatorPermissions('ROLE_CUP'));
    expect(result.current.canSelfPropose).toBe(false);
    expect(result.current.canValidate).toBe(true);
    expect(result.current.canManage).toBe(true);
  });

  it('CHEF_DEPARTEMENT valide les propositions de son département', () => {
    const { result } = renderHook(() => useAnimatorPermissions('CHEF_DEPARTEMENT'));
    expect(result.current.canValidate).toBe(true);
    expect(result.current.canSelfPropose).toBe(false);
  });

  it('ADMIN a toutes les permissions', () => {
    const { result } = renderHook(() => useAnimatorPermissions('ROLE_ADMIN'));
    expect(result.current.canValidate).toBe(true);
    expect(result.current.canManage).toBe(true);
  });

  it('scope composé extra tous les rôles', () => {
    const { result } = renderHook(() => useAnimatorPermissions('ROLE_ENSEIGNANT ROLE_ANIMATEUR'));
    expect(result.current.canSelfPropose).toBe(true);
  });

  it('rôle inconnu : aucune permission', () => {
    const { result } = renderHook(() => useAnimatorPermissions('INCONNU'));
    expect(result.current.canSelfPropose).toBe(false);
    expect(result.current.canValidate).toBe(false);
    expect(result.current.canManage).toBe(false);
  });

  it('rôle absent : aucune permission (deny by default)', () => {
    const { result } = renderHook(() => useAnimatorPermissions(null));
    expect(result.current.canSelfPropose).toBe(false);
    expect(result.current.canValidate).toBe(false);
  });
});

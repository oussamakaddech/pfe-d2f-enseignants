import { useMemo } from 'react';
import { extractRoles } from '@/utils/constants/roles';

export interface AnimatorPermissions {
  /** L'utilisateur peut se proposer (ENSEIGNANT / ANIMATEUR). */
  canSelfPropose: boolean;
  /** L'utilisateur valide les propositions (CUP / CHEF_DEPARTEMENT / ADMIN). */
  canValidate: boolean;
  /** L'utilisateur propose des animateurs (CUP / CHEF_DEPARTEMENT / ADMIN). */
  canManage: boolean;
}

/**
 * Permissions du workflow d'animation dérivées du rôle (claim scope/role).
 * Le frontend ne fait qu'afficher/masquer : le backend revalide TOUT.
 */
export function useAnimatorPermissions(role?: string | null): AnimatorPermissions {
  return useMemo(() => {
    const roles = extractRoles(role);
    const isAdmin = roles.includes('admin');
    const isCup = roles.includes('cup');
    const isChef = roles.includes('chefdepartement');
    const isEnseignant = roles.includes('enseignant');
    const isAnimateur = roles.includes('animateur');
    return {
      canSelfPropose: isEnseignant || isAnimateur,
      canValidate: isAdmin || isCup || isChef,
      canManage: isAdmin || isCup || isChef,
    };
  }, [role]);
}

export default useAnimatorPermissions;

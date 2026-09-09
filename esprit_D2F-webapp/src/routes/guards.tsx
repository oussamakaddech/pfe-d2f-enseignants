import { useContext, useEffect, ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { hasAnyRole } from '@/utils/constants/roles';
import { notify } from '@/utils/helpers/notifications';

/**
 * Frontend Authorization Matrix.
 * Must stay in sync with backend AuthorizationMatrix.java + gateway AuthorizationFilter.java.
 */
export const FRONTEND_PERMISSIONS = {
  COMPETENCE: {
    READ: ['admin', 'CUP', 'Enseignant', 'CHEF_DEPARTEMENT'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    ASSIGN: ['admin'],
  },
  AFFECTATION: {
    READ: ['admin', 'CUP'],
    CREATE: ['admin'],
    UPDATE_SELF: ['admin', 'CUP', 'Enseignant'],
    UPDATE_ALL: ['admin'],
    DELETE: ['admin'],
  },
  BESOIN_FORMATION: {
    READ_ALL: ['admin', 'CHEF_DEPARTEMENT', 'ResponsableDossier'],
    READ_CUP: ['admin', 'CUP'],
    READ_ENSEIGNANT: ['admin', 'Enseignant'],
    CREATE: ['admin', 'CUP', 'Enseignant', 'Animateur'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    APPROVE: ['admin', 'CUP', 'CHEF_DEPARTEMENT'],
  },
  FORMATION: {
    READ: ['admin', 'CUP', 'Enseignant', 'Animateur', 'ResponsableDossier', 'CHEF_DEPARTEMENT'],
    CREATE: ['admin', 'CUP'],
    UPDATE: ['admin', 'CUP', 'ResponsableDossier'],
    DELETE: ['admin'],
    APPROVE: ['admin', 'CUP'],
    READ_OWN: ['admin', 'Animateur', 'Enseignant'],
    // Marquage des présences d'une séance (parité AuthorizationMatrix.PRESENCE_MARK).
    PRESENCE_MARK: ['admin', 'CUP', 'ResponsableDossier', 'Animateur', 'Enseignant'],
  },
  EVALUATION: {
    READ_ALL: ['admin', 'CUP', 'CHEF_DEPARTEMENT', 'Enseignant', 'Animateur'],
    READ_FORMATION: ['admin', 'CHEF_DEPARTEMENT', 'Enseignant', 'Animateur'],
    READ_CUP: ['admin', 'CUP'],
    READ_ENSEIGNANT: ['admin', 'Enseignant'],
    READ_FORMATEUR: ['admin', 'Animateur'],
    CREATE: ['admin', 'Animateur', 'Enseignant'],
    UPDATE: ['admin', 'Animateur', 'Enseignant'],
    DELETE: ['admin'],
    MARK_ENTRY: ['admin', 'Animateur'],
  },
  CERTIFICAT: {
    READ: ['admin', 'CUP', 'Enseignant', 'Animateur'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
  },
  DOSSIER: {
    READ: ['admin', 'ResponsableDossier'],
    CREATE: ['admin', 'ResponsableDossier'],
    UPDATE: ['admin', 'ResponsableDossier'],
    DELETE: ['admin', 'ResponsableDossier'],
    SCAN: ['admin', 'ResponsableDossier'],
    IMPORT: ['admin', 'ResponsableDossier'],
    EXPORT: ['admin', 'ResponsableDossier'],
  },
  RICE: {
    READ: ['admin'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
  },
  DASHBOARD: {
    ADMIN_FULL: ['admin'],
    ADMIN_LIMITED: ['admin', 'CUP', 'CHEF_DEPARTEMENT', 'ResponsableDossier'],
  },
  ACCOUNT: {
    READ: ['admin'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    BAN: ['admin'],
    VIEW_PROFILE: ['admin', 'CUP', 'Enseignant', 'Animateur'],
    EDIT_OWN: ['admin', 'CUP', 'Enseignant', 'Animateur'],
  },
  INSCRIPTION: {
    READ: ['admin', 'CUP', 'Enseignant', 'Animateur'],
    CREATE: ['admin', 'CUP', 'Enseignant', 'Animateur'],
    APPROVE: ['admin', 'CUP'],
  },
};

export function PrivateRoute() {
  const auth = useContext(AuthContext);
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  const { user } = auth;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

interface RoleGuardProps {
  allowedRoles: string[];
}

function ForbiddenRedirect() {
  useEffect(() => {
    notify.warning(
      "Accès refusé. Vous n'avez pas les droits nécessaires pour accéder à cette page.",
    );
  }, []);
  return <Navigate to="/403" replace />;
}

export function RoleGuard({ allowedRoles }: Readonly<RoleGuardProps>) {
  const auth = useContext(AuthContext);
  if (!auth) {
    return <Navigate to="/" replace />;
  }
  const { user } = auth;
  // Le scope JWT peut être composé (ex. "ROLE_D2F ROLE_RESPONSABLE_DOSSIER") :
  // l'accès est accordé si AU MOINS UN rôle du scope est autorisé.
  if (!user || !hasAnyRole(user?.role, allowedRoles)) {
    return <ForbiddenRedirect />;
  }
  return <Outlet />;
}

export const useHasRole = (requiredRoles: string[]): boolean => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return false;
  return hasAnyRole(auth.user.role, requiredRoles);
};

export const useHasPermission = (
  module: keyof typeof FRONTEND_PERMISSIONS,
  action: string,
): boolean => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return false;
  const permissions = FRONTEND_PERMISSIONS[module];
  if (!permissions) return false;
  const allowedRoles = (permissions as Record<string, string[] | undefined>)[action];
  if (!allowedRoles || !Array.isArray(allowedRoles)) return false;
  return hasAnyRole(auth.user.role, allowedRoles);
};

export const useUserRole = (): string | null => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return null;
  return typeof auth.user.role === 'string' ? auth.user.role : null;
};

interface PermissionGuardProps {
  module: keyof typeof FRONTEND_PERMISSIONS;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard = ({
  module,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) => {
  const hasPermission = useHasPermission(module, action);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

interface ConditionalRenderProps {
  show: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ConditionalRender = ({ show, children, fallback = null }: ConditionalRenderProps) => {
  return show ? <>{children}</> : <>{fallback}</>;
};

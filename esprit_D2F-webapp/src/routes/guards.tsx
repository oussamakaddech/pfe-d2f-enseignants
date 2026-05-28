import { useContext, useEffect, ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext";
import { notify } from "@/utils/helpers/notifications";

const normalizeRole = (value: unknown): string =>
  (typeof value === "string" ? value : "")
    .toLowerCase()
    .replace(/^role_?/, "")
    .replaceAll(/[\s_-]+/g, "");

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
    READ_ALL: ['admin', 'CUP', 'Enseignant', 'CHEF_DEPARTEMENT'],
    CREATE: ['admin', 'CUP', 'Enseignant'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    APPROVE: ['admin', 'CUP', 'CHEF_DEPARTEMENT'],
  },
  FORMATION: {
    READ: ['admin', 'CUP', 'Enseignant', 'Formateur', 'ResponsableDossier', 'CHEF_DEPARTEMENT'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    APPROVE: ['admin'],
    READ_OWN: ['Formateur'],
  },
  EVALUATION: {
    READ_ALL: ['admin', 'CUP', 'CHEF_DEPARTEMENT'],
    READ_FORMATEUR: ['Formateur'],
    CREATE: ['admin', 'Formateur'],
    UPDATE: ['admin', 'Formateur'],
    DELETE: ['admin'],
    MARK_ENTRY: ['Formateur'],
  },
  CERTIFICAT: {
    READ: ['admin', 'CUP', 'Enseignant', 'Formateur'],
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
    ADMIN_LIMITED: ['CUP', 'CHEF_DEPARTEMENT'],
  },
  ACCOUNT: {
    READ: ['admin'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    BAN: ['admin'],
    VIEW_PROFILE: ['admin', 'CUP', 'Enseignant', 'Formateur'],
    EDIT_OWN: ['admin', 'CUP', 'Enseignant', 'Formateur'],
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
    notify.warning("Accès refusé. Vous n'avez pas les droits nécessaires pour accéder à cette page.");
  }, []);
  return <Navigate to="/home/profile" replace />;
}

export function RoleGuard({ allowedRoles }: Readonly<RoleGuardProps>) {
  const auth = useContext(AuthContext);
  if (!auth) {
    return <Navigate to="/" replace />;
  }
  const { user } = auth;
  const role = normalizeRole(user?.role);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  if (!user || !normalizedAllowedRoles.includes(role)) {
    return <ForbiddenRedirect />;
  }
  return <Outlet />;
}

export const useHasRole = (requiredRoles: string[]): boolean => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return false;
  const role = normalizeRole(auth.user.role);
  return requiredRoles.map(normalizeRole).includes(role);
};

export const useHasPermission = (
  module: keyof typeof FRONTEND_PERMISSIONS,
  action: string
): boolean => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return false;
  const permissions = FRONTEND_PERMISSIONS[module];
  if (!permissions) return false;
  const allowedRoles = (permissions as Record<string, string[] | undefined>)[action];
  if (!allowedRoles || !Array.isArray(allowedRoles)) return false;
  const role = normalizeRole(auth.user.role);
  return allowedRoles.map(normalizeRole).includes(role);
};

export const useUserRole = (): string | null => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return null;
  return typeof auth.user.role === "string" ? auth.user.role : null;
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

export const ConditionalRender = ({
  show,
  children,
  fallback = null,
}: ConditionalRenderProps) => {
  return show ? <>{children}</> : <>{fallback}</>;
};

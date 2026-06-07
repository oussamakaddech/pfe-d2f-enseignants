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
    READ: ['admin', 'D2F', 'CUP', 'Enseignant', 'CHEF_DEPARTEMENT'],
    CREATE: ['admin', 'D2F'],
    UPDATE: ['admin', 'D2F'],
    DELETE: ['admin'],
    ASSIGN: ['admin', 'D2F'],
  },
  AFFECTATION: {
    READ: ['admin', 'D2F', 'CUP'],
    CREATE: ['admin', 'D2F'],
    UPDATE_SELF: ['admin', 'D2F', 'CUP', 'Enseignant'],
    UPDATE_ALL: ['admin', 'D2F'],
    DELETE: ['admin', 'D2F'],
  },
  BESOIN_FORMATION: {
    READ_ALL: ['admin', 'CHEF_DEPARTEMENT'],
    READ_CUP: ['admin', 'D2F', 'CUP'],
    READ_ENSEIGNANT: ['admin', 'Enseignant'],
    CREATE: ['admin', 'D2F', 'CUP', 'Enseignant'],
    UPDATE: ['admin', 'D2F'],
    DELETE: ['admin', 'D2F'],
    APPROVE: ['admin', 'D2F', 'CUP', 'CHEF_DEPARTEMENT'],
  },
  FORMATION: {
    READ: ['admin', 'D2F', 'CUP', 'Enseignant', 'Animateur', 'ResponsableDossier', 'CHEF_DEPARTEMENT'],
    CREATE: ['admin', 'D2F', 'CUP'],
    UPDATE: ['admin', 'D2F', 'CUP', 'ResponsableDossier'],
    DELETE: ['admin'],
    APPROVE: ['admin', 'D2F', 'CUP'],
    READ_OWN: ['admin', 'Animateur'],
  },
  EVALUATION: {
    READ_ALL: ['admin', 'CHEF_DEPARTEMENT'],
    READ_CUP: ['admin', 'D2F', 'CUP'],
    READ_ENSEIGNANT: ['admin', 'Enseignant'],
    READ_FORMATEUR: ['admin', 'Animateur'],
    CREATE: ['admin', 'Animateur'],
    UPDATE: ['admin', 'Animateur'],
    DELETE: ['admin'],
    MARK_ENTRY: ['admin', 'Animateur'],
  },
  CERTIFICAT: {
    READ: ['admin', 'D2F', 'CUP', 'Enseignant', 'Animateur'],
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
    ADMIN_LIMITED: ['admin', 'D2F', 'CUP', 'CHEF_DEPARTEMENT'],
  },
  ACCOUNT: {
    READ: ['admin'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    BAN: ['admin'],
    VIEW_PROFILE: ['admin', 'D2F', 'CUP', 'Enseignant', 'Animateur'],
    EDIT_OWN: ['admin', 'D2F', 'CUP', 'Enseignant', 'Animateur'],
  },
  INSCRIPTION: {
    READ: ['admin', 'D2F', 'CUP', 'Enseignant', 'Animateur'],
    CREATE: ['admin', 'D2F', 'CUP', 'Enseignant'],
    APPROVE: ['admin', 'D2F', 'CUP'],
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
  return <Navigate to="/403" replace />;
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

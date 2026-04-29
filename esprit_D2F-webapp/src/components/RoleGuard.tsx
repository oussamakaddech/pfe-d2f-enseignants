import { useContext, ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * Frontend Authorization Matrix
 * Mirrors backend permissions to prevent UI rendering of unauthorized features.
 * Must stay in sync with:
 *   - AuthorizationMatrix.java (auth service)
 *   - AuthorizationFilter.java (gateway)
 */
export const FRONTEND_PERMISSIONS = {
  // Competence Management
  COMPETENCE: {
    READ: ['admin', 'CUP', 'Enseignant'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    ASSIGN: ['admin'],
  },

  // Affectation Management
  AFFECTATION: {
    READ: ['admin', 'CUP'],
    CREATE: ['admin'],
    UPDATE_SELF: ['admin', 'CUP', 'Enseignant'],
    UPDATE_ALL: ['admin'],
    DELETE: ['admin'],
  },

  // Besoins en Formation
  BESOIN_FORMATION: {
    READ_ALL: ['admin', 'CUP', 'Enseignant'],
    CREATE: ['admin', 'CUP', 'Enseignant'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    APPROVE: ['admin', 'CUP'],
  },

  // Planification Formations
  FORMATION: {
    READ: ['admin', 'CUP', 'Enseignant', 'Formateur'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
    APPROVE: ['admin'],
    READ_OWN: ['Formateur'],
  },

  // Evaluations & Certificats
  EVALUATION: {
    READ_ALL: ['admin', 'CUP'],
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

  // RICE Module
  RICE: {
    READ: ['admin'],
    CREATE: ['admin'],
    UPDATE: ['admin'],
    DELETE: ['admin'],
  },

  // Dashboard / KPI
  DASHBOARD: {
    ADMIN_FULL: ['admin'],
    ADMIN_LIMITED: ['CUP'],
  },

  // User Management
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


interface RoleGuardProps {
  allowedRoles: string[];
}

export default function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const auth = useContext(AuthContext);
  if (!auth) {
    return <Navigate to="/" replace />;
  }

  const { user } = auth;
  const role = typeof user?.role === "string" ? user.role : "";
  if (!user || !allowedRoles.includes(role)) {
    return <Navigate to="/home/profile" replace />;
  }

  return <Outlet />;
}

/**
 * Hook to check if user has specific role
 */
export const useHasRole = (requiredRoles: string[]): boolean => {
  const auth = useContext(AuthContext);
  if (!auth || !auth.user) return false;
  
  const role = typeof auth.user.role === "string" ? auth.user.role : "";
  return requiredRoles.includes(role);
};

/**
 * Hook to check if user has specific permission
 */
export const useHasPermission = (
  module: keyof typeof FRONTEND_PERMISSIONS,
  action: string
): boolean => {
  const auth = useContext(AuthContext);
  if (!auth || !auth.user) return false;

  const permissions = FRONTEND_PERMISSIONS[module];
  if (!permissions) return false;

  const allowedRoles = permissions[action as keyof typeof permissions];
  if (!allowedRoles) return false;

  const role = typeof auth.user.role === "string" ? auth.user.role : "";
  return allowedRoles.includes(role);
};

/**
 * Hook to get user role
 */
export const useUserRole = (): string | null => {
  const auth = useContext(AuthContext);
  if (!auth || !auth.user) return null;
  
  return typeof auth.user.role === "string" ? auth.user.role : null;
};

/**
 * Component for conditionally rendering based on permission
 */
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

/**
 * Component for conditionally rendering based on role
 */
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

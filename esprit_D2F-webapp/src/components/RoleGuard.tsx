import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

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
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}

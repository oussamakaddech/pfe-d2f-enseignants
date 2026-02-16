import  { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import { AuthContext } from "../context/AuthContext";

export default function RoleGuard({ allowedRoles }) {
  const { user } = useContext(AuthContext);

  // Si pas connecté ou rôle non autorisé, on redirige
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/profile" replace />;
  }
  return <Outlet />;
}

RoleGuard.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

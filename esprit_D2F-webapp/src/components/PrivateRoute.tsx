import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute() {
  const auth = useContext(AuthContext);
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const { user } = auth;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

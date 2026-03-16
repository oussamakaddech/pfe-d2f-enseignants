import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute() {
  const auth = useContext(AuthContext);
  if (!auth) {
    return null;
  }

  const { user } = auth;
  if (user === null) {
    return null;
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
}

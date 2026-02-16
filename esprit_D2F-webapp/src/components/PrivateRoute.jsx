import  { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute() {
  const { user } = useContext(AuthContext);

  // Tant que l'utilisateur est en chargement, on n'affiche rien
  if (user === null) return null;

  return user ? <Outlet /> : <Navigate to="/" replace />;
}

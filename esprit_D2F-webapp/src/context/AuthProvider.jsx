import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "./AuthContext";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 🔍 Charger l'utilisateur depuis localStorage au chargement
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");

    console.log("🔍 Vérification du token au chargement:", token);
    console.log("🔍 Vérification de l'utilisateur au chargement:", storedUser);

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []); // 👈 S'exécute une seule fois

  // ✅ Définir les fonctions **avant** de les utiliser dans useMemo
  const login = (token, userData) => {
    console.log("✅ Connexion réussie : Stockage du token et des données utilisateur");
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    console.log("🚪 Déconnexion : Suppression des données");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  // 🔥 `useMemo()` pour éviter la réinitialisation de `user`
  const authValue = useMemo(() => ({ user, login, logout }), [user]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;

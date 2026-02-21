import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const SideBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🔍 Vérification dans SideBar - Utilisateur :", user);
  }, [user]);

  const handleLogout = () => {
    logout(); // Supprime le token
    navigate("/"); // Redirige vers la page de connexion
  };

  return (
    <div className="left-sidebar-pro">
      <nav id="sidebar" className="sidebar">
        <div className="sidebar-header">
          <Link to="/">
            <img className="main-logo" src="/assets/img/logo/esprit.png" alt="Logo Esprit" />
          </Link>
          <strong>
            <img src="/assets/img/logo/esprit.png" alt="Small Logo" />
          </strong>
        </div>

        <div className="left-custom-menu-adp-wrap comment-scrollbar">
          <nav className="sidebar-nav left-sidebar-menu-pro">
            <ul className="metismenu" id="menu1">
              {user && (
                <>

                  <li>
                    <Link to="/home/profile">
                      <i className="fa fa-user" /> Mon Profil
                    </Link>
                  </li>
                  <li>
                    <Link to="/home/mes-competences">
                      <i className="fa fa-star" /> Mes Compétences
                    </Link>
                  </li>

                  {/* 🔹 Liens visibles uniquement pour les administrateurs */}
                  {user?.role === "admin" && (
                    <>
                    <li>
                      <Link to="/home/KPI">
                        <i className="fa fa-home" /> KPI
                      </Link>
                    </li>
                      <li>
                        <Link to="/home/accounts">
                          <i className="fa fa-users" /> Gérer Comptes
                        </Link>
                      </li>
                      <li>
                        <Link to="/home/Calendrier">
                          <i className="fa fa-calendar" /> Calendrier 
                        </Link>
                      </li>
                      <li>
                        <Link to="/home/Formation">
                          <i className="fa fa-cog" /> Formation
                        </Link>
                      </li>
                      
              
                      <li>
                        <Link to="/home/File">
                          <i className="fa fa-certificate" /> Documents
                        </Link>
                      </li>
                      <li>
                        <Link to="/home/Enseignants">
                          <i className="fa fa-cog" /> Enseignants
                        </Link>
                      </li>
                      <li>
                        <Link to="/home/competences">
                          <i className="fa fa-graduation-cap" /> Compétences
                        </Link>
                      </li>
                      <li>
                        <Link to="/home/certificate">
                          <i className="fa fa-certificate" /> Certificate
                        </Link>
                      </li>

            
                    </>
                  )}

                  {/* 🔹 Liens visibles uniquement pour les coachs */}
                  {user?.role === "Formateur" && (
                    <>
         
                      <li>
                        <Link to="/home/animateur-formations">
                          <i className="fa fa-graduation-cap" /> Mes Formations
                        </Link>
                      </li>
                      <li>
                        <Link to="/home/MyCertificate">
                          <i className="fa fa-certificate" /> Mes Certificates
                        </Link>
                      </li>
                    </>
                  )}

                  {/* 🔹 Déconnexion */}
                  <li>
                    <button onClick={handleLogout} className="btn btn-danger logout-btn">
                      <i className="fa fa-sign-out"></i> Déconnexion
                    </button>
                  </li>

                </>
              )}
            </ul>
          </nav>
        </div>
      </nav>
    </div>
  );
};

export default SideBar;

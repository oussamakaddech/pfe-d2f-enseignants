// src/components/SideMenu.jsx
import { useContext, useMemo } from "react";
import { Menu } from "antd";
import {
  HomeOutlined,
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ReadOutlined,
  SolutionOutlined,
  LogoutOutlined,
  ApartmentOutlined,
  RobotOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  FormOutlined,
  BarChartOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function SideMenu() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo(() => {
    if (!user) return [];

    // Entrées communes à tous les utilisateurs
    const common = [
      { label: "Profil", key: "/home/profile", icon: SolutionOutlined },
      {
        label: "Inscriptions",
        key: "/home/ListeFormation",
        icon: FileTextOutlined,
      },
    ];

    // Menu admin
    const admin = [
      { label: "KPI", key: "/home/KPI", icon: BarChartOutlined },
      { label: "Comptes", key: "/home/accounts", icon: TeamOutlined },
      {
        label: "Formations",
        key: "formations_menu",
        icon: FormOutlined,
        children: [
          { label: "Créer une Formation", key: "/home/Formation/Creer", icon: PlusCircleOutlined },
          { label: "Consulter les Formations", key: "/home/Formation/Consulter", icon: SearchOutlined },
        ],
      },
      { label: "Évaluations", key: "/home/Evaluations", icon: TrophyOutlined },
      { label: "Analyse Prédictive", key: "/home/AnalysePredictive", icon: RobotOutlined },
      { label: "Documents", key: "/home/File", icon: FileTextOutlined },
      { label: "Gestion Enseignant", key: "/home/Enseignants", icon: TeamOutlined },
      { label: "Gestion Competence", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Gestion d'affectation",
        key: "gestion_affectation",
        icon: SolutionOutlined,
        children: [
          { label: "Consultation Affectation", key: "/home/affectations" },
          { label: "Affectation via Matchmaking", key: "/home/rice/matchmaking" },
        ],
      },
      { label: "RICE", key: "/home/rice", icon: RobotOutlined },
    ];
    // Menu D2F
    const D2F = [
      { label: "KPI", key: "/home/KPI", icon: BarChartOutlined },
      { label: "Comptes", key: "/home/accounts", icon: TeamOutlined },
      { label: "Calendrier", key: "/home/Calendrier", icon: CalendarOutlined },
      {
        label: "Formations",
        key: "formations_menu",
        icon: FormOutlined,
        children: [
          { label: "Créer une Formation", key: "/home/Formation/Creer", icon: PlusCircleOutlined },
          { label: "Consulter les Formations", key: "/home/Formation/Consulter", icon: SearchOutlined },
        ],
      },
      { label: "Évaluations", key: "/home/Evaluations", icon: TrophyOutlined },
      { label: "Analyse Prédictive", key: "/home/AnalysePredictive", icon: RobotOutlined },
      { label: "Besoin Approuver", key: "/home/BesoinApprouver", icon: ReadOutlined },
      { label: "Documents", key: "/home/File", icon: FileTextOutlined },
      { label: "Enseignants", key: "/home/Enseignants", icon: TeamOutlined },
      { label: "Certificates", key: "/home/certificate", icon: ReadOutlined },
      { label: "Up & Departement", key: "/home/UpDept", icon: ReadOutlined },
      { label: "Presence & Evaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Gestion Competence", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Gestion d'affectation",
        key: "gestion_affectation",
        icon: SolutionOutlined,
        children: [
          { label: "Consultation Affectation", key: "/home/affectations" },
          { label: "Affectation via Matchmaking", key: "/home/rice/matchmaking" },
        ],
      },
      { label: "RICE", key: "/home/rice", icon: RobotOutlined },
    ];
    // Menu Enseignant (même accès que D2F)
    const Enseignant = [
      { label: "KPI", key: "/home/KPI", icon: DashboardOutlined },
      { label: "Comptes", key: "/home/accounts", icon: TeamOutlined },
      { label: "Calendrier", key: "/home/Calendrier", icon: CalendarOutlined },
      {
        label: "Formations",
        key: "formations_menu",
        icon: FormOutlined,
        children: [
          { label: "Créer une Formation", key: "/home/Formation/Creer", icon: PlusCircleOutlined },
          { label: "Consulter les Formations", key: "/home/Formation/Consulter", icon: SearchOutlined },
        ],
      },
      { label: "Évaluations", key: "/home/Evaluations", icon: TrophyOutlined },
      { label: "Analyse Prédictive", key: "/home/AnalysePredictive", icon: RobotOutlined },
      { label: "Besoin Approuver", key: "/home/BesoinApprouver", icon: ReadOutlined },
      { label: "Documents", key: "/home/File", icon: FileTextOutlined },
      { label: "Enseignants", key: "/home/Enseignants", icon: TeamOutlined },
      { label: "Certificates", key: "/home/certificate", icon: ReadOutlined },
      { label: "Up & Departement", key: "/home/UpDept", icon: ReadOutlined },
      { label: "Presence & Evaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Gestion Competence", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Gestion d'affectation",
        key: "gestion_affectation",
        icon: SolutionOutlined,
        children: [
          { label: "Consultation Affectation", key: "/home/affectations" },
          { label: "Affectation via Matchmaking", key: "/home/rice/matchmaking" },
        ],
      },
      { label: "RICE", key: "/home/rice", icon: RobotOutlined },
    ];
        // Menu admin
    const CUP = [
      { label: "Tableau de bord", key: "/home/profile", icon: HomeOutlined },
      { label: "KPI", key: "/home/KPI", icon: DashboardOutlined },
      { label: "Mes Formations", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Enseignants", key: "/home/Enseignants", icon: TeamOutlined },
      { label: "Certificates", key: "/home/certificate", icon: ReadOutlined },
      { label: "Mes Certificates", key: "/home/MyCertificate", icon: ReadOutlined },
      { label: "Compétences", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Gestion d'affectation",
        key: "gestion_affectation",
        icon: SolutionOutlined,
        children: [
          { label: "Consultation Affectation", key: "/home/affectations" },
          { label: "Affectation via Matchmaking", key: "/home/rice/matchmaking" },
        ],
      },
      { label: "RICE", key: "/home/rice", icon: RobotOutlined },
    ];
    // Menu formateur (role = "Formateur")
    const formateur = [
      { label: "Mes Formations", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Mes Certificates", key: "/home/MyCertificate", icon: ReadOutlined },
    ];

    // Les items selon rôle
    let roleItems = [];
    switch (user.role) {
      case "admin":
        roleItems = admin;
        break;
      case "CUP":
        // Pour le CUP, on ne rajoute rien de plus (seulement Formations + Profil)
        roleItems = CUP;
        break;
      case "D2F":
        // Pour le D2F, pareil : il voit la liste Formations générale
        roleItems = D2F;
        break;
      case "Enseignant":
        // L'Enseignant a les mêmes accès que le D2F
        roleItems = Enseignant;
        break;
      case "Formateur":
        roleItems = formateur;
        break;
      default:
        roleItems = [];
    }

    // Ajout du bouton Déconnexion
    const logoutItem = {
      label: "Déconnexion",
      key: "logout",
      icon: LogoutOutlined,
      danger: true,
    };

    return [...common, ...roleItems, logoutItem];
  }, [user]);

  const onClick = ({ key }) => {
    if (key === "logout") {
      logout();
      navigate("/");
    } else if (typeof key === "string" && key.startsWith("/")) {
      navigate(key);
    }
  };

  return (
    <>
      <div style={{ padding: 16, textAlign: "center" }}>
        <Link to="/home/profile">
          <img
            src="/assets/img/logo/esprit.png"
            alt="Esprit"
            style={{ height: 80, objectFit: "contain" }}
          />
        </Link>
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[pathname]}
        onClick={onClick}
        items={items.map((item) => {
          const renderIcon = (icon) =>
            icon
              ? (() => {
                  const Icon = icon;
                  return <Icon style={{ fontSize: 18, color: "#B51200" }} />;
                })()
              : null;

          if (item.key === "logout") {
            const { icon, ...rest } = item;
            return { icon: renderIcon(icon), ...rest };
          }

          const { icon, children, ...rest } = item;
          return {
            icon: renderIcon(icon),
            children: children
              ? children.map((child) => {
                  const { icon: childIcon, ...childRest } = child;
                  return { icon: renderIcon(childIcon), ...childRest };
                })
              : undefined,
            ...rest,
          };
        })}
      />
    </>
  );
}

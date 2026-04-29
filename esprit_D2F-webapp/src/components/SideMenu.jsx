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
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function SideMenu() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo(() => {
    if (!user) return [];

    // ──────────────────────────────────────────────
    // Entrées communes à TOUS les utilisateurs
    // ──────────────────────────────────────────────
    const common = [
      { label: "Profil", key: "/home/profile", icon: UserOutlined },
    ];

    const personalItems = [
      {
        label: "Inscriptions",
        key: "/home/ListeFormation",
        icon: FileTextOutlined,
      },
      { label: "Mes Certificats", key: "/home/MyCertificate", icon: SafetyCertificateOutlined },
    ];

    // ──────────────────────────────────────────────
    // Menu ADMIN — accès complet
    // ──────────────────────────────────────────────
    const admin = [
      { label: "KPI", key: "/home/KPI", icon: BarChartOutlined },
      { label: "Comptes", key: "/home/accounts", icon: TeamOutlined },
      { label: "Inscription", key: "/home/ListeFormation", icon: FileTextOutlined },
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
      { label: "Calendrier", key: "/home/Calendrier", icon: CalendarOutlined },
      { label: "Gestion Enseignant", key: "/home/Enseignants", icon: TeamOutlined },
      { label: "Certificats Formations", key: "/home/certificate", icon: SafetyCertificateOutlined },
      { label: "Gestion Compétence", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Besoin Formation",
        key: "besoin_formation_menu",
        icon: ReadOutlined,
        children: [
          { label: "Liste des Besoins", key: "/home/besoins", icon: SearchOutlined },
        ],
      },
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

    // ──────────────────────────────────────────────
    // Menu CUP — Chef d'Unité Pédagogique
    // ──────────────────────────────────────────────
    const CUP = [
      { label: "Évaluations", key: "/home/Evaluations", icon: TrophyOutlined },
      { label: "Compétences", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Besoin Formation",
        key: "besoin_formation_menu",
        icon: ReadOutlined,
        children: [
          { label: "Liste des Besoins", key: "/home/besoins", icon: SearchOutlined },
          { label: "Ajouter Besoin", key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      {
        label: "Gestion d'affectation",
        key: "gestion_affectation",
        icon: SolutionOutlined,
        children: [
          { label: "Consultation Affectation", key: "/home/affectations" },
          { label: "Affectation via Matchmaking", key: "/home/rice/matchmaking" },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      ...personalItems,
    ];

    // ──────────────────────────────────────────────
    // Menu Enseignant — accès limité
    // ──────────────────────────────────────────────
    const Enseignant = [
      { label: "Compétences", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Besoin Formation",
        key: "besoin_formation_menu",
        icon: ReadOutlined,
        children: [
          { label: "Liste des Besoins", key: "/home/besoins", icon: SearchOutlined },
          { label: "Ajouter Besoin", key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      ...personalItems,
    ];

    // ──────────────────────────────────────────────
    // Menu Formateur — animateur de sessions
    // ──────────────────────────────────────────────
    const formateur = [
      { label: "Mes Formations", key: "/home/animateur-formations", icon: ReadOutlined },
    ];

    // Les items selon rôle
    let roleItems = [];
    switch (user.role) {
      case "admin":
        roleItems = admin;
        break;
      case "CUP":
        roleItems = CUP;
        break;
      case "Enseignant":
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

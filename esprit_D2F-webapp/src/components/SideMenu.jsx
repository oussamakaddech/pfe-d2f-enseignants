// src/components/SideMenu.jsx
import { useContext, useMemo } from "react";
import { Menu, Avatar, Badge, Typography, Divider } from "antd";
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
  SettingOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./SideMenu.css";

const { Text } = Typography;

const normalizeRole = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/^role_?/, "")
    .replace(/[\s_-]+/g, "");

export default function SideMenu() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo(() => {
    if (!user) return [];

    const personalItems = [
      {
        label: "Mes Inscriptions",
        key: "/home/ListeFormation",
        icon: FileTextOutlined,
      },
      { label: "Mes Certificats", key: "/home/MyCertificate", icon: SafetyCertificateOutlined },
    ];

    const admin = [
      { label: "Tableau de Bord KPI", key: "/home/KPI", icon: BarChartOutlined },
      {
        label: "Administration",
        key: "admin_management",
        icon: TeamOutlined,
        children: [
          { label: "Gestion des Comptes", key: "/home/accounts", icon: UserOutlined },
          { label: "Annuaire Enseignants", key: "/home/Enseignants", icon: SolutionOutlined },
          { label: "Structures (UP/Dept)", key: "/home/UpDept", icon: ApartmentOutlined },
        ],
      },
      { label: "Inscriptions", key: "/home/ListeFormation", icon: FileTextOutlined },
      {
        label: "Gestion Formations",
        key: "formations_menu",
        icon: FormOutlined,
        children: [
          { label: "Nouvelle Formation", key: "/home/Formation/Creer", icon: PlusCircleOutlined },
          { label: "Consulter le Catalogue", key: "/home/Formation/Consulter", icon: SearchOutlined },
        ],
      },
      { label: "Évaluations", key: "/home/Evaluations", icon: TrophyOutlined },
      { label: "Analyse Prédictive", key: "/home/AnalysePredictive", icon: RobotOutlined },
      { label: "Gestion Documentaire", key: "/home/File", icon: FileTextOutlined },
      { label: "Calendrier Global", key: "/home/Calendrier", icon: CalendarOutlined },
      { label: "Certifications", key: "/home/certificate", icon: SafetyCertificateOutlined },
      { label: "Référentiel Compétences", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Besoins en Formation",
        key: "besoin_formation_menu",
        icon: ReadOutlined,
        children: [
          { label: "Liste des Demandes", key: "/home/besoins", icon: SearchOutlined },
        ],
      },
      {
        label: "Gestion Affectation",
        key: "gestion_affectation",
        icon: SolutionOutlined,
        children: [
          { label: "Suivi des Affectations", key: "/home/affectations" },
          { label: "Matchmaking IA", key: "/home/rice/matchmaking" },
        ],
      },
      { label: "Service RICE", key: "/home/rice", icon: RobotOutlined },
    ];

    const CUP = [
      { label: "Évaluations", key: "/home/Evaluations", icon: TrophyOutlined },
      { label: "Référentiel Compétences", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Besoins en Formation",
        key: "besoin_formation_menu",
        icon: ReadOutlined,
        children: [
          { label: "Liste des Demandes", key: "/home/besoins", icon: SearchOutlined },
          { label: "Déposer un Besoin", key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      {
        label: "Gestion Affectation",
        key: "gestion_affectation",
        icon: SolutionOutlined,
        children: [
          { label: "Suivi des Affectations", key: "/home/affectations" },
          { label: "Matchmaking IA", key: "/home/rice/matchmaking" },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Analyse Prédictive", key: "/home/AnalysePredictive", icon: RobotOutlined },
      ...personalItems,
    ];

    const Enseignant = [
      { label: "Référentiel Compétences", key: "/home/competences", icon: ApartmentOutlined },
      {
        label: "Besoins en Formation",
        key: "besoin_formation_menu",
        icon: ReadOutlined,
        children: [
          { label: "Liste des Demandes", key: "/home/besoins", icon: SearchOutlined },
          { label: "Déposer un Besoin", key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      ...personalItems,
    ];

    const formateur = [
      { label: "Sessions d'Animation", key: "/home/animateur-formations", icon: ReadOutlined },
    ];

    const responsableDossier = [
      { label: "Gestion Formations", key: "/home/Formation/Consulter", icon: SearchOutlined },
      { label: "Dossiers de Formation", key: "/home/File", icon: FileTextOutlined },
    ];

    const chefDepartement = [
      { label: "Gestion Formations", key: "/home/Formation/Consulter", icon: SearchOutlined },
      { label: "Dossiers de Formation", key: "/home/File", icon: FileTextOutlined },
      { label: "Calendrier Global", key: "/home/Calendrier", icon: CalendarOutlined },
      { label: "Analyse Prédictive", key: "/home/AnalysePredictive", icon: RobotOutlined },
    ];

    let roleItems = [];
    switch (normalizeRole(user.role)) {
      case "admin": roleItems = admin; break;
      case "cup": roleItems = CUP; break;
      case "enseignant": roleItems = Enseignant; break;
      case "formateur": roleItems = formateur; break;
      case "responsabledossier": roleItems = responsableDossier; break;
      case "chefdepartement": roleItems = chefDepartement; break;
      default: roleItems = [];
    }

    const common = [{ label: "Mon Profil", key: "/home/profile", icon: UserOutlined }];

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

  const menuItems = items.map((item) => {
    const Icon = item.icon;
    const children = item.children?.map(child => {
      const ChildIcon = child.icon;
      return {
        ...child,
        icon: ChildIcon ? <ChildIcon /> : null
      };
    });

    return {
      ...item,
      icon: Icon ? <Icon /> : null,
      children
    };
  });

  return (
    <div className="sidemenu-container">
      <div className="sidemenu-logo-section">
        <Link to="/home/profile">
          <img
            src="/assets/img/logo/esprit.png"
            alt="Esprit"
          />
        </Link>
      </div>

      <div className="sidemenu-user-card">
        <div className="user-card-content">
          <Badge dot color="#52c41a" offset={[-5, 35]}>
            <Avatar 
              size={48} 
              icon={<UserOutlined />} 
              src={user?.avatar}
              className="user-avatar"
            />
          </Badge>
          <div className="user-info">
            <Text className="user-name">{user?.username}</Text>
            <Text className="user-role">{user?.role}</Text>
          </div>
        </div>
      </div>

      <Divider style={{ margin: "8px 0", opacity: 0.5 }} />

      <div className="sidemenu-nav-section">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          onClick={onClick}
          items={menuItems}
          className="custom-sidemenu"
        />
      </div>
    </div>
  );
}

// src/components/SideMenu.jsx
import { useContext, useMemo } from "react";
import { Menu, Avatar, Badge, Typography, Divider } from "antd";
import {
  CalendarOutlined,
  FileTextOutlined,
  ReadOutlined,
  SolutionOutlined,
  LogoutOutlined,
  ApartmentOutlined,
  RobotOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  BarChartOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./SideMenu.css";

const { Text } = Typography;

const normalizeRole = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/^role_?/, "")
    .replaceAll(/[\s_-]+/g, "");

const ROLE_LABELS = {
  admin:              "Administrateur",
  cup:                "CUP",
  enseignant:         "Enseignant",
  formateur:          "Formateur",
  responsabledossier: "Responsable Dossier",
  chefdepartement:    "Chef de Département",
};

function processItems(items) {
  return items.map((item) => {
    if (item.type === "group") {
      return {
        type: "group",
        label: item.label,
        children: processItems(item.children || []),
      };
    }
    const Icon = item.icon;
    const children = item.children ? processItems(item.children) : undefined;
    return {
      ...item,
      icon: Icon ? <Icon /> : null,
      ...(children !== undefined && { children }),
    };
  });
}

export default function SideMenu() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const roleKey = normalizeRole(user?.role);

  const items = useMemo(() => {
    if (!user) return [];

    const common = [
      { label: "Mon Profil", key: "/home/profile", icon: UserOutlined },
    ];

    const admin = [
      { type: "group", label: "TABLEAU DE BORD", children: [
        { label: "Tableau de Bord KPI", key: "/home/KPI", icon: BarChartOutlined },
      ]},
      { type: "group", label: "ADMINISTRATION", children: [
        { label: "Gestion des Comptes",  key: "/home/accounts",       icon: UserOutlined },
        { label: "Annuaire Enseignants", key: "/home/Enseignants",    icon: SolutionOutlined },
        { label: "Structures (UP/Dept)", key: "/home/UpDept",         icon: ApartmentOutlined },
        { label: "Inscriptions",         key: "/home/ListeFormation", icon: FileTextOutlined },
      ]},
      { type: "group", label: "FORMATIONS", children: [
        { label: "Nouvelle Formation",   key: "/home/Formation/Creer",     icon: PlusCircleOutlined },
        { label: "Catalogue",            key: "/home/Formation/Consulter", icon: SearchOutlined },
        { label: "Évaluations",         key: "/home/Evaluations",         icon: TrophyOutlined },
        { label: "Gestion Documentaire",key: "/home/File",                icon: FileTextOutlined },
        { label: "Calendrier Global",    key: "/home/Calendrier",          icon: CalendarOutlined },
        { label: "Certifications",       key: "/home/certificate",         icon: SafetyCertificateOutlined },
      ]},
      { type: "group", label: "COMPÉTENCES & IA", children: [
        { label: "Référentiel Compétences", key: "/home/competences",         icon: ApartmentOutlined },
        { label: "Besoins en Formation",    key: "/home/besoins",             icon: ReadOutlined },
        { label: "Affectations",            key: "/home/affectations",        icon: SolutionOutlined },
        { label: "Matchmaking IA",          key: "/home/rice/matchmaking",    icon: RobotOutlined },
        { label: "Service RICE",            key: "/home/rice",                icon: RobotOutlined },
        { label: "Analyse Prédictive",     key: "/home/AnalysePredictive",   icon: RobotOutlined },
      ]},
    ];

    const CUP = [
      { label: "Évaluations",             key: "/home/Evaluations",          icon: TrophyOutlined },
      { label: "Référentiel Compétences", key: "/home/competences",          icon: ApartmentOutlined },
      {
        label: "Besoins en Formation", key: "besoin_formation_menu", icon: ReadOutlined,
        children: [
          { label: "Liste des Demandes", key: "/home/besoins",         icon: SearchOutlined },
          { label: "Déposer un Besoin",  key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      {
        label: "Affectation & IA", key: "gestion_affectation", icon: SolutionOutlined,
        children: [
          { label: "Suivi des Affectations", key: "/home/affectations",      icon: SolutionOutlined },
          { label: "Matchmaking IA",         key: "/home/rice/matchmaking",  icon: RobotOutlined },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Analyse Prédictive",    key: "/home/AnalysePredictive",    icon: RobotOutlined },
      { label: "Mes Inscriptions",      key: "/home/ListeFormation",       icon: FileTextOutlined },
      { label: "Mes Certificats",       key: "/home/MyCertificate",        icon: SafetyCertificateOutlined },
    ];

    const enseignant = [
      { label: "Référentiel Compétences", key: "/home/competences",          icon: ApartmentOutlined },
      {
        label: "Besoins en Formation", key: "besoin_formation_menu", icon: ReadOutlined,
        children: [
          { label: "Liste des Demandes", key: "/home/besoins",         icon: SearchOutlined },
          { label: "Déposer un Besoin",  key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Mes Inscriptions",      key: "/home/ListeFormation",       icon: FileTextOutlined },
      { label: "Mes Certificats",       key: "/home/MyCertificate",        icon: SafetyCertificateOutlined },
    ];

    const formateur = [
      { label: "Sessions d'Animation", key: "/home/animateur-formations", icon: ReadOutlined },
      { label: "Mes Inscriptions",     key: "/home/ListeFormation",       icon: FileTextOutlined },
    ];

    const responsableDossier = [
      { label: "Gestion Formations",   key: "/home/Formation/Consulter", icon: SearchOutlined },
      { label: "Dossiers de Formation",key: "/home/File",                icon: FileTextOutlined },
    ];

    const chefDepartement = [
      { label: "Gestion Formations",   key: "/home/Formation/Consulter", icon: SearchOutlined },
      { label: "Dossiers de Formation",key: "/home/File",                icon: FileTextOutlined },
      { label: "Calendrier Global",    key: "/home/Calendrier",          icon: CalendarOutlined },
      { label: "Analyse Prédictive",  key: "/home/AnalysePredictive",   icon: RobotOutlined },
    ];

    let roleItems = [];
    switch (roleKey) {
      case "admin":              roleItems = admin;            break;
      case "cup":                roleItems = CUP;              break;
      case "enseignant":         roleItems = enseignant;       break;
      case "formateur":          roleItems = formateur;        break;
      case "responsabledossier": roleItems = responsableDossier; break;
      case "chefdepartement":    roleItems = chefDepartement;  break;
      default:                   roleItems = [];
    }

    const logoutItem = {
      label: "Déconnexion",
      key: "logout",
      icon: LogoutOutlined,
      danger: true,
    };

    return [...common, ...roleItems, logoutItem];
  }, [user, roleKey]);

  const onClick = ({ key }) => {
    if (key === "logout") {
      logout();
      navigate("/");
    } else if (typeof key === "string" && key.startsWith("/")) {
      navigate(key);
    }
  };

  const menuItems = useMemo(() => processItems(items), [items]);

  return (
    <div className="sidemenu-container">
      <div className="sidemenu-user-card">
        <div className="user-card-content">
          <Badge dot color="#52c41a" offset={[-4, 34]}>
            <Avatar
              size={42}
              icon={<UserOutlined />}
              src={user?.avatar}
              className="user-avatar"
              style={{ background: "linear-gradient(135deg, #B51200, #8b0000)", color: "#fff" }}
            />
          </Badge>
          <div className="user-info">
            <Text className="user-name">{user?.username}</Text>
            <Text className="user-role">{ROLE_LABELS[roleKey] ?? user?.role}</Text>
          </div>
        </div>
      </div>

      <Divider style={{ margin: "8px 0", opacity: 0.4 }} />

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

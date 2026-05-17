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
  LineChartOutlined,
  ApiOutlined,
  ClusterOutlined,
  SettingOutlined,
  TeamOutlined,
  BookOutlined,
  AppstoreOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./SideMenu.css";

const { Text } = Typography;

const normalizeRole = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/^role_?/, "")
    .replaceAll(/[\s_-]+/g, "");

const ROLE_LABELS: Record<string, string> = {
  admin:              "Administrateur",
  cup:                "CUP",
  enseignant:         "Enseignant",
  formateur:          "Formateur",
  responsabledossier: "Responsable Dossier",
  chefdepartement:    "Chef de Département",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#7c3aed",
  cup: "#B51200",
  enseignant: "#2563eb",
  formateur: "#d97706",
  responsabledossier: "#6366f1",
  chefdepartement: "#0891b2",
};

function processItems(items: any[]): any[] {
  return items.map((item) => {
    if (item.type === "group") {
      return {
        type: "group",
        label: item.label,
        children: processItems(item.children || []),
      };
    }
    const Icon = item.icon;
    const children: any[] | undefined = item.children ? processItems(item.children) : undefined;
    return {
      ...item,
      icon: Icon ? <Icon /> : null,
      ...(children !== undefined && { children }),
    };
  });
}

interface SideMenuProps {
  collapsed?: boolean;
}

export default function SideMenu({ collapsed }: SideMenuProps) {
  const { user, logout } = useContext(AuthContext) || { user: null, logout: () => {} };
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const roleKey = normalizeRole(user?.role || "");

  const items = useMemo(() => {
    if (!user) return [];

    const accountGroup = [
      { type: "group", label: "MON COMPTE", children: [
        { label: "Mon Profil",    key: "/home/profile", icon: UserOutlined },
        { label: "Déconnexion",   key: "logout",        icon: LogoutOutlined, danger: true },
      ]},
    ];

    const admin = [
      { type: "group", label: "TABLEAU DE BORD", children: [
        { label: "KPI & Métriques",    key: "/home/KPI",                icon: BarChartOutlined  },
        { label: "Analyse Prédictive", key: "/home/AnalysePredictive",  icon: LineChartOutlined },
        { label: "Alertes",            key: "/home/analytics/alerts",   icon: BellOutlined      },
      ]},
      { type: "group", label: "ADMINISTRATION", children: [
        { label: "Gestion des Comptes",  key: "/home/accounts",       icon: SettingOutlined   },
        { label: "Annuaire Enseignants", key: "/home/Enseignants",    icon: TeamOutlined      },
        { label: "Structures (UP/Dépt)", key: "/home/UpDept",         icon: ApartmentOutlined },
        { label: "Inscriptions",         key: "/home/ListeFormation", icon: FileTextOutlined  },
      ]},
      { type: "group", label: "FORMATIONS", children: [
        { label: "Nouvelle Formation",    key: "/home/Formation/Creer",     icon: PlusCircleOutlined     },
        { label: "Catalogue",             key: "/home/Formation/Consulter", icon: AppstoreOutlined       },
        { label: "Évaluations",           key: "/home/Evaluations",         icon: TrophyOutlined         },
        { label: "Gestion Documentaire",  key: "/home/File",                icon: FileTextOutlined       },
        { label: "Calendrier Global",     key: "/home/Calendrier",          icon: CalendarOutlined       },
        { label: "Certifications",        key: "/home/certificate",         icon: SafetyCertificateOutlined },
      ]},
      { type: "group", label: "COMPÉTENCES & IA", children: [
        { label: "Référentiel Compétences", key: "/home/competences",   icon: BookOutlined     },
        { label: "Besoins de Formation",    key: "/home/besoins",       icon: ReadOutlined     },
        { label: "Affectations",            key: "/home/affectations",  icon: SolutionOutlined },
        {
          label: "RICE & IA", key: "rice_ia_group", icon: RobotOutlined,
          children: [
            { label: "Vue RICE",      key: "/home/rice",             icon: ClusterOutlined },
            { label: "Matchmaking IA",key: "/home/rice/matchmaking", icon: ApiOutlined     },
          ],
        },
      ]},
    ];

    const CUP = [
      { label: "Évaluations",             key: "/home/Evaluations",         icon: TrophyOutlined         },
      { label: "Référentiel Compétences", key: "/home/competences",         icon: BookOutlined           },
      {
        label: "Besoins de Formation", key: "besoin_formation_menu", icon: ReadOutlined,
        children: [
          { label: "Liste des Demandes", key: "/home/besoins",         icon: SearchOutlined     },
          { label: "Déposer un Besoin",  key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      {
        label: "Affectation & IA", key: "gestion_affectation", icon: SolutionOutlined,
        children: [
          { label: "Suivi des Affectations", key: "/home/affectations",      icon: SolutionOutlined },
          { label: "Matchmaking IA",         key: "/home/rice/matchmaking",  icon: ApiOutlined      },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined      },
      { label: "Analyse Prédictive",    key: "/home/AnalysePredictive",    icon: LineChartOutlined },
      { label: "Mes Inscriptions",      key: "/home/ListeFormation",       icon: AppstoreOutlined  },
      { label: "Mes Certificats",       key: "/home/MyCertificate",        icon: SafetyCertificateOutlined },
    ];

    const enseignant = [
      { label: "Référentiel Compétences", key: "/home/competences",         icon: BookOutlined          },
      {
        label: "Besoins de Formation", key: "besoin_formation_menu", icon: ReadOutlined,
        children: [
          { label: "Liste des Demandes", key: "/home/besoins",         icon: SearchOutlined     },
          { label: "Déposer un Besoin",  key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
        ],
      },
      { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined     },
      { label: "Mes Inscriptions",      key: "/home/ListeFormation",       icon: AppstoreOutlined },
      { label: "Mes Certificats",       key: "/home/MyCertificate",        icon: SafetyCertificateOutlined },
    ];

    const formateur = [
      { label: "Sessions d'Animation", key: "/home/animateur-formations", icon: ReadOutlined     },
      { label: "Mes Inscriptions",     key: "/home/ListeFormation",       icon: AppstoreOutlined },
    ];

    const responsableDossier = [
      { label: "Gestion Formations",   key: "/home/Formation/Consulter", icon: AppstoreOutlined },
      { label: "Dossiers de Formation",key: "/home/File",                icon: FileTextOutlined },
    ];

    const chefDepartement = [
      { label: "Gestion Formations",   key: "/home/Formation/Consulter", icon: AppstoreOutlined  },
      { label: "Dossiers de Formation",key: "/home/File",                icon: FileTextOutlined  },
      { label: "Calendrier Global",    key: "/home/Calendrier",          icon: CalendarOutlined  },
      { label: "Analyse Prédictive",   key: "/home/AnalysePredictive",   icon: LineChartOutlined },
    ];

    let roleItems: any[] = [];
    switch (roleKey) {
      case "admin":              roleItems = admin;              break;
      case "cup":                roleItems = CUP;                break;
      case "enseignant":         roleItems = enseignant;         break;
      case "formateur":          roleItems = formateur;          break;
      case "responsabledossier": roleItems = responsableDossier; break;
      case "chefdepartement":    roleItems = chefDepartement;    break;
      default:                   roleItems = [];
    }

    return [...roleItems, ...accountGroup];
  }, [user, roleKey]);

  const onClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      logout();
      navigate("/");
    } else if (typeof key === "string" && key.startsWith("/")) {
      navigate(key);
    }
  };

  const menuItems = useMemo(() => processItems(items), [items]);

  const roleColor = ROLE_COLORS[roleKey] || "#B51200";

  return (
    <div className="sidemenu-container">
      <div className="sidemenu-user-card">
        <div className="user-card-content">
          <Badge dot color="#52c41a" offset={[-4, 34]}>
            <Avatar
              size={40}
              icon={<UserOutlined />}
              src={user?.avatar as string | undefined}
              className="user-avatar"
              style={{ background: roleColor, color: "#fff" }}
            />
          </Badge>
          <div className="user-info">
            <Text className="user-name">{user?.username || ""}</Text>
            <Text className="user-role" style={{ color: roleColor }}>{ROLE_LABELS[roleKey] ?? user?.role}</Text>
          </div>
        </div>
      </div>

      <Divider style={{ margin: "6px 0", opacity: 0.35 }} />

      <div className="sidemenu-nav-section">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={getDefaultOpenKeys(pathname)}
          onClick={onClick}
          items={menuItems}
          className="custom-sidemenu"
          inlineCollapsed={collapsed}
        />
      </div>
    </div>
  );
}

function getDefaultOpenKeys(pathname: string) {
  if (pathname.startsWith("/home/besoins"))       return ["besoin_formation_menu"];
  if (pathname.startsWith("/home/rice"))           return ["rice_ia_group"];
  if (pathname.startsWith("/home/affectations") ||
      pathname.startsWith("/home/rice/matchmaking")) return ["gestion_affectation"];
  return [];
}

import {
  CalendarOutlined, FileTextOutlined, ReadOutlined, SolutionOutlined,
  LogoutOutlined, ApartmentOutlined, RobotOutlined, SearchOutlined,
  PlusCircleOutlined, BarChartOutlined, TrophyOutlined,
  SafetyCertificateOutlined, UserOutlined, LineChartOutlined, ApiOutlined,
  ClusterOutlined, SettingOutlined, TeamOutlined, BookOutlined,
  AppstoreOutlined, CheckSquareOutlined, BankOutlined,
} from "@ant-design/icons";

type MenuItem = Record<string, unknown>;

export const accountGroup: MenuItem[] = [
  { type: "group", label: "MON COMPTE", children: [
    { label: "Mon Profil",    key: "/home/profile", icon: UserOutlined },
    { label: "Déconnexion",   key: "logout",        icon: LogoutOutlined, danger: true },
  ]},
];

export const adminMenu: MenuItem[] = [
  { type: "group", label: "TABLEAU DE BORD", children: [
    { label: "KPI & Métriques",    key: "/home/KPI",                icon: BarChartOutlined  },
    { label: "Analyse Prédictive", key: "/home/AnalysePredictive",  icon: LineChartOutlined },
  ]},
  { type: "group", label: "ADMINISTRATION", children: [
    { label: "Gestion des Comptes",  key: "/home/accounts",       icon: SettingOutlined   },
    { label: "Annuaire Enseignants", key: "/home/Enseignants",    icon: TeamOutlined      },
    { label: "Structures (UP/Dépt)", key: "/home/UpDept",         icon: ApartmentOutlined },
    { label: "Inscriptions",         key: "/home/ListeFormation", icon: FileTextOutlined  },
    { label: "Gestion des Bureaux",  key: "/home/bureaux",        icon: BankOutlined      },
  ]},
  { type: "group", label: "FORMATIONS", children: [
    { label: "Nouvelle Formation",    key: "/home/Formation/Creer",       icon: PlusCircleOutlined     },
    { label: "Catalogue",             key: "/home/Formation/Consulter",   icon: AppstoreOutlined       },
    { label: "Évaluations",           key: "/home/Evaluations",           icon: TrophyOutlined         },
    { label: "Présences",             key: "/home/animateur-formations",  icon: CheckSquareOutlined    },
    { label: "Gestion Documentaire",  key: "/home/File",                  icon: FileTextOutlined       },
    { label: "Calendrier Global",     key: "/home/Calendrier",            icon: CalendarOutlined       },
    { label: "Certifications",        key: "/home/certificate",           icon: SafetyCertificateOutlined },
  ]},
  { type: "group", label: "COMPÉTENCES & IA", children: [
    { label: "Référentiel Compétences", key: "/home/competences",   icon: BookOutlined     },
    { label: "Besoins de Formation",    key: "/home/besoins",       icon: ReadOutlined     },
    { label: "Affectations",            key: "/home/affectations",  icon: SolutionOutlined },
    { label: "RICE & IA", key: "rice_ia_group", icon: RobotOutlined, children: [
      { label: "Vue RICE",      key: "/home/rice",             icon: ClusterOutlined },
      { label: "Matchmaking IA",key: "/home/rice/matchmaking", icon: ApiOutlined     },
    ]},
  ]},
];

export const cupMenu: MenuItem[] = [
  { label: "Évaluations",             key: "/home/Evaluations",         icon: TrophyOutlined },
  { label: "Référentiel Compétences", key: "/home/competences",         icon: BookOutlined },
  { label: "Besoins de Formation", key: "besoin_formation_menu", icon: ReadOutlined, children: [
    { label: "Liste des Demandes", key: "/home/besoins",         icon: SearchOutlined },
    { label: "Déposer un Besoin",  key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
  ]},
  { label: "Affectation & IA", key: "gestion_affectation", icon: SolutionOutlined, children: [
    { label: "Suivi des Affectations", key: "/home/affectations",      icon: SolutionOutlined },
    { label: "Matchmaking IA",         key: "/home/rice/matchmaking",  icon: ApiOutlined },
  ]},
  { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
  { label: "Analyse Prédictive",    key: "/home/AnalysePredictive",    icon: LineChartOutlined },
  { label: "Mes Inscriptions",      key: "/home/ListeFormation",       icon: AppstoreOutlined },
  { label: "Mes Certificats",       key: "/home/MyCertificate",        icon: SafetyCertificateOutlined },
];

export const enseignantMenu: MenuItem[] = [
  { label: "Référentiel Compétences", key: "/home/competences",         icon: BookOutlined },
  { label: "Besoins de Formation", key: "besoin_formation_menu", icon: ReadOutlined, children: [
    { label: "Liste des Demandes", key: "/home/besoins",         icon: SearchOutlined },
    { label: "Déposer un Besoin",  key: "/home/besoins/ajouter", icon: PlusCircleOutlined },
  ]},
  { label: "Présence & Évaluation", key: "/home/animateur-formations", icon: ReadOutlined },
  { label: "Mes Inscriptions",      key: "/home/ListeFormation",       icon: AppstoreOutlined },
  { label: "Mes Certificats",       key: "/home/MyCertificate",        icon: SafetyCertificateOutlined },
];

export const formateurMenu: MenuItem[] = [
  { label: "Sessions d'Animation", key: "/home/animateur-formations", icon: ReadOutlined },
  { label: "Mes Inscriptions",     key: "/home/ListeFormation",       icon: AppstoreOutlined },
];

export const responsableDossierMenu: MenuItem[] = [
  { label: "Gestion Formations",   key: "/home/Formation/Consulter", icon: AppstoreOutlined },
  { label: "Dossiers de Formation",key: "/home/File",                icon: FileTextOutlined },
];

export const chefDepartementMenu: MenuItem[] = [
  { label: "Gestion Formations",   key: "/home/Formation/Consulter", icon: AppstoreOutlined },
  { label: "Dossiers de Formation",key: "/home/File",                icon: FileTextOutlined },
  { label: "Calendrier Global",    key: "/home/Calendrier",          icon: CalendarOutlined },
  { label: "Analyse Prédictive",   key: "/home/AnalysePredictive",   icon: LineChartOutlined },
];

export const roleMenus: Record<string, MenuItem[]> = {
  admin: adminMenu,
  cup: cupMenu,
  enseignant: enseignantMenu,
  formateur: formateurMenu,
  responsabledossier: responsableDossierMenu,
  chefdepartement: chefDepartementMenu,
};

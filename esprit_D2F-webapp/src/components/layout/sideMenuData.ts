import type { ComponentType } from 'react';
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
  TrophyOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  LineChartOutlined,
  ApiOutlined,
  ClusterOutlined,
  BookOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  BankOutlined,
  SettingOutlined,
  ImportOutlined,
  DashboardOutlined,
  EyeOutlined,
  HomeOutlined,
} from '@ant-design/icons';

export interface MenuItem {
  type?: 'group';
  label?: string;
  key?: string;
  icon?: ComponentType<{ style?: React.CSSProperties }>;
  danger?: boolean;
  children?: MenuItem[];
}

// Tableau de bord exécutif (landing /home) — point d'entrée commun à tous les rôles.
const dashboardItem: MenuItem = { label: 'Tableau de bord', key: '/home', icon: DashboardOutlined };

export const accountGroup: MenuItem[] = [
  {
    type: 'group',
    label: 'MON COMPTE',
    children: [
      { label: 'Mon Profil', key: '/home/profile', icon: UserOutlined },
      { label: 'Déconnexion', key: 'logout', icon: LogoutOutlined, danger: true },
    ],
  },
];

export const adminMenu: MenuItem[] = [
  dashboardItem,
  { label: 'Analyse Prédictive', key: '/home/AnalysePredictive', icon: LineChartOutlined },
  {
    type: 'group',
    label: 'ADMINISTRATION',
    children: [
      { label: 'Administration', key: '/home/administration', icon: SettingOutlined },
      { label: 'Structures (UP/Dépt)', key: '/home/UpDept', icon: ApartmentOutlined },
      { label: 'Inscriptions', key: '/home/Inscriptions', icon: FileTextOutlined },
      { label: 'Gestion des Bureaux', key: '/home/bureaux', icon: BankOutlined },
    ],
  },
  {
    type: 'group',
    label: 'FORMATIONS',
    children: [
      { label: 'Nouvelle Formation', key: '/home/Formation/Creer', icon: PlusCircleOutlined },
      { label: 'Catalogue', key: '/home/Formation/Consulter', icon: AppstoreOutlined },
      { label: 'Évaluations', key: '/home/Evaluations', icon: TrophyOutlined },
      { label: 'Présences', key: '/home/animateur-formations', icon: CheckSquareOutlined },
      { label: 'Gestion Documentaire', key: '/home/File', icon: FileTextOutlined },
      { label: 'Calendrier Global', key: '/home/Calendrier', icon: CalendarOutlined },
      {
        label: 'Gestion Calendrier',
        key: '/home/Formation/CalendrierGestion',
        icon: ImportOutlined,
      },
      { label: 'Certifications', key: '/home/certificate', icon: SafetyCertificateOutlined },
    ],
  },
  {
    type: 'group',
    label: 'COMPÉTENCES & IA',
    children: [
      { label: 'Référentiel Compétences', key: '/home/competences', icon: BookOutlined },
      { label: 'Besoins de Formation', key: '/home/besoins', icon: ReadOutlined },
      { label: 'Affectations', key: '/home/affectations', icon: SolutionOutlined },
      {
        label: 'RICE & IA',
        key: 'rice_ia_group',
        icon: RobotOutlined,
        children: [
          { label: 'Vue RICE', key: '/home/rice', icon: ClusterOutlined },
          { label: 'Matchmaking IA', key: '/home/rice/matchmaking', icon: ApiOutlined },
        ],
      },
    ],
  },
];

export const cupMenu: MenuItem[] = [
  dashboardItem,
  { label: 'Analyse Prédictive', key: '/home/AnalysePredictive', icon: LineChartOutlined },
  {
    type: 'group',
    label: 'FORMATIONS',
    children: [
      { label: 'Nouvelle Formation', key: '/home/Formation/Creer', icon: PlusCircleOutlined },
      { label: 'Catalogue', key: '/home/Formation/Consulter', icon: AppstoreOutlined },
      {
        label: 'Gestion Calendrier',
        key: '/home/Formation/CalendrierGestion',
        icon: ImportOutlined,
      },
    ],
  },
  {
    type: 'group',
    label: 'COMPÉTENCES & BESOINS',
    children: [
      { label: 'Référentiel Compétences', key: '/home/competences', icon: BookOutlined },
      {
        label: 'Besoins de Formation',
        key: 'besoin_formation_menu',
        icon: ReadOutlined,
        children: [
          { label: 'Liste des Demandes', key: '/home/besoins', icon: SearchOutlined },
          { label: 'Déposer un Besoin', key: '/home/besoins/ajouter', icon: PlusCircleOutlined },
        ],
      },
      { label: 'Suivi des Affectations', key: '/home/affectations', icon: SolutionOutlined },
    ],
  },
  {
    type: 'group',
    label: 'SUIVI',
    children: [{ label: 'Inscriptions', key: '/home/Inscriptions', icon: FileTextOutlined }],
  },
];

export const enseignantMenu: MenuItem[] = [
  dashboardItem,
  { label: 'Mon espace', key: '/home/personal-dashboard', icon: HomeOutlined },
  {
    label: 'Besoins de Formation',
    key: 'besoin_formation_menu',
    icon: ReadOutlined,
    children: [
      { label: 'Liste des Demandes', key: '/home/besoins', icon: SearchOutlined },
      { label: 'Déposer un Besoin', key: '/home/besoins/ajouter', icon: PlusCircleOutlined },
    ],
  },
  { label: 'Mes Présences', key: '/home/mes-presences', icon: EyeOutlined },
  { label: 'Présence & Évaluation', key: '/home/animateur-formations', icon: ReadOutlined },
  { label: 'Évaluations', key: '/home/Evaluations', icon: TrophyOutlined },
  { label: 'Inscriptions', key: '/home/Inscriptions', icon: AppstoreOutlined },
  { label: 'Mes Certificats', key: '/home/MyCertificate', icon: SafetyCertificateOutlined },
];

export const animateurMenu: MenuItem[] = [
  dashboardItem,
  { label: 'Mon espace', key: '/home/personal-dashboard', icon: HomeOutlined },
  { label: "Sessions d'Animation", key: '/home/animateur-formations', icon: ReadOutlined },
  { label: 'Mes Présences', key: '/home/mes-presences', icon: EyeOutlined },
  { label: 'Évaluations', key: '/home/Evaluations', icon: TrophyOutlined },
  {
    label: 'Besoins de Formation',
    key: 'besoin_formation_menu',
    icon: ReadOutlined,
    children: [
      { label: 'Liste des Demandes', key: '/home/besoins', icon: SearchOutlined },
      { label: 'Déposer un Besoin', key: '/home/besoins/ajouter', icon: PlusCircleOutlined },
    ],
  },
  { label: 'Inscriptions', key: '/home/Inscriptions', icon: AppstoreOutlined },
  { label: 'Mes Certificats', key: '/home/MyCertificate', icon: SafetyCertificateOutlined },
];

export const responsableDossierMenu: MenuItem[] = [
  // Pas d'entrée « Tableau de bord » pour ce rôle (demande métier) : la page
  // /home reste accessible par URL mais n'est plus exposée dans la navigation.
  { label: 'Catalogue Formations', key: '/home/Formation/Consulter', icon: AppstoreOutlined },
  { label: 'Gestion Documentaire', key: '/home/File', icon: FileTextOutlined },
];

export const chefDepartementMenu: MenuItem[] = [
  dashboardItem,
  { label: 'Analyse Prédictive', key: '/home/AnalysePredictive', icon: LineChartOutlined },
  {
    type: 'group',
    label: 'FORMATIONS',
    children: [
      { label: 'Catalogue Formations', key: '/home/Formation/Consulter', icon: AppstoreOutlined },
      { label: 'Calendrier Global', key: '/home/Calendrier', icon: CalendarOutlined },
      {
        label: 'Gestion Calendrier',
        key: '/home/Formation/CalendrierGestion',
        icon: ImportOutlined,
      },
    ],
  },
  {
    type: 'group',
    label: 'COMPÉTENCES & BESOINS',
    children: [
      { label: 'Référentiel Compétences', key: '/home/competences', icon: BookOutlined },
      { label: 'Besoins de Formation', key: '/home/besoins', icon: ReadOutlined },
    ],
  },
  {
    type: 'group',
    label: 'DOCUMENTS & SUIVI',
    children: [
      { label: 'Dossiers de Formation', key: '/home/File', icon: FileTextOutlined },
      { label: 'Inscriptions', key: '/home/Inscriptions', icon: AppstoreOutlined },
    ],
  },
];

export const roleMenus: Record<string, MenuItem[]> = {
  admin: adminMenu,
  cup: cupMenu,
  enseignant: enseignantMenu,
  animateur: animateurMenu,
  responsabledossier: responsableDossierMenu,
  chefdepartement: chefDepartementMenu,
};

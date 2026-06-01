export interface EnseignantItem {
  id: string;
  nom: string;
  prenom: string;
  mail: string;
  type: string;
  cup: string;
  chefDepartement: string;
  upLibelle: string;
  deptLibelle: string;
}

export interface SeanceData {
  idSeance: string;
  dateSeance: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  animateurs: EnseignantItem[];
  participants: EnseignantItem[];
  typeSeance: string;
  contenus: string;
  methodes: string;
  dureeTheorique: number;
  dureePratique: number;
}

export interface SeanceState {
  id?: number;
  idSeance?: string;
  dateSeance: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  animateurs: EnseignantItem[];
  typeSeance: string;
  contenus: string;
  methodes: string;
  dureeTheorique: number;
  dureePratique: number;
  expanded: boolean;
}

export interface UPItem {
  id: string;
  libelle?: string;
}

export interface DeptItem {
  id: string;
  libelle?: string;
}

export interface FormationEdit {
  id?: string;
  idFormation: string;
  titreFormation: string;
  dateDebut: string;
  dateFin: string;
  typeFormation: string;
  etatFormation: string;
  coutFormation: number;
  organismeRefExterne: string;
  chargeHoraireGlobal: number;
  externeFormateurNom: string;
  externeFormateurPrenom: string;
  externeFormateurEmail: string;
  ouverte: boolean;
  domaine: string;
  populationCible: string;
  objectifs: string;
  objectifsPedago: string;
  evalMethods: string;
  prerequis: string;
  acquis: string;
  indicateurs: string;
  coutTransport: number;
  coutHebergement: number;
  coutRepas: number;
  up1: { id: string };
  departement1: { id: string };
  periodCode: string;
  customPeriodLabel: string;
  periodeFormation: string;
  seances: SeanceData[];
  animateurs: EnseignantItem[];
  participants: EnseignantItem[];
}

export interface SeanceConflictItem {
  dateSeance: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  animateurIds: string[];
}

export const PERIOD_OPTIONS = [
  { value: "WINTER",   label: "Winter" },
  { value: "SUMMER",   label: "Summer" },
  { value: "SPRINT",   label: "Sprint" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER",    label: "Autre" },
];

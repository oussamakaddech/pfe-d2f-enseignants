import type { Id } from '../common';

export interface UnitePedagogique {
  nomUP?: string;
}

export interface Personne {
  id?: Id;
  nom?: string;
  prenom?: string;
  mail?: string;
  unitePedagogique?: UnitePedagogique;
}

export interface Seance {
  idSeance?: Id;
  dateSeance?: string;
  heureDebut?: string;
  heureFin?: string;
  salle?: string;
  titreSeance?: string;
  animateurs?: Personne[];
  participants?: Personne[];
}

export interface RefItem {
  id?: Id;
  libelle?: string;
  nom?: string;
}

export interface Formation {
  idFormation?: Id;
  titreFormation?: string;
  typeFormation?: string;
  dateDebut?: string;
  dateFin?: string;
  objectif?: string;
  responsableEmail?: string;
  responsableName?: string;
  etatFormation?: string;
  periodCode?: string;
  customPeriodLabel?: string;
  up1?: RefItem;
  departement1?: RefItem;
  chargeHoraireGlobal?: number;
  inscriptionsOuvertes?: boolean;
  objectifs?: string;
  objectifsPedago?: string;
  prerequis?: string;
  acquis?: string;
  indicateurs?: string;
  evalMethods?: string;
  domaine?: string;
  populationCible?: string;
  periodeFormation?: string;
  seances?: Seance[];
}





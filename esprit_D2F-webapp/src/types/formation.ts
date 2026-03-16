import type { Id } from "./common";

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
  animateurs?: Personne[];
  participants?: Personne[];
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
  seances?: Seance[];
}

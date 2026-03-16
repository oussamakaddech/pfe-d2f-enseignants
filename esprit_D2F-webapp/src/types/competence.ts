import type { Id } from "./common";

export interface Domaine {
  id?: Id;
  nomDomaine?: string;
  actif?: boolean;
}

export interface Competence {
  id?: Id;
  nomCompetence?: string;
  domaineId?: Id;
}

export interface SousCompetence {
  id?: Id;
  nomSousCompetence?: string;
  competenceId?: Id;
}

export interface Savoir {
  id?: Id;
  intitule?: string;
  type?: string;
}

import type { Id } from '../common';

export interface Enseignant {
  id?: Id;
  nom?: string;
  prenom?: string;
  email?: string;
  cin?: string;
  type?: string;
  unitePedagogique?: string;
  departement?: string;
  etat?: string;
  dateRecrutement?: string;
  telephone?: string;
  adresse?: string;
}

export interface EnseignantUP {
  id?: Id;
  nomUP?: string;
}

export interface EnseignantSearchCriteria {
  nom?: string;
  prenom?: string;
  email?: string;
  departement?: string;
  type?: string;
}

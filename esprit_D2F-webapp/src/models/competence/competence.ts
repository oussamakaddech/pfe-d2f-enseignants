import type { Id } from '../common';

export interface Domaine {
  id?: Id;
  code?: string;
  nom?: string;
  description?: string;
  actif?: boolean;
  upId?: Id;
  departementId?: Id;
  competences?: Competence[];
}

export interface Competence {
  id?: Id;
  code?: string;
  nom?: string;
  nomCompetence?: string;
  description?: string;
  domaineId?: Id;
  domaineNom?: string;
  prerequisiteManual?: string;
  prerequisiteNames?: string[];
  sousCompetences?: SousCompetence[];
  savoirs?: Savoir[];
}

export interface SousCompetence {
  id?: Id;
  code?: string;
  nom?: string;
  nomSousCompetence?: string;
  description?: string;
  competenceId?: Id;
  enfants?: SousCompetence[];
  savoirs?: Savoir[];
}

export interface Savoir {
  id?: Id;
  code?: string;
  nom?: string;
  intitule?: string;
  description?: string;
  type?: string;
  niveau?: string;
  sousCompetenceId?: Id;
  competenceId?: Id;
  sousCompetenceNom?: string;
  competenceNom?: string;
}

export interface TreeNode {
  id?: Id;
  code?: string;
  nom?: string;
  type?: string;
  actif?: boolean;
  niveau?: number | string;
  nombreCompetences?: number;
  nombreSousCompetences?: number;
  nombreSavoirs?: number;
  nombreEnseignants?: number;
  competences?: TreeNode[];
  sousCompetences?: TreeNode[];
  enfants?: TreeNode[];
  savoirs?: TreeNode[];
  savoirsDirect?: TreeNode[];
  children?: TreeNode[];
}

export interface StructureData {
  domaines?: TreeNode[];
}

export interface NiveauDefinition {
  id?: Id;
  competenceId?: Id;
  sousCompetenceId?: Id;
  niveau?: string;
  description?: string;
}

export interface EnseignantCompetence {
  id?: Id;
  enseignantId?: Id;
  competenceId?: Id;
  savoirId?: Id;
  savoirCode?: string;
  savoirNom?: string;
  competenceNom?: string;
  niveau?: string;
}

export interface AssignRequest {
  enseignantId?: Id;
  competenceId?: Id;
  savoirId?: Id;
  niveau?: string;
}

export interface PrerequisiteRequest {
  prerequisiteId?: Id;
  niveauMinimum?: string;
}





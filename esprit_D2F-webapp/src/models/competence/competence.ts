import type { Id } from '../common';

export interface Domaine {
  id?: Id;
  code?: string;
  nom?: string;
  description?: string;
  actif?: boolean;
  upId?: Id;
  departementId?: Id;
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

export interface TreeNode {
  id?: Id;
  code?: string;
  nom?: string;
  type?: string;
  children?: TreeNode[];
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





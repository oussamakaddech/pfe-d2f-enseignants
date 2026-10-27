import type { Id } from '../common';

export interface Domaine {
  id?: Id;
  code?: string;
  nom?: string;
  description?: string;
  actif?: boolean;
  /** Rattachement historique du domaine, conservé en lecture seule (le choix se fait désormais sur la compétence). */
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
  /** Rattachement historique porté par le domaine (lecture seule). */
  upId?: Id;
  departementId?: Id;
  /** UP auxquelles la compétence s'applique (choix multiple, optionnel). */
  upIds?: Id[];
  /** Départements auxquels la compétence s'applique (choix multiple, optionnel). */
  departementIds?: Id[];
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
  parentId?: Id | null;
  niveau?: number;
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

import type { Id } from '../common';

export type Priorite = "BASSE" | "MOYENNE" | "HAUTE" | "CRITIQUE";

export interface BesoinFormation {
  idBesoinFormation?: Id;
  username?: string;
  typeBesoin?: "INDIVIDUEL" | "COLLECTIF" | "ANIMER_UNE_FORMATION";
  titre?: string;
  objectifFormation?: string;
  propositionAnimateur?: string;
  /** Animateurs proposés sélectionnés depuis la base enseignants (une ligne "Nom Prénom <email>" par animateur) */
  animateurs?: string;
  /** Enseignants participants proposés sélectionnés depuis la base enseignants (une ligne "Nom Prénom <email>" par enseignant) */
  enseignants?: string;
  prerequis?: string;
  publicCible?: string;
  nbMaxParticipants?: number;
  programmeFormation?: string;
  dureeFormation?: number;
  theme?: string;
  objectifsOperationnels?: string;
  objectifsPedagogiques?: string;
  methodesPedagogiques?: string;
  moyensPedagogiques?: string;
  methodesEvaluationAcquis?: string;
  profilFormateur?: string;
  horaireSouhaite?: string;
  up?: string;
  departement?: string;
  approuveCUP?: boolean;
  approuveChefDep?: boolean;
  approuveAdmin?: boolean;
  notificationMessage?: string;
  eventPublished?: boolean;
  dateCreation?: string;
  /** §2.2.2 — Priorité du besoin (urgence) */
  priorite?: Priorite;
  /** §2.2.2 — Impact stratégique du besoin */
  impactStrategique?: string;
}

export interface BesoinCompetenceLink {
  id?: number;
  besoinId?: number;
  domaineId?: number | null;
  competenceId?: number | null;
  competenceNom?: string;
  savoirId?: number | null;
  savoirNom?: string;
  sousCompetenceId?: number | null;
}





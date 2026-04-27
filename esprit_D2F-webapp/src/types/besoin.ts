import type { Id } from "./common";

export type Priorite = "BASSE" | "MOYENNE" | "HAUTE" | "CRITIQUE";

export interface BesoinFormation {
  idBesoinFormation?: Id;
  username?: string;
  typeBesoin?: "INDIVIDUEL" | "COLLECTIF" | "ANIMER_UNE_FORMATION";
  titre?: string;
  objectifFormation?: string;
  propositionAnimateur?: string;
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


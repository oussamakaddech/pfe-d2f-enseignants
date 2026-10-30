import type { Id } from '../common';

/** États renvoyés par le backend (EtatInscription.java) : pas de ANNULE côté API. */
export type EtatInscription = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Inscription {
  idInscription?: Id;
  formationId?: Id;
  enseignantId?: Id;
  nomEnseignant?: string;
  prenomEnseignant?: string;
  emailEnseignant?: string;
  dateDemande?: string;
  approuve?: boolean;
  traite?: boolean;
  /** Etat de l'inscription : PENDING, APPROVED, REJECTED (renvoyé par le backend) */
  etat?: EtatInscription;
  formationTitre?: string;
  dateDebut?: string;
  dateFin?: string;
}

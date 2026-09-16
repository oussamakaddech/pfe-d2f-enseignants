import type { Id } from '../common';

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
  formationTitre?: string;
  dateDebut?: string;
  dateFin?: string;
}

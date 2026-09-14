export interface EvaluationGlobale {
  idEvalGlobale?: number;
  formationId?: number;
  formationTitre?: string;
  enseignantId?: string;
  noteGlobale?: number;
  commentaireGeneral?: string;
  dateEvaluation?: string;
  recommandation?: string;
  pertinenceContenu?: number;
  organisation?: number;
  qualiteSupports?: number;
  dureeAdaptee?: number;
  satisfactionGlobale?: number;
}

export interface EvaluationFormateur {
  idEvalParticipant?: number;
  formationId?: number;
  enseignantId?: string;
  note?: number;
  satisfaisant?: boolean;
  commentaire?: string;
  maitriseSujet?: number;
  clarte?: number;
  pedagogie?: number;
  interaction?: number;
  gestionTemps?: number;
}

export interface EvaluationEnseignant {
  idEvalParticipant?: number;
  note?: number;
  satisfaisant?: boolean;
  commentaire?: string;
  enseignantId?: string;
  nom?: string;
  prenom?: string;
  mail?: string;
  type?: string;
  deptLibelle?: string;
  upLibelle?: string;
  formationId?: number;
}

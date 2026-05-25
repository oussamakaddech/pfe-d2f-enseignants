export interface EvaluationGlobale {
  id?: number;
  formationId?: number;
  formationTitre?: string;
  noteGlobale?: number;
  commentaire?: string;
  dateEvaluation?: string;
  evaluePar?: string;
}

export interface EvaluationFormateur {
  id?: number;
  formationId?: number;
  enseignantId?: string;
  nomEnseignant?: string;
  prenomEnseignant?: string;
  note?: number;
  commentaire?: string;
  creeLe?: string;
}

export interface EvaluationEnriched extends EvaluationFormateur {
  presence?: boolean;
  seanceIds?: number[];
}

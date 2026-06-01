export interface FormationsByEtat {
  enregistre: number;
  planifie: number;
  enCours: number;
  acheve: number;
  annule: number;
  total: number;
}

export interface ParticipantStats {
  id: string | number;
  nom?: string;
  prenom?: string;
  count: number;
}

export interface CountHeures {
  count: number;
  totalHeures: number;
}

export interface FormationsByType {
  interne: number;
  externe: number;
  enLigne: number;
}

export interface TrainerTypeCount {
  type: string;
  count: number;
  ids: (string | number)[];
}

export interface FormationParticipantKPI {
  formationId: number;
  formationTitre?: string;
  totalParticipants: number;
  totalPresences: number;
  tauxPresence: number;
}

export interface GlobalParticipantKPI {
  totalFormations: number;
  totalParticipants: number;
  tauxPresenceGlobal: number;
}

export interface Presence {
  idPresence?: string | number;
  seanceId?: string | number;
  enseignantId?: string | number;
  present?: boolean;
  justifie?: boolean;
  motifAbsence?: string;
}

export interface PresenceStats {
  total: number;
  present: number;
  absent: number;
  justifie: number;
  tauxPresence: number;
}

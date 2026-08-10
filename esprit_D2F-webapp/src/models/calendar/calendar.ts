/**
 * Modèles TypeScript de la fonctionnalité « Calendrier des ateliers ».
 * Reflètent les DTO du service-formation (package dto.calendar).
 */

/** Réponse paginée standard (DSI) renvoyée par le backend (PageResponse). */
export interface CalendarPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type ImportRowSeverity = 'ERROR' | 'WARNING';

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
  severity: ImportRowSeverity;
}

export interface ParsedSession {
  formationName: string;
  trainerName?: string;
  room?: string;
  status?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  sessionNumber?: number;
  totalSessions?: number;
  sourceRow: number;
}

export interface ParsedParticipant {
  formationName: string;
  email: string;
  sourceRow: number;
}

export interface ParsedCalendar {
  sessions: ParsedSession[];
  participants: ParsedParticipant[];
  errors: ImportRowError[];
}

export type ConflictType = 'ROOM_OVERLAP' | 'DUPLICATE_FORMATION' | 'SESSION_NUMBERING';

export interface Conflict {
  type: ConflictType;
  salle?: string;
  dateSeance?: string;
  heureDebut?: string;
  heureFin?: string;
  seanceId?: number;
  otherSeanceId?: number;
  detail: string;
}

export interface ConflictReport {
  totalConflicts: number;
  roomOverlaps: number;
  duplicateFormations: number;
  sessionNumberingIssues: number;
  conflicts: Conflict[];
}

export type ImportStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'DUPLICATE';

export interface ImportReport {
  importLogId?: number;
  fileName?: string;
  status: ImportStatus;
  formationsCreated: number;
  sessionsCreated: number;
  participantsImported: number;
  participantsUnmatched: number;
  rowsSkipped: number;
  conflictsDetected: number;
  duplicateOfImportId?: number;
  errors: ImportRowError[];
  conflicts?: ConflictReport;
}

export interface CalendarFormation {
  idFormation: number;
  titre: string;
  etat?: string;
  dateDebut?: string;
  dateFin?: string;
  salle?: string;
  responsable?: string;
  sessionsCount: number;
  participantsCount: number;
}

export interface CalendarParticipant {
  email: string;
  matchedEnseignant: boolean;
}

export type SendInvitationsStatus = 'DISPATCHED' | 'NO_RECIPIENT';

export interface SendInvitationsResult {
  formationId?: number;
  formationsProcessed: number;
  recipientsDispatched: number;
  status: SendInvitationsStatus;
  message: string;
}

export interface CalendarFormationFilters {
  titre?: string;
  etat?: string;
  page?: number;
  size?: number;
}

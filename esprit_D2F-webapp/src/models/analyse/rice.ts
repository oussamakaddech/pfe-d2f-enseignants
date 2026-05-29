import type { Id } from '../common';

export interface RiceResult {
  id?: Id;
  score?: number;
  recommendations?: string[];
  raw?: unknown;
}

export interface RiceAnalyzeResponse {
  task_id?: string;
  status?: string;
  result?: RiceResult;
  message?: string;
}

export interface RiceImportHistoryItem {
  id?: Id;
  filename?: string;
  status?: string;
  importedAt?: string;
  nbEnseignants?: number;
  nbSavoirs?: number;
  errors?: string[];
}

export interface RiceAssignmentResult {
  added: number;
  removed: number;
}





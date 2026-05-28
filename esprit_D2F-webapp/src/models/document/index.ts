import type { Id } from "../common";

export interface FormationDocument {
  idDocument: Id;
  nomDocument?: string;
  pathType?: string;
  obligation?: boolean;
  originalFileName?: string;
  fileUrl?: string;
  fileType?: string;
}

export interface FormationWithDocuments {
  idFormation: Id;
  titreFormation?: string;
  documents?: FormationDocument[];
}
